package main

// Server-side cache for the live-footballontv.com World Cup page (the UK "where
// to watch" source) — the Go counterpart of server/broadcast-cache.mjs (which the
// Vite dev server uses), so caching behaves identically in dev and prod.
//
// It mirrors feedCache (server/feed_cache.go), with two differences: the page is
// public so there's no token gate (it always refreshes when due), and it returns
// raw HTML rather than JSON — the browser parses it (src/data/broadcast-feed.ts).
// Fetched at most once per TTL (default 6h), shared across clients, coalesced via
// singleflight, stale-while-error. Reuses feedResult from feed_cache.go.

import (
	"context"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

const defaultBroadcastUpstream = "https://www.live-footballontv.com/live-world-cup-football-on-tv.html"

// Identify ourselves politely, with a contact URL, when scraping the source.
const broadcastUserAgent = "WorldCupDashboard/1.0 (+https://github.com/sazap10/world-cup-dashboard)"

type broadcastConfig struct {
	upstream string
	ttl      time.Duration
	timeout  time.Duration
}

type broadcastCache struct {
	cfg    broadcastConfig
	client *http.Client
	group  singleflight.Group

	mu          sync.Mutex
	body        []byte    // last good HTML
	fetchedAt   time.Time // when body was fetched
	hasCache    bool
	lastAttempt time.Time // last refresh attempt (ok or fail) — throttles retries
}

func newBroadcastCache(cfg broadcastConfig) *broadcastCache {
	if cfg.upstream == "" {
		cfg.upstream = defaultBroadcastUpstream
	}
	if cfg.ttl == 0 {
		cfg.ttl = 6 * time.Hour
	}
	if cfg.timeout == 0 {
		cfg.timeout = 8 * time.Second
	}
	return &broadcastCache{cfg: cfg, client: &http.Client{}}
}

// refresh fetches the page once. Records the attempt up front so a failure still
// throttles the next try (via lastAttempt). On any error the stale-while-error
// path in read() keeps serving last-good.
func (b *broadcastCache) refresh() {
	b.mu.Lock()
	b.lastAttempt = time.Now()
	b.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), b.cfg.timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, b.cfg.upstream, nil)
	if err != nil {
		log.Printf("[broadcast-cache] request build failed: %v", err)
		return
	}
	req.Header.Set("User-Agent", broadcastUserAgent)
	req.Header.Set("Accept", "text/html")

	resp, err := b.client.Do(req)
	if err != nil {
		log.Printf("[broadcast-cache] upstream fetch failed: %v", err)
		return
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[broadcast-cache] read body failed: %v", err)
		return
	}

	// No error flag (unlike feedCache): read() returns the same placeholder
	// whether a fetch failed or never ran, so we only track last-good.
	b.mu.Lock()
	defer b.mu.Unlock()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		b.body = body
		b.fetchedAt = time.Now()
		b.hasCache = true
	} else {
		log.Printf("[broadcast-cache] upstream responded %d", resp.StatusCode)
	}
}

// read returns the current HTML, refreshing first if the cache is stale.
func (b *broadcastCache) read() feedResult {
	b.mu.Lock()
	due := !b.hasCache || time.Since(b.lastAttempt) > b.cfg.ttl
	b.mu.Unlock()

	if due {
		// Coalesce concurrent refreshes onto one upstream call; all callers wait.
		_, _, _ = b.group.Do("refresh", func() (any, error) {
			b.refresh()
			return nil, nil
		})
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	if b.hasCache {
		fresh := time.Since(b.fetchedAt) <= b.cfg.ttl
		state := "HIT"
		switch {
		case !fresh:
			state = "STALE"
		case due:
			state = "REFRESH"
		}
		return feedResult{
			status:     http.StatusOK,
			body:       b.body,
			cacheState: state,
			age:        int(math.Round(time.Since(b.fetchedAt).Seconds())),
		}
	}
	return feedResult{status: http.StatusBadGateway, body: []byte("<!-- broadcaster listings unavailable -->"), cacheState: "MISS"}
}

// handle is the net/http handler for the /api/wc/broadcasters endpoint.
func (b *broadcastCache) handle(w http.ResponseWriter, r *http.Request) {
	out := b.read()
	h := w.Header()
	h.Set("Content-Type", "text/html; charset=utf-8")
	h.Set("Cache-Control", "no-store")
	h.Set("X-Cache", out.cacheState)
	h.Set("X-Cache-Age", strconv.Itoa(out.age))
	w.WriteHeader(out.status)
	if r.Method != http.MethodHead {
		w.Write(out.body)
	}
}

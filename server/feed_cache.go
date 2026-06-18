package main

// Server-side cache for the football-data.org matches feed — the Go counterpart
// of server/feed-cache.mjs (which the Vite dev server still uses), so caching
// behaves identically in dev and prod.
//
// The upstream API is fetched at most once per TTL window; every client is
// served from that single copy. Concurrent callers share one in-flight fetch
// (coalescing via singleflight), and a failed refresh keeps serving the last
// good data (stale-while-error).

import (
	"context"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

type feedConfig struct {
	token       string
	upstream    string
	competition string
	ttl         time.Duration
	timeout     time.Duration
}

type feedResult struct {
	status     int
	body       []byte
	cacheState string
	age        int
}

type feedCache struct {
	cfg    feedConfig
	client *http.Client
	group  singleflight.Group

	mu          sync.Mutex
	body        []byte    // last good payload
	fetchedAt   time.Time // when body was fetched
	hasCache    bool
	lastError   bool      // true once an upstream attempt has failed
	lastAttempt time.Time // last refresh attempt (ok or fail) — throttles retries
}

func newFeedCache(cfg feedConfig) *feedCache {
	if cfg.upstream == "" {
		cfg.upstream = "https://api.football-data.org"
	}
	if cfg.competition == "" {
		cfg.competition = "WC"
	}
	if cfg.ttl == 0 {
		cfg.ttl = 60 * time.Second
	}
	if cfg.timeout == 0 {
		cfg.timeout = 8 * time.Second
	}
	return &feedCache{cfg: cfg, client: &http.Client{}}
}

// refresh fetches upstream once. Records the attempt up front so a failure still
// throttles the next try (via lastAttempt) instead of hammering upstream. On any
// error the stale-while-error path in read() keeps serving last-good.
func (f *feedCache) refresh() {
	f.mu.Lock()
	f.lastAttempt = time.Now()
	f.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), f.cfg.timeout)
	defer cancel()

	url := fmt.Sprintf("%s/v4/competitions/%s/matches", f.cfg.upstream, f.cfg.competition)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		f.setError("request build failed: %v", err)
		return
	}
	req.Header.Set("X-Auth-Token", f.cfg.token)
	req.Header.Set("Accept", "application/json")

	resp, err := f.client.Do(req)
	if err != nil {
		f.setError("upstream fetch failed: %v", err)
		return
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		f.setError("read body failed: %v", err)
		return
	}

	f.mu.Lock()
	defer f.mu.Unlock()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		f.body = body
		f.fetchedAt = time.Now()
		f.hasCache = true
		f.lastError = false
	} else {
		// Log upstream detail server-side; never forward it to clients (it can
		// leak upstream internals and conflate server-config errors with theirs).
		f.lastError = true
		log.Printf("[feed-cache] upstream responded %d", resp.StatusCode)
	}
}

func (f *feedCache) setError(format string, args ...any) {
	f.mu.Lock()
	f.lastError = true
	f.mu.Unlock()
	log.Printf("[feed-cache] "+format, args...)
}

// read returns the current payload, refreshing first if the cache is stale.
func (f *feedCache) read() feedResult {
	f.mu.Lock()
	due := !f.hasCache || time.Since(f.lastAttempt) > f.cfg.ttl
	hasToken := f.cfg.token != ""
	f.mu.Unlock()

	if due && hasToken {
		// Coalesce concurrent refreshes onto one upstream call; all callers wait.
		_, _, _ = f.group.Do("refresh", func() (any, error) {
			f.refresh()
			return nil, nil
		})
	}

	f.mu.Lock()
	defer f.mu.Unlock()
	if f.hasCache {
		fresh := time.Since(f.fetchedAt) <= f.cfg.ttl
		// HIT: cache still fresh, no upstream call this request.
		// REFRESH: we just fetched new upstream data.
		// STALE: refresh failed (or was throttled) — serving last-good data.
		state := "HIT"
		switch {
		case !fresh:
			state = "STALE"
		case due:
			state = "REFRESH"
		}
		return feedResult{
			status:     http.StatusOK,
			body:       f.body,
			cacheState: state,
			age:        int(math.Round(time.Since(f.fetchedAt).Seconds())),
		}
	}
	if f.lastError {
		return feedResult{status: http.StatusBadGateway, body: []byte(`{"error":"upstream unavailable"}`), cacheState: "MISS"}
	}
	if hasToken {
		return feedResult{status: http.StatusBadGateway, body: []byte(`{"error":"no data yet"}`), cacheState: "MISS"}
	}
	return feedResult{status: http.StatusServiceUnavailable, body: []byte(`{"error":"live data disabled (no token)"}`), cacheState: "MISS"}
}

// handle is the net/http handler for the /api/wc/matches endpoint.
func (f *feedCache) handle(w http.ResponseWriter, r *http.Request) {
	out := f.read()
	h := w.Header()
	h.Set("Content-Type", "application/json")
	h.Set("Cache-Control", "no-store")
	h.Set("X-Cache", out.cacheState)
	h.Set("X-Cache-Age", strconv.Itoa(out.age))
	w.WriteHeader(out.status)
	if r.Method != http.MethodHead {
		w.Write(out.body)
	}
}

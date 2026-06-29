// Production server: serves the built SPA (dist/) and the cached live-data
// endpoint from a single Go process — exactly what runs inside the container.
// It mirrors the behaviour of the Vite dev server's feed cache (see
// server/feed-cache.mjs, which the dev server still uses) so dev and prod match.
//
//	FOOTBALL_DATA_TOKEN     API key (server-side only). Omit to run on seed data.
//	PORT                    listen port (default 8080)
//	DIST_DIR                built SPA directory (default "dist")
//	FD_CACHE_TTL_MS         upstream cache window (default 60000)
//	FD_UPSTREAM             upstream origin (default football-data.org)
//	FD_UPSTREAM_TIMEOUT_MS  per-fetch timeout (default 8000)
//	VITE_COMPETITION        competition code (default WC)
//	BCAST_UPSTREAM          where-to-watch source page (default live-footballontv.com)
//	BCAST_CACHE_TTL_MS      broadcaster scrape cache window (default 21600000 = 6h)
//	BCAST_UPSTREAM_TIMEOUT_MS  per-fetch timeout for the scrape (default 8000)
package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// CSP is the defense-in-depth layer: it constrains where scripts/styles/images
// can load from, so a future XSS or a poisoned upstream crest URL can't exfiltrate
// or load arbitrary origins.
//
//   - script-src: 'self' for the bundle + a sha256 hash for the one inline
//     anti-flash theme script in index.html (no blanket 'unsafe-inline', so an
//     injected <script> still can't run). If that inline script changes, update
//     the hash — recompute with the sha256 of the <script> body in dist/index.html.
//   - style-src: 'unsafe-inline' covers Vite's inlined styles; fonts.googleapis
//     serves the Inter stylesheet, fonts.gstatic the font files.
//   - img-src: 'self' + football-data.org crests + data: URIs.
const inlineThemeScriptHash = "'sha256-hfjLPorkC70zNE8VsnnqHQ7RUOiZjH73LrUhGlM1W9A='"

var csp = strings.Join([]string{
	"default-src 'self'",
	"script-src 'self' " + inlineThemeScriptHash,
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' https://fonts.gstatic.com",
	"img-src 'self' https://crests.football-data.org data:",
	"connect-src 'self'",
	"frame-ancestors 'none'",
	"base-uri 'none'",
	"form-action 'none'",
}, "; ")

// setSecurityHeaders applies the headers shared by every response (API, health
// check, and the SPA). Called before any WriteHeader so they always land.
func setSecurityHeaders(w http.ResponseWriter) {
	h := w.Header()
	h.Set("Content-Security-Policy", csp)
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "DENY")
	h.Set("Referrer-Policy", "no-referrer")
	h.Set("Cross-Origin-Opener-Policy", "same-origin")
}

func main() {
	healthcheck := flag.Bool("healthcheck", false, "probe /healthz and exit 0 (ok) or 1 — used by the container HEALTHCHECK")
	flag.Parse()

	port := envInt("PORT", 8080)
	if *healthcheck {
		os.Exit(runHealthcheck(port))
	}

	distDir := os.Getenv("DIST_DIR")
	if distDir == "" {
		distDir = "dist"
	}
	static, err := loadAssets(distDir)
	if err != nil {
		log.Fatalf("failed to load assets from %q: %v", distDir, err)
	}

	feed := newFeedCache(feedConfig{
		token:       os.Getenv("FOOTBALL_DATA_TOKEN"),
		upstream:    os.Getenv("FD_UPSTREAM"),
		competition: os.Getenv("VITE_COMPETITION"),
		ttl:         envMillis("FD_CACHE_TTL_MS"),
		timeout:     envMillis("FD_UPSTREAM_TIMEOUT_MS"),
	})

	// Broadcaster ("where to watch") cache: a 6h-cached passthrough of the source
	// page that the browser parses client-side. Independent of the football-data
	// token, so it works in seed-only mode too.
	bcast := newBroadcastCache(broadcastConfig{
		upstream: os.Getenv("BCAST_UPSTREAM"),
		ttl:      envMillis("BCAST_CACHE_TTL_MS"),
		timeout:  envMillis("BCAST_UPSTREAM_TIMEOUT_MS"),
	})

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setSecurityHeaders(w)
		switch r.URL.Path {
		case "/api/wc/matches":
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				w.Header().Set("Allow", "GET, HEAD")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusMethodNotAllowed)
				io.WriteString(w, `{"error":"method not allowed"}`)
				return
			}
			feed.handle(w, r)
			return
		case "/api/wc/broadcasters":
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				w.Header().Set("Allow", "GET, HEAD")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusMethodNotAllowed)
				io.WriteString(w, `{"error":"method not allowed"}`)
				return
			}
			bcast.handle(w, r)
			return
		case "/healthz":
			w.Header().Set("Content-Type", "text/plain")
			w.WriteHeader(http.StatusOK)
			io.WriteString(w, "ok")
			return
		}
		static.serve(w, r)
	})

	mode := "seed-only"
	if os.Getenv("FOOTBALL_DATA_TOKEN") != "" {
		mode = "live"
	}
	addr := ":" + strconv.Itoa(port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("World Cup 2026 dashboard listening on %s (%s)", addr, mode)
	log.Fatal(srv.ListenAndServe())
}

// runHealthcheck powers `server -healthcheck`: a self-contained probe the
// container HEALTHCHECK runs (distroless has no shell or wget). Exit 0 = healthy.
func runHealthcheck(port int) int {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/healthz", port))
	if err != nil {
		return 1
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return 0
	}
	return 1
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

// envMillis reads an integer-milliseconds env var into a Duration, or 0 when
// unset/invalid so the cache applies its own default.
func envMillis(key string) time.Duration {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return time.Duration(n) * time.Millisecond
		}
	}
	return 0
}

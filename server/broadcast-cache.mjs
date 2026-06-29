// Framework-agnostic server-side cache for the live-footballontv.com World Cup
// page (the UK "where to watch" source). Used by the Vite dev server
// (vite.config.ts). The production server is a Go binary (server/broadcast_cache.go)
// that mirrors this logic, so caching behaves identically in dev and prod.
//
// It mirrors server/feed-cache.mjs, with two differences: there's no API token
// (the page is public, so it always refreshes), and it returns the raw HTML —
// the browser parses it (src/data/broadcast-feed.ts) and merges the result over
// the static broadcaster tables. Fetched at most once per TTL (default 6h),
// shared across clients, stale-while-error.

const DEFAULT_UPSTREAM = 'https://www.live-footballontv.com/live-world-cup-football-on-tv.html';
const USER_AGENT = 'WorldCupDashboard/1.0 (+https://github.com/sazap10/world-cup-dashboard)';

export function createBroadcastCache({
  upstream = DEFAULT_UPSTREAM,
  ttl = 21_600_000,
  timeout = 8_000,
} = {}) {
  let cache = null; // { body: string, fetchedAt: number } — last good HTML
  let lastAttempt = 0; // epoch ms of the last refresh attempt (ok or fail)
  let inflight = null; // Promise<void> | null

  async function refresh() {
    // Record the attempt up front so a failure still throttles the next try
    // (via `lastAttempt`) instead of hammering upstream on every request.
    lastAttempt = Date.now();
    try {
      const res = await fetch(upstream, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        signal: AbortSignal.timeout(timeout),
      });
      const body = await res.text();
      // No error flag (unlike feed-cache.mjs): read() returns the same placeholder
      // whether a fetch failed or never ran, so last-good is all we track.
      if (res.ok) {
        cache = { body, fetchedAt: Date.now() };
      } else {
        console.error(`[broadcast-cache] upstream responded ${res.status}`);
      }
    } catch (err) {
      console.error(`[broadcast-cache] upstream fetch failed: ${err?.message ?? err}`);
    }
  }

  /** Current HTML, refreshing first if the cache is stale. */
  async function read() {
    const due = !cache || Date.now() - lastAttempt > ttl;
    if (due) {
      if (!inflight)
        inflight = refresh().finally(() => {
          inflight = null;
        });
      await inflight;
    }
    if (cache) {
      const fresh = Date.now() - cache.fetchedAt <= ttl;
      const cacheState = !fresh ? 'STALE' : due ? 'REFRESH' : 'HIT';
      return {
        status: 200,
        body: cache.body,
        cacheState,
        age: Math.round((Date.now() - cache.fetchedAt) / 1000),
      };
    }
    return {
      status: 502,
      body: '<!-- broadcaster listings unavailable -->',
      cacheState: 'MISS',
      age: 0,
    };
  }

  /** Node http(.IncomingMessage, .ServerResponse) handler for the endpoint.
   *  Mirrors the Go server's method semantics: 405 for non-GET/HEAD, and no body
   *  on HEAD. */
  async function handle(req, res) {
    const method = req.method ?? 'GET';
    const isHead = method === 'HEAD';
    if (method !== 'GET' && !isHead) {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Content-Type', 'application/json');
      res.end('{"error":"method not allowed"}');
      return;
    }
    try {
      const out = await read();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Cache', out.cacheState);
      res.setHeader('X-Cache-Age', String(out.age));
      res.statusCode = out.status;
      res.end(isHead ? undefined : out.body);
    } catch (err) {
      console.error('[broadcast-cache] handler error:', err);
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(isHead ? undefined : '<!-- internal error -->');
    }
  }

  return { read, handle, refresh };
}

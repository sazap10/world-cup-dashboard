// Framework-agnostic server-side cache for the football-data.org matches feed.
// Used by both the Vite dev server (vite.config.ts) and the production server
// (server/index.mjs), so caching behaves identically in dev and prod.
//
// The upstream API is fetched at most once per TTL window; every client is
// served from that single copy. Concurrent callers share one in-flight fetch
// (coalescing), and a failed refresh keeps serving the last good data
// (stale-while-error).

export function createFeedCache({
  token = '',
  upstream = 'https://api.football-data.org',
  competition = 'WC',
  ttl = 60_000,
  timeout = 8_000,
} = {}) {
  let cache = null; // { body: string, fetchedAt: number } — last good payload
  let lastError = null; // truthy once an upstream attempt has failed
  let lastAttempt = 0; // epoch ms of the last refresh attempt (ok or fail)
  let inflight = null; // Promise<void> | null

  async function refresh() {
    // Record the attempt up front so a failure still throttles the next try
    // (via `lastAttempt`) instead of hammering upstream on every request.
    lastAttempt = Date.now();
    try {
      // Bound the upstream call: without this, a hung connection would stall the
      // shared in-flight promise and every client coalesced onto it. On timeout
      // the fetch rejects and the stale-while-error path keeps serving last-good.
      const res = await fetch(`${upstream}/v4/competitions/${competition}/matches`, {
        headers: { 'X-Auth-Token': token, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeout),
      });
      const body = await res.text();
      if (res.ok) {
        cache = { body, fetchedAt: Date.now() };
        lastError = null;
      } else {
        // Log upstream detail server-side; never forward it to clients (it can
        // leak upstream internals and conflate server-config errors with theirs).
        lastError = true;
        console.error(`[feed-cache] upstream responded ${res.status}`);
      }
    } catch (err) {
      lastError = true;
      console.error(`[feed-cache] upstream fetch failed: ${err?.message ?? err}`);
    }
  }

  /** Current payload, refreshing first if the cache is stale. */
  async function read() {
    const due = !cache || Date.now() - lastAttempt > ttl;
    if (due && token) {
      if (!inflight) inflight = refresh().finally(() => { inflight = null; });
      await inflight;
    }
    if (cache) {
      const fresh = Date.now() - cache.fetchedAt <= ttl;
      // HIT: cache still fresh, no upstream call this request.
      // REFRESH: we just fetched new upstream data.
      // STALE: refresh failed (or was throttled) — serving last-good data.
      const cacheState = !fresh ? 'STALE' : due ? 'REFRESH' : 'HIT';
      return {
        status: 200,
        body: cache.body,
        cacheState,
        age: Math.round((Date.now() - cache.fetchedAt) / 1000),
      };
    }
    if (lastError) {
      return { status: 502, body: '{"error":"upstream unavailable"}', cacheState: 'MISS', age: 0 };
    }
    return {
      status: token ? 502 : 503,
      body: JSON.stringify({ error: token ? 'no data yet' : 'live data disabled (no token)' }),
      cacheState: 'MISS',
      age: 0,
    };
  }

  /** Node http(.IncomingMessage, .ServerResponse) handler for the endpoint. */
  async function handle(_req, res) {
    try {
      const out = await read();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Cache', out.cacheState);
      res.setHeader('X-Cache-Age', String(out.age));
      res.statusCode = out.status;
      res.end(out.body);
    } catch (err) {
      // Log the detail; return a generic message so we don't leak internals.
      console.error('[feed-cache] handler error:', err);
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end('{"error":"internal error"}');
    }
  }

  return { read, handle, refresh };
}

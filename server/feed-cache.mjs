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
} = {}) {
  let cache = null; // { body: string, fetchedAt: number }
  let lastError = null; // { status: number, body: string }
  let inflight = null; // Promise<void> | null

  async function refresh() {
    const res = await fetch(`${upstream}/v4/competitions/${competition}/matches`, {
      headers: { 'X-Auth-Token': token, Accept: 'application/json' },
    });
    const body = await res.text();
    if (res.ok) {
      cache = { body, fetchedAt: Date.now() };
      lastError = null;
    } else {
      // Keep serving good data; bump the timestamp so we don't hammer on errors.
      lastError = { status: res.status, body };
      if (cache) cache.fetchedAt = Date.now();
    }
  }

  /** Current payload, refreshing first if the cache is stale. */
  async function read() {
    const stale = !cache || Date.now() - cache.fetchedAt > ttl;
    if (stale && token) {
      if (!inflight) inflight = refresh().catch(() => {}).finally(() => { inflight = null; });
      await inflight;
    }
    if (cache) {
      return {
        status: 200,
        body: cache.body,
        cacheState: stale ? 'REFRESH' : 'HIT',
        age: Math.round((Date.now() - cache.fetchedAt) / 1000),
      };
    }
    if (lastError) {
      return { status: lastError.status, body: lastError.body || '{"error":"upstream error"}', cacheState: 'MISS', age: 0 };
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
      res.statusCode = 502;
      res.end(JSON.stringify({ error: String(err) }));
    }
  }

  return { read, handle, refresh };
}

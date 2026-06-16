import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Server-side cache for the football-data.org matches feed.
 *
 * The browser polls our own "/api/wc/matches" endpoint. This middleware fetches
 * the upstream API at most once per TTL window and serves every client (any
 * number of tabs / browsers) from that single cached copy. Concurrent requests
 * while a fetch is in flight share it (coalescing), and if a refresh fails we
 * keep serving the last good data (stale-while-error). Net effect: upstream
 * calls are bounded to ~1 per TTL regardless of how many clients are watching.
 */
function footballDataCache(token: string): Plugin {
  const upstream = process.env.FD_UPSTREAM ?? 'https://api.football-data.org';
  const competition = process.env.VITE_COMPETITION ?? 'WC';
  const ttl = Number(process.env.FD_CACHE_TTL_MS ?? 60_000);

  let cache: { body: string; fetchedAt: number } | null = null;
  let lastError: { status: number; body: string } | null = null;
  let inflight: Promise<void> | null = null;

  async function refresh(): Promise<void> {
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

  return {
    name: 'football-data-cache',
    configureServer(server) {
      server.middlewares.use('/api/wc/matches', (_req, res) => {
        void (async () => {
          const stale = !cache || Date.now() - cache.fetchedAt > ttl;
          if (stale && token) {
            // Coalesce: all callers await the same in-flight refresh.
            if (!inflight) inflight = refresh().catch(() => {}).finally(() => { inflight = null; });
            await inflight;
          }

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');

          if (cache) {
            res.setHeader('X-Cache', stale ? 'REFRESH' : 'HIT');
            res.setHeader('X-Cache-Age', String(Math.round((Date.now() - cache.fetchedAt) / 1000)));
            res.statusCode = 200;
            res.end(cache.body);
          } else if (lastError) {
            res.statusCode = lastError.status;
            res.end(lastError.body || JSON.stringify({ error: 'upstream error' }));
          } else {
            res.statusCode = token ? 502 : 503;
            res.end(JSON.stringify({ error: token ? 'no data yet' : 'live data disabled (no token)' }));
          }
        })().catch((err) => {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: String(err) }));
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // FOOTBALL_DATA_TOKEN stays server-side (only VITE_-prefixed vars reach the client).
  const env = loadEnv(mode, process.cwd(), '');
  const token = env.FOOTBALL_DATA_TOKEN ?? process.env.FOOTBALL_DATA_TOKEN ?? '';

  return {
    plugins: [react(), footballDataCache(token)],
    server: {
      // Raw passthrough proxy, kept for direct/manual access. The app's default
      // endpoint is the cached "/api/wc/matches" above.
      proxy: {
        '/fd': {
          target: 'https://api.football-data.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/fd/, ''),
          headers: token ? { 'X-Auth-Token': token } : {},
        },
      },
    },
  };
});

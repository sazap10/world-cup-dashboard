import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createBroadcastCache } from './server/broadcast-cache.mjs';
import { createFeedCache } from './server/feed-cache.mjs';

/**
 * Mounts the shared football-data.org cache (see server/feed-cache.mjs) on the
 * dev server at "/api/wc/matches" — the same endpoint the production server
 * exposes, so dev and prod behave identically. The browser polls this; upstream
 * is fetched at most once per TTL window and fanned out to every client.
 */
function footballDataCache(token: string): Plugin {
  const feed = createFeedCache({
    token,
    upstream: process.env.FD_UPSTREAM,
    competition: process.env.VITE_COMPETITION,
    ttl: process.env.FD_CACHE_TTL_MS ? Number(process.env.FD_CACHE_TTL_MS) : undefined,
    timeout: process.env.FD_UPSTREAM_TIMEOUT_MS
      ? Number(process.env.FD_UPSTREAM_TIMEOUT_MS)
      : undefined,
  });

  return {
    name: 'football-data-cache',
    configureServer(server) {
      server.middlewares.use('/api/wc/matches', (req, res) => {
        feed.handle(req, res);
      });
    },
  };
}

/**
 * Mounts the shared broadcaster ("where to watch") cache (see
 * server/broadcast-cache.mjs) on the dev server at "/api/wc/broadcasters" — the
 * same endpoint the production Go server exposes. A cached passthrough of the
 * live-footballontv.com page; the browser parses it (src/data/broadcast-feed.ts).
 */
function broadcastCachePlugin(): Plugin {
  const bcast = createBroadcastCache({
    upstream: process.env.BCAST_UPSTREAM,
    ttl: process.env.BCAST_CACHE_TTL_MS ? Number(process.env.BCAST_CACHE_TTL_MS) : undefined,
    timeout: process.env.BCAST_UPSTREAM_TIMEOUT_MS
      ? Number(process.env.BCAST_UPSTREAM_TIMEOUT_MS)
      : undefined,
  });

  return {
    name: 'broadcast-cache',
    configureServer(server) {
      server.middlewares.use('/api/wc/broadcasters', (req, res) => {
        bcast.handle(req, res);
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
    plugins: [react(), footballDataCache(token), broadcastCachePlugin()],
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

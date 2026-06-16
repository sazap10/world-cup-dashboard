// Production server: serves the built SPA (dist/) and the cached live-data
// endpoint from a single Node process — exactly what runs inside the container.
//
//   FOOTBALL_DATA_TOKEN   API key (server-side only). Omit to run on seed data.
//   PORT                  listen port (default 8080)
//   FD_CACHE_TTL_MS       upstream cache window (default 60000)
//   FD_UPSTREAM           upstream origin (default football-data.org)
//   VITE_COMPETITION      competition code (default WC)

import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sirv from 'sirv';
import { createFeedCache } from './feed-cache.mjs';

const PORT = Number(process.env.PORT ?? 8080);
const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');

const feed = createFeedCache({
  token: process.env.FOOTBALL_DATA_TOKEN ?? '',
  upstream: process.env.FD_UPSTREAM,
  competition: process.env.VITE_COMPETITION,
  ttl: process.env.FD_CACHE_TTL_MS ? Number(process.env.FD_CACHE_TTL_MS) : undefined,
});

// `single: true` is the SPA fallback: unknown routes (e.g. /tables, /knockout)
// serve index.html so client-side routing works. Hashed assets are immutable.
const serveStatic = sirv(distDir, {
  single: true,
  gzip: true,
  brotli: true,
  setHeaders(res, pathname) {
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
});

const server = http.createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  if (path === '/api/wc/matches') {
    feed.handle(req, res);
    return;
  }
  if (path === '/healthz') {
    res.statusCode = 200;
    res.end('ok');
    return;
  }
  serveStatic(req, res, () => {
    res.statusCode = 404;
    res.end('Not found');
  });
});

server.listen(PORT, () => {
  const mode = process.env.FOOTBALL_DATA_TOKEN ? 'live' : 'seed-only';
  console.log(`World Cup 2026 dashboard listening on :${PORT} (${mode})`);
});

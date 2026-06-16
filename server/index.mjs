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
  timeout: process.env.FD_UPSTREAM_TIMEOUT_MS ? Number(process.env.FD_UPSTREAM_TIMEOUT_MS) : undefined,
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

// Security headers applied to every response (API, health check, and the SPA).
// CSP is the defense-in-depth layer: it constrains where scripts/styles/images
// can load from, so a future XSS or a poisoned upstream crest URL can't exfiltrate
// or load arbitrary origins.
//
//  - script-src: 'self' for the bundle + a sha256 hash for the one inline
//    anti-flash theme script in index.html (no blanket 'unsafe-inline', so an
//    injected <script> still can't run). If that inline script changes, update
//    the hash — recompute with the sha256 of the <script> body in dist/index.html.
//  - style-src: 'unsafe-inline' covers Vite's inlined styles; fonts.googleapis
//    serves the Inter stylesheet, fonts.gstatic the font files.
//  - img-src: 'self' + football-data.org crests + data: URIs.
const INLINE_THEME_SCRIPT_HASH = "'sha256-YkkPKrnlSBPbev5MP8rbK30P3NgwpX3AGg4znU0eeQ8='";
const CSP = [
  "default-src 'self'",
  `script-src 'self' ${INLINE_THEME_SCRIPT_HASH}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' https://crests.football-data.org data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function setSecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);
  const path = (req.url ?? '/').split('?')[0];
  const method = req.method ?? 'GET';
  if (path === '/api/wc/matches') {
    if (method !== 'GET' && method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Content-Type', 'application/json');
      res.end('{"error":"method not allowed"}');
      return;
    }
    feed.handle(req, res);
    return;
  }
  if (path === '/healthz') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('ok');
    return;
  }
  serveStatic(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not found');
  });
});

server.listen(PORT, () => {
  const mode = process.env.FOOTBALL_DATA_TOKEN ? 'live' : 'seed-only';
  console.log(`World Cup 2026 dashboard listening on :${PORT} (${mode})`);
});

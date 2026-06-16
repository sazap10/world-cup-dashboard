---
name: run-app
description: Launch and drive the World Cup 2026 dashboard (Vite SPA + single-process Node server in server/index.mjs). Use to run/start/preview the app, smoke-test the /api/wc/matches feed cache, or exercise live data without a real football-data.org token. Covers seed-only mode and a mock-upstream "live" mode, plus browser verification.
---

# Run the World Cup 2026 dashboard

The app is a Vite React SPA served (in prod) by a single Node process,
`server/index.mjs`, which also exposes the cached `/api/wc/matches` feed.
Running it = launching that server and driving it as a user would.

## 0. Build first (the server serves `dist/`)

```bash
npm run build          # tsc -b && vite build  → produces dist/
```

If `dist/` is missing the server returns 404s for the SPA shell.

## 1. Seed-only mode (no API token)

This is the default when `FOOTBALL_DATA_TOKEN` is unset.

```bash
PORT=8080 node server/index.mjs        # run in background
# wait until it accepts connections:
until curl -fsS -o /dev/null http://127.0.0.1:8080/healthz; do sleep 0.3; done
```

Expected smoke results (`/api/wc/matches` is live-disabled without a token):

| Request | Expected |
|---|---|
| `GET /healthz` | `200`, `Content-Type: text/plain`, body `ok` |
| `GET /` and `GET /tables` | `200 text/html` (SPA + client-route fallback) |
| `GET /api/wc/matches` | `503`, `{"error":"live data disabled (no token)"}`, `X-Cache: MISS` |
| `POST /api/wc/matches` | `405`, header `Allow: GET, HEAD` |
| `GET /assets/missing.js` | `404 text/plain` |

## 2. Live mode WITHOUT a real token (mock upstream)

The server caches and passes through the upstream football-data.org feed; the
client (`src/data/live.ts`) maps it. Use the bundled mock to exercise the whole
pipeline. Run both in the background:

```bash
# terminal 1 — mock upstream on :9099
node .claude/skills/run-app/mock-upstream.mjs

# terminal 2 — server in live mode, pointed at the mock, short TTL so HIT/REFRESH are observable
FOOTBALL_DATA_TOKEN=test-token \
FD_UPSTREAM=http://127.0.0.1:9099 \
FD_CACHE_TTL_MS=2000 \
PORT=8081 node server/index.mjs
# startup log should say "(live)"
until curl -fsS -o /dev/null http://127.0.0.1:8081/healthz; do sleep 0.3; done
```

Feed-cache behaviour to verify on `GET /api/wc/matches`:
- First call → `X-Cache: REFRESH` (cold fetch from upstream)
- Immediate repeat (within TTL) → `X-Cache: HIT`
- After upstream goes away past TTL → `X-Cache: STALE`, last-good body still 200

## 3. Drive it in a browser (live mode)

`live.ts` only runs in the browser, so open the live server (`:8081`):

```bash
playwright-cli open http://127.0.0.1:8081
# poll fires on mount; give it a moment, then look:
playwright-cli screenshot --filename=/tmp/wc-home.png   # then Read the PNG
playwright-cli --raw console                            # expect 0 errors/warnings
```

Things to confirm (these double as regression checks for prior fixes):
- "Live data" pill is lit (seed→live upgrade fired).
- Home featured match + Results show the mock data
  (`Mexico 2–1 Croatia`, FULL TIME, Group A · Matchday 1), timezone-converted.
- **Group A table excludes the knockout-only teams** (the "don't fabricate
  Group A" fix). Quick assertion:
  ```bash
  playwright-cli goto http://127.0.0.1:8081/tables
  playwright-cli --raw eval "(() => { const t=document.body.innerText; return JSON.stringify({hasMexico:t.includes('Mexico'),brazilInTables:t.includes('Brazil'),franceInTables:t.includes('France')}); })()"
  # expect hasMexico:true, brazilInTables:false, franceInTables:false
  ```

## 4. Teardown

```bash
playwright-cli close
pkill -f 'server/index.mjs'; pkill -f mock-upstream.mjs
```
(SIGTERM shows as exit code 143/144 in background-task notifications — that's the
expected shutdown, not a failure.)

## Gotchas

- **`curl`/`wget` may be intercepted** by a context-mode hook that asks you to
  fetch via a tool. When that happens, wrap the curl commands in a single
  `ctx_execute(language:"shell", ...)` call and print only the summary.
- **Real live data:** put a football-data.org key in `.env` as
  `FOOTBALL_DATA_TOKEN=...` and skip the mock (omit `FD_UPSTREAM`). Free tier is
  ~10 req/min; the server's TTL cache (default 60s) keeps you well under it.
- **Dev server** (`npm run dev`) mounts the same feed cache at the same
  `/api/wc/matches` path via `vite.config.ts`, so dev and prod behave identically.

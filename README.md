# World Cup 2026 Dashboard

A fast, timezone-aware companion for the FIFA World Cup 2026. Built to answer the
matchday questions in one glance: **what's on next, when does it kick off in my time,
and where do I watch it in the UK?**

![Home](docs/home.png)

## Features

- **Home** — the live match (or next kickoff) front and centre with a running clock or
  countdown, plus upcoming fixtures grouped by day.
- **Timezone aware** — every kickoff renders in your chosen timezone. Defaults to
  **London (BST)**; switch to any host-nation or common fan zone from the header. Your
  choice is remembered.
- **Where to watch (UK)** — each match shows its UK broadcaster (BBC / ITV) with a direct
  link to stream it on iPlayer or ITVX.
- **Results** — every finished match, newest first, filterable by stage or group.
- **Group tables** — all 12 groups with computed standings, qualification zones, form
  guides, and the best-third-placed race.
- **Knockout bracket** — the full Round of 32 → Final tree, with provisional seedings
  drawn from the live standings until each group is decided.
- **Live, accessible, responsive** — live status pulses, WCAG AA contrast, status never
  by colour alone, full keyboard support, `prefers-reduced-motion` honoured, and a mobile
  bottom-nav layout.

## Tech

- **React 18 + TypeScript + Vite**
- **React Router** for the four routes
- **No date library** — kickoff times are stored in UTC and rendered with the built-in
  `Intl` APIs, which handle DST (so `Europe/London` is BST in summer automatically).
- Hand-authored CSS design system (OKLCH tokens, dark broadcast theme). See
  [`DESIGN.md`](DESIGN.md) and [`PRODUCT.md`](PRODUCT.md).

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Data: live with seed fallback

The app has two data sources behind one interface ([`src/data/source.ts`](src/data/source.ts)):

- **Seed** — deterministic sample data in the official 48-team format (12 groups, 16 host
  venues, BBC/ITV rights split). Always available, offline, instant.
- **Live** — the [football-data.org](https://www.football-data.org/) World Cup feed
  ([`src/data/live.ts`](src/data/live.ts)).

It **renders the seed data instantly, then upgrades to live in the background** and
re-polls every 60s. If the live fetch fails (no key, network, rate limit), it silently
stays on whatever it has. The header shows a **Live data / Sample data** badge.

Standings are always computed in-app from completed matches, so the seed and live paths
behave identically. No sports API reports UK TV rights, so the **BBC/ITV "where to watch"
channel is assigned locally** and deterministically per match in both modes.

### Enabling live data

1. Get a free key at <https://www.football-data.org/client/register>.
2. `cp .env.example .env` and set `FOOTBALL_DATA_TOKEN=your-key`.
3. `npm run dev`.

The token is **never exposed to the browser**: the Vite dev server proxies
`/fd/*` → `https://api.football-data.org/*` and injects the `X-Auth-Token` header
server-side (see [`vite.config.ts`](vite.config.ts)). For production, point
`VITE_API_BASE` at an equivalent proxy (e.g. a serverless function) that adds the header.
Set `VITE_USE_LIVE=false` to force seed mode.

> football-data.org's free tier allows 10 requests/minute; the 60s poll stays well under.
> Group/knockout coverage of the 2026 edition depends on your plan — when a field is
> missing the app falls back cleanly.

### Demo clock

By default the dashboard uses the real wall clock. To preview a specific moment (for
example, to see the live state), freeze time with a query parameter:

```
/?now=2026-06-16T20:30:00Z
```

## Project structure

```
src/
  data/        types, teams, venues, broadcasters, seed schedule generation,
               source.ts (seed/live abstraction), live.ts (football-data.org adapter)
  lib/         clock, timezone formatting, match state, standings, knockout, broadcast
  app/         clock + timezone providers, DataProvider (live fetch + fallback),
               useTournament selector
  components/  Header, Nav, MatchCard, FeaturedMatch, StandingsTable, BracketTie, …
  pages/       Home, Results, Tables, Knockout
  styles/      tokens.css, base.css, app.css
```

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

## About the data

Fixtures, results, and standings are **illustrative seed data** generated deterministically
in the official 48-team World Cup 2026 format (12 groups, 16 host venues, BBC/ITV UK
rights split). They are **not** live results. The data layer
([`src/data`](src/data)) is structured so it can be swapped for a live fixtures API
without touching the UI.

### Demo clock

By default the dashboard uses the real wall clock. To preview a specific moment (for
example, to see the live state), freeze time with a query parameter:

```
/?now=2026-06-16T20:30:00Z
```

## Project structure

```
src/
  data/        teams, venues, broadcasters, schedule + result generation, types
  lib/         clock, timezone formatting, match state, standings, knockout resolution
  app/         clock + timezone providers, the useTournament selector
  components/  Header, Nav, MatchCard, FeaturedMatch, StandingsTable, BracketTie, …
  pages/       Home, Results, Tables, Knockout
  styles/      tokens.css, base.css, app.css
```

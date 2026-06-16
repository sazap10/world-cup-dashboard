# Design

## Theme

Dark, broadcast-grade. The surface is a deep stadium blue-black; the energy lives in a
confident cobalt primary and an electric pitch-green accent reserved for live and
highlight states. Strategy: **Committed** — the blue family carries the architecture,
green is the single high-voltage accent (used sparingly, under ~10% of the surface).

Scene sentence: a fan checking the next kickoff at night, screen bright against a dark
room, wanting the live game to jump out and the rest to stay calm and scannable.

## Color

OKLCH throughout. Dark theme is the only theme.

```css
/* Surfaces — deep stadium blue-black */
--bg:          oklch(0.165 0.018 256);   /* app background        */
--surface:     oklch(0.205 0.020 256);   /* cards, panels         */
--surface-2:   oklch(0.250 0.022 256);   /* elevated / hover      */
--surface-3:   oklch(0.300 0.022 256);   /* inputs, chips         */
--border:      oklch(0.330 0.020 256);   /* hairlines             */
--border-strong: oklch(0.420 0.022 256);

/* Text */
--ink:         oklch(0.975 0.004 256);   /* primary text ~16:1    */
--muted:       oklch(0.740 0.014 256);   /* secondary ~5.2:1      */
--faint:       oklch(0.620 0.014 256);   /* tertiary, ≥3:1 large  */

/* Brand */
--primary:     oklch(0.620 0.170 256);   /* cobalt — primary action/selection */
--primary-ink: oklch(0.985 0 0);         /* white text on primary */
--primary-soft: oklch(0.620 0.170 256 / 0.16);

--accent:      oklch(0.860 0.180 145);   /* electric pitch green — LIVE / highlight */
--accent-ink:  oklch(0.180 0.040 145);   /* dark text on green fill */

/* Semantic (results / form) */
--win:         oklch(0.760 0.150 150);   /* W */
--draw:        oklch(0.780 0.090 90);    /* D */
--loss:        oklch(0.650 0.190 25);    /* L */
--info:        oklch(0.700 0.120 240);
--warning:     oklch(0.800 0.140 75);
```

White text on the cobalt primary fill; dark text on the pale green accent fill (per the
Helmholtz–Kohlrausch rule). Status is always paired with a label or glyph, never color
alone.

## Typography

One family, weight contrast over family contrast.

- **Family:** Inter (variable) with a `system-ui` fallback stack. `tabular-nums` and a
  monospace stack (`ui-monospace`) for scores, clocks, and the countdown so digits don't
  jitter.
- **Scale (fixed rem, product register):** 0.75 / 0.8125 / 0.875 / 1 / 1.125 / 1.375 /
  1.75 / 2.5 rem. Ratio ~1.2.
- **Weights:** 400 body, 500 labels, 600 headings/emphasis, 700–800 reserved for the
  scoreboard and the next-kickoff hero number.
- Section headings use uppercase only for short eyebrow labels (≤3 words) and badges.
- `text-wrap: balance` on headings.

## Components

- **MatchCard** — the core unit. States: upcoming, live (green pulse + minute), full-time.
  Shows both teams + flags, kickoff time in selected TZ, venue, and a UK broadcaster pill
  linking out to the streaming page. Hover/focus elevate to `--surface-2`.
- **TeamRow / ScoreLine** — flag, name, score (tabular mono), result glyph.
- **StandingsTable** — dense, tabular-nums, qualification zone tinted with a left edge of
  position color (full cell tint, not a side stripe), form guide of W/D/L pills.
- **KnockoutBracket** — horizontally scrollable column-per-round tree; provisional slots
  labelled (e.g. "1A", "Winner M73").
- **TimezoneSelect** — native `<select>` styled to the system; persists to localStorage.
- **BroadcasterPill** — channel + "Watch on iPlayer/ITVX" external link.
- Every interactive element ships default / hover / focus-visible / active / disabled.
  Skeletons for loading, teaching empty states.

## Motion

150–250ms, ease-out. Reserved for state and feedback: card hover lift, tab underline
slide, live pulse (2s), countdown tick, route crossfade. One staggered entrance on the
home fixtures list. All gated behind `prefers-reduced-motion: reduce` (→ instant/crossfade,
pulse becomes a static ring).

## Layout

- App shell: sticky top bar (wordmark + live ticker + timezone select), primary nav tabs,
  content column max ~1200px, generous vertical rhythm.
- Home: live/next hero band, then grouped upcoming fixtures by day.
- Responsive is structural: nav collapses to a bottom tab bar on mobile, tables scroll
  horizontally within a contained frame, bracket scrolls horizontally.
- Semantic z-index scale: base → sticky-header → dropdown → modal → toast.

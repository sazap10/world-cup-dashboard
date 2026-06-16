import { pickBroadcaster } from '../lib/broadcast';
import { GROUP_IDS, teamsInGroup } from './teams';
import type { Match, Score, Stage } from './types';
import { VENUES } from './venues';

// ---------------------------------------------------------------------------
// Deterministic pseudo-randomness so the tournament looks the same every load.
// ---------------------------------------------------------------------------
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A plausible football scoreline (mostly 0–3 goals) seeded by the match id. */
function seededScore(matchId: string): Score {
  const rnd = mulberry32(hashString(matchId));
  const goals = () => {
    const r = rnd();
    if (r < 0.28) return 0;
    if (r < 0.62) return 1;
    if (r < 0.84) return 2;
    if (r < 0.95) return 3;
    return 4;
  };
  return { home: goals(), away: goals() };
}

// ---------------------------------------------------------------------------
// Group stage: 12 groups × round-robin over 3 matchdays = 72 matches.
// ---------------------------------------------------------------------------
const PAIRINGS: number[][][] = [
  [
    [0, 1],
    [2, 3],
  ], // matchday 1
  [
    [0, 2],
    [3, 1],
  ], // matchday 2
  [
    [3, 0],
    [1, 2],
  ], // matchday 3
];

const SLOT_HOURS = [16, 18, 20, 22]; // UTC kickoff slots

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Build a June 2026 UTC ISO timestamp; days > 30 roll into July. */
function juneKickoff(day: number, hour: number): string {
  if (day <= 30) return `2026-06-${pad(day)}T${pad(hour)}:00:00Z`;
  return `2026-07-${pad(day - 30)}T${pad(hour)}:00:00Z`;
}

function buildGroupStage(): Match[] {
  const matches: Match[] = [];
  let venueCursor = 0;

  GROUP_IDS.forEach((group, gIndex) => {
    const teams = teamsInGroup(group); // 4 teams, draw order
    const md1Day = 11 + Math.floor(gIndex / 2); // groups staggered Jun 11–16
    const matchdayDay = [md1Day, md1Day + 5, md1Day + 9];

    PAIRINGS.forEach((dayPairs, mdIndex) => {
      const matchday = mdIndex + 1;
      const day = matchdayDay[mdIndex];

      dayPairs.forEach(([h, a], i) => {
        const hour = SLOT_HOURS[(gIndex + mdIndex + i * 2) % SLOT_HOURS.length];
        const id = `G-${group}-${matchday}-${i + 1}`;

        matches.push({
          id,
          stage: 'group',
          group,
          matchday,
          kickoff: juneKickoff(day, hour),
          venue: VENUES[venueCursor++ % VENUES.length],
          broadcaster: pickBroadcaster(id),
          home: teams[h].code,
          away: teams[a].code,
          result: seededScore(id),
          roundLabel: `Group ${group} · Matchday ${matchday}`,
        });
      });
    });
  });

  return matches;
}

// ---------------------------------------------------------------------------
// Knockout bracket: structural slots resolved provisionally at read time.
// Participants depend on results we don't have yet, so ties carry slot
// labels ("1A", "3rd-1", "W73") rather than fixed teams.
// ---------------------------------------------------------------------------
interface KnockoutTemplate {
  id: string;
  stage: Stage;
  roundLabel: string;
  home: string;
  away: string;
  day: number;
  hour: number;
  venueIndex: number;
  broadcasterIndex: number;
}

// Round of 32 — pairings use group-position labels and "best third" slots.
const R32_TEMPLATES: Omit<KnockoutTemplate, 'stage' | 'roundLabel'>[] = [
  { id: 'M73', home: '1A', away: '2C', day: 28, hour: 16, venueIndex: 5, broadcasterIndex: 0 },
  { id: 'M74', home: '1C', away: '2F', day: 28, hour: 20, venueIndex: 6, broadcasterIndex: 2 },
  { id: 'M75', home: '1E', away: '3rd-1', day: 29, hour: 16, venueIndex: 7, broadcasterIndex: 1 },
  { id: 'M76', home: '1F', away: '2E', day: 29, hour: 20, venueIndex: 8, broadcasterIndex: 3 },
  { id: 'M77', home: '1I', away: '3rd-2', day: 29, hour: 22, venueIndex: 13, broadcasterIndex: 0 },
  { id: 'M78', home: '1B', away: '3rd-3', day: 30, hour: 16, venueIndex: 4, broadcasterIndex: 2 },
  { id: 'M79', home: '1K', away: '2L', day: 30, hour: 20, venueIndex: 9, broadcasterIndex: 1 },
  { id: 'M80', home: '2A', away: '2B', day: 30, hour: 22, venueIndex: 2, broadcasterIndex: 3 },
  { id: 'M81', home: '1D', away: '3rd-4', day: 31, hour: 16, venueIndex: 10, broadcasterIndex: 0 },
  { id: 'M82', home: '1G', away: '3rd-5', day: 31, hour: 20, venueIndex: 11, broadcasterIndex: 2 },
  { id: 'M83', home: '1H', away: '2J', day: 31, hour: 22, venueIndex: 0, broadcasterIndex: 1 },
  { id: 'M84', home: '1J', away: '2H', day: 32, hour: 16, venueIndex: 1, broadcasterIndex: 3 },
  { id: 'M85', home: '1L', away: '3rd-6', day: 32, hour: 20, venueIndex: 14, broadcasterIndex: 0 },
  { id: 'M86', home: '2D', away: '2G', day: 32, hour: 22, venueIndex: 15, broadcasterIndex: 2 },
  { id: 'M87', home: '2I', away: '2K', day: 33, hour: 16, venueIndex: 12, broadcasterIndex: 1 },
  {
    id: 'M88',
    home: '3rd-7',
    away: '3rd-8',
    day: 33,
    hour: 20,
    venueIndex: 3,
    broadcasterIndex: 3,
  },
];

// Later rounds reference the winners of earlier matches.
const R16_PAIRS: [string, string][] = [
  ['W73', 'W74'],
  ['W75', 'W76'],
  ['W77', 'W78'],
  ['W79', 'W80'],
  ['W81', 'W82'],
  ['W83', 'W84'],
  ['W85', 'W86'],
  ['W87', 'W88'],
];
const QF_PAIRS: [string, string][] = [
  ['W89', 'W90'],
  ['W91', 'W92'],
  ['W93', 'W94'],
  ['W95', 'W96'],
];
const SF_PAIRS: [string, string][] = [
  ['W97', 'W98'],
  ['W99', 'W100'],
];

function buildKnockout(): Match[] {
  const out: Match[] = [];
  const make = (
    id: string,
    stage: Stage,
    roundLabel: string,
    home: string,
    away: string,
    day: number,
    hour: number,
    vIndex: number,
  ): Match => ({
    id,
    stage,
    kickoff: juneKickoff(day, hour),
    venue: VENUES[vIndex % VENUES.length],
    broadcaster: pickBroadcaster(id),
    home,
    away,
    result: null,
    roundLabel,
  });

  R32_TEMPLATES.forEach((t) => {
    out.push(make(`K-${t.id}`, 'r32', 'Round of 32', t.home, t.away, t.day, t.hour, t.venueIndex));
  });

  R16_PAIRS.forEach(([h, a], i) => {
    out.push(
      make(`K-M${89 + i}`, 'r16', 'Round of 16', h, a, 34 + Math.floor(i / 2), i % 2 ? 20 : 16, i),
    );
  });
  QF_PAIRS.forEach(([h, a], i) => {
    out.push(make(`K-M${97 + i}`, 'qf', 'Quarter-final', h, a, 39 + i, i % 2 ? 20 : 16, i + 4));
  });
  SF_PAIRS.forEach(([h, a], i) => {
    out.push(make(`K-M${101 + i}`, 'sf', 'Semi-final', h, a, 44 + i, 20, i + 8));
  });
  out.push(make('K-M103', 'final', 'Final', 'W101', 'W102', 49, 19, 5));

  return out;
}

export const MATCHES: Match[] = [...buildGroupStage(), ...buildKnockout()];

export const GROUP_MATCHES = MATCHES.filter((m) => m.stage === 'group');
export const KNOCKOUT_MATCHES = MATCHES.filter((m) => m.stage !== 'group');

export const MATCHES_BY_ID: Record<string, Match> = Object.fromEntries(
  MATCHES.map((m) => [m.id, m]),
);

/** Tournament window, for empty-state copy and bounds. */
export const TOURNAMENT_START = '2026-06-11T16:00:00Z';
export const TOURNAMENT_END = '2026-07-19T23:00:00Z';

import { broadcasterForTeams, realFixtureFor } from '../lib/broadcast';
import { venueIdForKnockoutMatch, venueIdForPair } from './match-venues';
import { GROUP_IDS, teamsInGroup } from './teams';
import type { Match, Score, Stage } from './types';
import { VENUES, venueById } from './venues';

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

/**
 * A knockout scoreline. Same seeded distribution as the group stage, but a tie
 * is broken deterministically so there is always a winner — the data model has
 * no extra-time/penalty concept, so knockouts are treated as decided in normal
 * time. This lets the bracket advance winners as each round's clock runs out.
 */
function seededKnockoutScore(matchId: string): Score {
  const s = seededScore(matchId);
  if (s.home !== s.away) return s;
  return mulberry32(hashString(`${matchId}-ko`))() < 0.5
    ? { home: s.home + 1, away: s.away }
    : { home: s.home, away: s.away + 1 };
}

// ---------------------------------------------------------------------------
// Group stage: 12 groups × round-robin = 6 ties each, 72 matches total.
//
// A 4-team round-robin splits into exactly three rounds, each a perfect pairing
// where every team plays once (the unique 1-factorisation of K4). Real
// matchdays are exactly these rounds, so we group ties by round, then order the
// three rounds by their earliest kickoff to label them Matchday 1–3.
//
// Where the broadcast listings cover a tie (see REAL_GROUP_FIXTURES), we use
// its real home/away order, kickoff, and channel. Ties the source doesn't cover
// (already played, or not yet listed) get a "Broadcaster TBC" placeholder and a
// synthesised kickoff anchored to their round's known game (or, for a fully
// unlisted round, after the group's last known game).
// ---------------------------------------------------------------------------
const ROUNDS: [number, number][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

const HOUR_MS = 3600 * 1000;

function isoUtc(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

interface BuiltTie {
  home: string;
  away: string;
  kickoff: string;
}

function buildGroupStage(): Match[] {
  const matches: Match[] = [];
  let venueCursor = 0;

  GROUP_IDS.forEach((group, gIndex) => {
    const teams = teamsInGroup(group); // 4 teams

    const rounds: BuiltTie[][] = ROUNDS.map((pairs) =>
      pairs.map(([h, a]) => {
        const real = realFixtureFor(teams[h].code, teams[a].code);
        return real
          ? { home: real.home, away: real.away, kickoff: real.kickoff }
          : { home: teams[h].code, away: teams[a].code, kickoff: '' };
      }),
    );

    // Fill in synthesised kickoffs for TBC ties so every tie has a time.
    const allKnown = rounds
      .flat()
      .map((t) => t.kickoff)
      .filter(Boolean)
      .sort();
    const groupAnchor = allKnown.length
      ? new Date(allKnown[allKnown.length - 1])
      : new Date(`2026-06-${pad(11 + Math.floor(gIndex / 2))}T18:00:00Z`);
    for (const round of rounds) {
      const knownInRound = round
        .map((t) => t.kickoff)
        .filter(Boolean)
        .sort();
      for (const tie of round) {
        if (tie.kickoff) continue;
        const base = knownInRound.length
          ? new Date(new Date(knownInRound[0]).getTime() + 3 * HOUR_MS)
          : new Date(groupAnchor.getTime() + 24 * HOUR_MS);
        tie.kickoff = isoUtc(base);
      }
    }

    // Order rounds by earliest kickoff → chronological Matchday 1–3 labels.
    rounds.sort((a, b) => earliest(a).localeCompare(earliest(b)));
    rounds.forEach((round, mdIndex) => {
      const matchday = mdIndex + 1;
      round.sort((x, y) => x.kickoff.localeCompare(y.kickoff));
      round.forEach((tie, i) => {
        const id = `G-${group}-${matchday}-${i + 1}`;
        // Real FIFA venue for this pairing; fall back to a rotation only when the
        // tie isn't in the published schedule (shouldn't happen for real draws).
        // A known-but-unresolvable id throws via venueById rather than masking the bug.
        const realVenueId = venueIdForPair(tie.home, tie.away);
        const venue = realVenueId ? venueById(realVenueId) : VENUES[venueCursor++ % VENUES.length];
        matches.push({
          id,
          stage: 'group',
          group,
          matchday,
          kickoff: tie.kickoff,
          venue,
          broadcaster: broadcasterForTeams(tie.home, tie.away),
          home: tie.home,
          away: tie.away,
          result: seededScore(id),
          roundLabel: `Group ${group} · Matchday ${matchday}`,
        });
      });
    });
  });

  return matches;
}

function earliest(round: BuiltTie[]): string {
  return round.map((t) => t.kickoff).sort()[0];
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * FIFA match number for a knockout match id (K-M73…K-M103). The app labels the
 * final K-M103 and has no third-place play-off, but FIFA's final is match 104,
 * so remap it; all others pass through.
 */
function knockoutMatchNumber(id: string): number {
  const n = Number(id.replace('K-M', ''));
  return n === 103 ? 104 : n;
}

/** Build a June 2026 UTC ISO timestamp; days > 30 roll into July. */
function juneKickoff(day: number, hour: number, minute = 0): string {
  const date = day <= 30 ? `2026-06-${pad(day)}` : `2026-07-${pad(day - 30)}`;
  return `${date}T${pad(hour)}:${pad(minute)}:00Z`;
}

// ---------------------------------------------------------------------------
// Knockout bracket: structural slots resolved provisionally at read time.
// Participants depend on results we don't have yet, so ties carry slot
// labels ("1A", "3rd-1", "W73") rather than fixed teams.
// ---------------------------------------------------------------------------
/**
 * Official UTC kickoff for each knockout tie, keyed by FIFA match number
 * (see knockoutMatchNumber — the app's final K-M103 maps to FIFA match 104).
 * Value is [day, hour, minute?] in the juneKickoff calendar (day > 30 = July).
 */
const KNOCKOUT_KICKOFFS: Record<number, [number, number, number?]> = {
  73: [28, 19], // Round of 32
  74: [29, 20, 30],
  75: [30, 1],
  76: [29, 17],
  77: [30, 21],
  78: [30, 17],
  79: [31, 1],
  80: [31, 16],
  81: [32, 0],
  82: [31, 20],
  83: [32, 23],
  84: [32, 19],
  85: [33, 3],
  86: [33, 22],
  87: [34, 1, 30],
  88: [33, 18],
  89: [34, 21], // Round of 16
  90: [34, 17],
  91: [35, 20],
  92: [36, 0],
  93: [36, 19],
  94: [37, 0],
  95: [37, 16],
  96: [37, 20],
  97: [39, 20], // Quarter-finals
  98: [40, 19],
  99: [41, 21],
  100: [42, 1],
  101: [44, 19], // Semi-finals
  102: [45, 19],
  104: [49, 19], // Final
};

// Round of 32 — pairings use group-position labels and "best third" slots.
// Matchups follow FIFA's published 2026 schedule (Match 73–88). The eight
// "winner vs best third" ties carry generic 3rd-1…3rd-8 slots resolved via
// FIFA's official allocation table; which group fills each slot depends on
// *which* eight groups' thirds qualify — the only part decided by cross-group
// ranking (see resolveSlot in lib/knockout and data/third-place-allocation).
const R32_TEMPLATES: { id: string; home: string; away: string }[] = [
  { id: 'M73', home: '2A', away: '2B' },
  { id: 'M74', home: '1E', away: '3rd-1' },
  { id: 'M75', home: '1F', away: '2C' },
  { id: 'M76', home: '1C', away: '2F' },
  { id: 'M77', home: '1I', away: '3rd-2' },
  { id: 'M78', home: '2E', away: '2I' },
  { id: 'M79', home: '1A', away: '3rd-3' },
  { id: 'M80', home: '1L', away: '3rd-4' },
  { id: 'M81', home: '1D', away: '3rd-5' },
  { id: 'M82', home: '1G', away: '3rd-6' },
  { id: 'M83', home: '2K', away: '2L' },
  { id: 'M84', home: '1H', away: '2J' },
  { id: 'M85', home: '1B', away: '3rd-7' },
  { id: 'M86', home: '1J', away: '2H' },
  { id: 'M87', home: '1K', away: '3rd-8' },
  { id: 'M88', home: '2D', away: '2G' },
];

// Later rounds reference the winners of earlier matches, following FIFA's
// published 2026 bracket progression (Match 89–102). Index order maps to match
// ids: R16 → M89…M96, QF → M97…M100, SF → M101…M102.
const R16_PAIRS: [string, string][] = [
  ['W74', 'W77'], // M89
  ['W73', 'W75'], // M90
  ['W76', 'W78'], // M91
  ['W79', 'W80'], // M92
  ['W83', 'W84'], // M93
  ['W81', 'W82'], // M94
  ['W86', 'W88'], // M95
  ['W85', 'W87'], // M96
];
const QF_PAIRS: [string, string][] = [
  ['W89', 'W90'], // M97
  ['W93', 'W94'], // M98
  ['W91', 'W92'], // M99
  ['W95', 'W96'], // M100
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
  ): Match => {
    // Real FIFA venue and kickoff, keyed by match number. Ids run K-M73…K-M102;
    // the final is K-M103 here but is FIFA match 104 (no third-place play-off).
    const number = knockoutMatchNumber(id);
    const venueId = venueIdForKnockoutMatch(number);
    const timing = KNOCKOUT_KICKOFFS[number];
    if (!timing) throw new Error(`No kickoff defined for knockout match ${id} (FIFA #${number})`);
    const [day, hour, minute] = timing;
    return {
      id,
      stage,
      kickoff: juneKickoff(day, hour, minute),
      venue: venueId ? venueById(venueId) : null,
      // Knockout ties aren't in the broadcast listings yet (teams undetermined),
      // so these resolve to "Broadcaster TBC".
      broadcaster: broadcasterForTeams(home, away),
      home,
      away,
      // Seeded so the bracket can advance winners as each round finishes; the
      // clock keeps it hidden (shown as upcoming) until the tie's kickoff.
      result: seededKnockoutScore(id),
      roundLabel,
    };
  };

  R32_TEMPLATES.forEach((t) => {
    out.push(make(`K-${t.id}`, 'r32', 'Round of 32', t.home, t.away));
  });

  R16_PAIRS.forEach(([h, a], i) => {
    out.push(make(`K-M${89 + i}`, 'r16', 'Round of 16', h, a));
  });
  QF_PAIRS.forEach(([h, a], i) => {
    out.push(make(`K-M${97 + i}`, 'qf', 'Quarter-final', h, a));
  });
  SF_PAIRS.forEach(([h, a], i) => {
    out.push(make(`K-M${101 + i}`, 'sf', 'Semi-final', h, a));
  });
  out.push(make('K-M103', 'final', 'Final', 'W101', 'W102'));

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

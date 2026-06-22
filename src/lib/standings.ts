import { GROUP_IDS } from '../data/teams';
import type { GroupId, Match, Standing, Team } from '../data/types';
import { byKickoff, effectiveStatus } from './matches';

interface Mutable {
  standing: Standing;
}

/**
 * Build the table for one group from completed matches only. Live and upcoming
 * games don't count toward the standings (they update at full-time).
 */
export function standingsForGroup(
  group: GroupId,
  matches: Match[],
  teams: Team[],
  nowMs: number,
): Standing[] {
  const groupTeams = teams.filter((t) => t.group === group);
  const table = new Map<string, Mutable>();
  for (const team of groupTeams) {
    table.set(team.code, {
      standing: {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
        rank: 0,
        qualified: false,
        clinchedRank: null,
      },
    });
  }

  const played = matches
    .filter(
      (m) =>
        m.stage === 'group' &&
        m.group === group &&
        m.result &&
        effectiveStatus(m, nowMs) === 'finished' &&
        table.has(m.home) &&
        table.has(m.away),
    )
    .sort(byKickoff);

  for (const m of played) {
    // The `played` filter above guarantees both teams are in the table and
    // m.result is set, but narrow explicitly to avoid non-null assertions.
    const home = table.get(m.home)?.standing;
    const away = table.get(m.away)?.standing;
    if (!home || !away || !m.result) continue;
    const { home: hg, away: ag } = m.result;

    home.played++;
    away.played++;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;

    if (hg > ag) {
      home.won++;
      home.points += 3;
      home.form.push('W');
      away.lost++;
      away.form.push('L');
    } else if (hg < ag) {
      away.won++;
      away.points += 3;
      away.form.push('W');
      home.lost++;
      home.form.push('L');
    } else {
      home.drawn++;
      home.points++;
      home.form.push('D');
      away.drawn++;
      away.points++;
      away.form.push('D');
    }
  }

  const standings = [...table.values()].map((m) => {
    m.standing.goalDifference = m.standing.goalsFor - m.standing.goalsAgainst;
    m.standing.form.reverse(); // most recent first
    return m.standing;
  });

  const ranked = rankGroup(standings, played);
  const worst = worstCaseRanks(group, matches, teams, nowMs);
  // Once the group is over the ranking is definitive (the full tiebreaker chain,
  // goal difference included, has run), so the top two have qualified outright in
  // their final order — even where the clinch maths, conservative on goal
  // difference, can't say so.
  const groupComplete = !matches.some(
    (m) => m.stage === 'group' && m.group === group && effectiveStatus(m, nowMs) !== 'finished',
  );
  // A guaranteed winner (worst-case rank 1) is unique. When one exists, any other
  // team guaranteed top-2 must be the runner-up (the winner always takes 1st).
  const hasGuaranteedWinner = ranked.some((s) => worst.get(s.team.code) === 1);
  ranked.forEach((s, i) => {
    s.rank = i + 1;
    const wr = worst.get(s.team.code) ?? ranked.length;
    s.qualified = wr <= 2 || (groupComplete && i < 2);
    let clinchedRank: 1 | 2 | null = null;
    if (wr === 1) clinchedRank = 1;
    else if (hasGuaranteedWinner && wr <= 2) clinchedRank = 2;
    if (groupComplete && i < 2) clinchedRank = (i + 1) as 1 | 2;
    s.clinchedRank = clinchedRank;
  });
  return ranked;
}

type Outcome = 'home' | 'draw' | 'away';

/** Award points for one match outcome to a running { code: points } tally. */
function applyOutcome(
  pts: Map<string, number>,
  home: string,
  away: string,
  outcome: Outcome,
): void {
  if (outcome === 'home') pts.set(home, (pts.get(home) ?? 0) + 3);
  else if (outcome === 'away') pts.set(away, (pts.get(away) ?? 0) + 3);
  else {
    pts.set(home, (pts.get(home) ?? 0) + 1);
    pts.set(away, (pts.get(away) ?? 0) + 1);
  }
}

/**
 * Each group team's worst-case finishing rank — the lowest position (largest
 * number) it can still end up in, over every way the unfinished group games
 * could go. A worst-case rank of 1 means the team has clinched the group; ≤ 2
 * means it has clinched a top-2 knockout berth.
 *
 * Exhaustively enumerates every outcome (home win / draw / away win) of the
 * unfinished group matches. EXACT on points and head-to-head points (the FIFA
 * 2026 primary tiebreaker, which is fully determined by win/draw/loss — no
 * scorelines needed). CONSERVATIVE on goal difference: a set still level on both
 * points and H2H points is treated as unresolved, so a GD-only guarantee is
 * intentionally not claimed early. That only ever delays a guarantee, never
 * asserts one wrongly.
 */
export function worstCaseRanks(
  group: GroupId,
  matches: Match[],
  teams: Team[],
  nowMs: number,
): Map<string, number> {
  const codes = teams.filter((t) => t.group === group).map((t) => t.code);
  const codeSet = new Set(codes);

  const groupMatches = matches.filter(
    (m) => m.stage === 'group' && m.group === group && codeSet.has(m.home) && codeSet.has(m.away),
  );

  const basePoints = new Map<string, number>(codes.map((c) => [c, 0]));
  const baseResults: { home: string; away: string; outcome: Outcome }[] = [];
  const remaining: { home: string; away: string }[] = [];

  for (const m of groupMatches) {
    if (m.result && effectiveStatus(m, nowMs) === 'finished') {
      const outcome: Outcome =
        m.result.home > m.result.away ? 'home' : m.result.home < m.result.away ? 'away' : 'draw';
      applyOutcome(basePoints, m.home, m.away, outcome);
      baseResults.push({ home: m.home, away: m.away, outcome });
    } else {
      remaining.push({ home: m.home, away: m.away });
    }
  }

  // Upper bound so the 3^n enumeration stays bounded for malformed feeds (a real
  // group of 4 has at most 6 matches). When we can't enumerate, claim nothing:
  // every team's worst case is last.
  if (remaining.length > 10) return new Map(codes.map((c) => [c, codes.length]));

  const worst = new Map<string, number>(codes.map((c) => [c, 1]));
  const scenarios = 3 ** remaining.length;
  const outcomes: Outcome[] = ['home', 'draw', 'away'];

  for (let s = 0; s < scenarios; s++) {
    const pts = new Map(basePoints);
    const results = [...baseResults];
    let n = s;
    for (const game of remaining) {
      const outcome = outcomes[n % 3];
      n = Math.floor(n / 3);
      applyOutcome(pts, game.home, game.away, outcome);
      results.push({ home: game.home, away: game.away, outcome });
    }

    for (const x of codes) {
      const pos = worstPosition(x, codes, pts, results);
      if (pos > (worst.get(x) ?? 1)) worst.set(x, pos);
    }
  }

  return worst;
}

/**
 * Finishing position of `x` in one fully-decided scenario, resolving teams
 * level on points by head-to-head points only. A rival on equal points *and*
 * equal head-to-head points is counted as ahead (conservative — we can't
 * separate it without goal difference).
 */
function worstPosition(
  x: string,
  codes: string[],
  pts: Map<string, number>,
  results: { home: string; away: string; outcome: Outcome }[],
): number {
  const px = pts.get(x) ?? 0;
  let above = 0;
  const tied: string[] = [];
  for (const y of codes) {
    if (y === x) continue;
    const py = pts.get(y) ?? 0;
    if (py > px) above++;
    else if (py === px) tied.push(y);
  }

  if (tied.length > 0) {
    const level = [x, ...tied];
    const levelSet = new Set(level);
    const h2h = new Map<string, number>(level.map((c) => [c, 0]));
    for (const r of results) {
      if (!levelSet.has(r.home) || !levelSet.has(r.away)) continue;
      applyOutcome(h2h, r.home, r.away, r.outcome);
    }
    const hx = h2h.get(x) ?? 0;
    for (const y of tied) {
      if ((h2h.get(y) ?? 0) >= hx) above++;
    }
  }

  return above + 1;
}

/**
 * Final within-group order using the FIFA 2026 tiebreakers. Teams are first
 * grouped by points; any teams level on points are then ranked by their
 * head-to-head record. New for 2026: head-to-head is applied *before* overall
 * goal difference, so two teams level on points are separated by their result
 * against each other first.
 */
function rankGroup(standings: Standing[], played: Match[]): Standing[] {
  const byPoints = [...standings].sort((a, b) => b.points - a.points);
  const result: Standing[] = [];
  let i = 0;
  while (i < byPoints.length) {
    let j = i + 1;
    while (j < byPoints.length && byPoints[j].points === byPoints[i].points) j++;
    const run = byPoints.slice(i, j);
    result.push(...(run.length > 1 ? rankTiedOnPoints(run, played) : run));
    i = j;
  }
  return result;
}

/**
 * Rank a set of teams that are level on points. Builds a head-to-head
 * mini-league from only the matches between the tied teams and orders by
 * H2H points → H2H goal difference → H2H goals. If that splits the set, each
 * still-tied subset is re-ranked by the same procedure (FIFA's "resume" rule).
 * When head-to-head can no longer separate a set, fall back to overall goal
 * difference, overall goals, then a deterministic team-name fallback (standing
 * in for fair-play points / drawing of lots, which we don't model).
 */
function rankTiedOnPoints(tied: Standing[], played: Match[]): Standing[] {
  const codes = new Set(tied.map((s) => s.team.code));
  const h2h = new Map<string, { points: number; gf: number; ga: number }>();
  for (const s of tied) h2h.set(s.team.code, { points: 0, gf: 0, ga: 0 });

  for (const m of played) {
    if (!m.result || !codes.has(m.home) || !codes.has(m.away)) continue;
    const home = h2h.get(m.home);
    const away = h2h.get(m.away);
    if (!home || !away) continue;
    const { home: hg, away: ag } = m.result;
    home.gf += hg;
    home.ga += ag;
    away.gf += ag;
    away.ga += hg;
    if (hg > ag) home.points += 3;
    else if (hg < ag) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }

  const h2hKey = (s: Standing) => {
    const r = h2h.get(s.team.code) ?? { points: 0, gf: 0, ga: 0 };
    return { points: r.points, gd: r.gf - r.ga, gf: r.gf };
  };

  const sorted = [...tied].sort((a, b) => {
    const ka = h2hKey(a);
    const kb = h2hKey(b);
    if (kb.points !== ka.points) return kb.points - ka.points;
    if (kb.gd !== ka.gd) return kb.gd - ka.gd;
    return kb.gf - ka.gf;
  });

  // Partition into runs of teams still equal on all three head-to-head keys.
  const runs: Standing[][] = [];
  let i = 0;
  while (i < sorted.length) {
    const ki = h2hKey(sorted[i]);
    let j = i + 1;
    while (j < sorted.length) {
      const kj = h2hKey(sorted[j]);
      if (kj.points !== ki.points || kj.gd !== ki.gd || kj.gf !== ki.gf) break;
      j++;
    }
    runs.push(sorted.slice(i, j));
    i = j;
  }

  // Head-to-head separated nothing → fall back to overall criteria, then name.
  if (runs.length === 1) {
    return [...tied].sort((a, b) => {
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.name.localeCompare(b.team.name);
    });
  }

  // Head-to-head separated the set → re-apply to each still-tied subset.
  const out: Standing[] = [];
  for (const run of runs) {
    out.push(...(run.length > 1 ? rankTiedOnPoints(run, played) : run));
  }
  return out;
}

/**
 * points → goal difference → goals for → team name (stable fallback).
 * Used to rank the third-placed teams across groups, who never played each
 * other, so head-to-head doesn't apply. Within a group, teams level on points
 * are ranked by head-to-head first — see rankGroup / rankTiedOnPoints.
 * Team name is a deterministic stand-in for fair-play / drawing of lots.
 */
export function compareStandings(a: Standing, b: Standing): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.team.name.localeCompare(b.team.name);
}

export interface AllStandings {
  byGroup: Record<GroupId, Standing[]>;
  /** The third-placed teams ranked across all groups; top 8 advance. */
  bestThirds: Standing[];
}

export function allStandings(matches: Match[], teams: Team[], nowMs: number): AllStandings {
  const byGroup = {} as Record<GroupId, Standing[]>;
  const thirds: Standing[] = [];
  for (const g of GROUP_IDS) {
    const table = standingsForGroup(g, matches, teams, nowMs);
    byGroup[g] = table;
    if (table[2]) thirds.push(table[2]);
  }
  thirds.sort(compareStandings);
  return { byGroup, bestThirds: thirds };
}

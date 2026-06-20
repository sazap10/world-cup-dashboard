import { KNOCKOUT_MATCHES } from '../data/schedule';
import { GROUP_IDS } from '../data/teams';
import type { GroupId, Match, Stage, Team } from '../data/types';
import { effectiveStatus } from './matches';
import { type AllStandings, allStandings } from './standings';

export interface ResolvedSlot {
  /** A real team once the slot is decided. */
  team: Team | null;
  /** Human label, e.g. "Winners Group A", "3rd-placed", "Winner M73". */
  label: string;
  /** True while the occupant is still a projection, not confirmed. */
  provisional: boolean;
}

export interface BracketMatch {
  match: Match;
  home: ResolvedSlot;
  away: ResolvedSlot;
}

export interface BracketRound {
  stage: Stage;
  label: string;
  matches: BracketMatch[];
}

const ROUND_ORDER: { stage: Stage; label: string }[] = [
  { stage: 'r32', label: 'Round of 32' },
  { stage: 'r16', label: 'Round of 16' },
  { stage: 'qf', label: 'Quarter-finals' },
  { stage: 'sf', label: 'Semi-finals' },
  { stage: 'final', label: 'Final' },
];

function groupMatches(matches: Match[], group: GroupId): Match[] {
  return matches.filter((m) => m.stage === 'group' && m.group === group);
}

function groupFinished(matches: Match[], group: GroupId, nowMs: number): boolean {
  const gm = groupMatches(matches, group);
  return gm.length > 0 && gm.every((m) => effectiveStatus(m, nowMs) === 'finished');
}

function allGroupsFinished(matches: Match[], nowMs: number): boolean {
  return GROUP_IDS.every((g) => groupFinished(matches, g, nowMs));
}

/**
 * Turn a slot occupant into a resolved team. Live data carries real team codes;
 * seed data carries structural labels ("1A", "3rd-3", "W73", "TBD").
 */
export function resolveSlot(
  occupant: string,
  teamsByCode: Record<string, Team>,
  matches: Match[],
  standings: AllStandings,
  nowMs: number,
  seen: Set<string> = new Set(),
): ResolvedSlot {
  // Live data: a real, decided team code.
  const decidedTeam = teamsByCode[occupant];
  if (decidedTeam) {
    return { team: decidedTeam, label: decidedTeam.name, provisional: false };
  }

  if (occupant === 'TBD') {
    return { team: null, label: 'To be decided', provisional: true };
  }

  // Group position, e.g. "1A" or "2C".
  const pos = /^([12])([A-L])$/.exec(occupant);
  if (pos) {
    const rank = Number(pos[1]);
    const group = pos[2] as GroupId;
    const team = standings.byGroup[group]?.[rank - 1]?.team ?? null;
    const decided = groupFinished(matches, group, nowMs) && rank <= 2;
    return {
      team,
      label: `${rank === 1 ? 'Winners' : 'Runners-up'} Group ${group}`,
      provisional: !decided,
    };
  }

  // Best third-placed teams, e.g. "3rd-1" .. "3rd-8".
  const third = /^3rd-([1-8])$/.exec(occupant);
  if (third) {
    const idx = Number(third[1]) - 1;
    const team = standings.bestThirds[idx]?.team ?? null;
    return { team, label: '3rd-placed qualifier', provisional: !allGroupsFinished(matches, nowMs) };
  }

  // Winner of an earlier match, e.g. "W73".
  const winner = /^W(\d+)$/.exec(occupant);
  if (winner) {
    return resolveWinner(winner[1], teamsByCode, matches, standings, nowMs, seen);
  }

  return { team: null, label: occupant, provisional: true };
}

/** Find a knockout match by its bracket number, e.g. 73 → seed id "K-M73". */
function knockoutMatchByNumber(matches: Match[], n: string): Match | undefined {
  return matches.find((m) => m.id === `K-M${n}`);
}

/**
 * Resolve a "Winner Match N" slot. Once match N has finished with a decisive
 * result, the winning side's own slot is resolved — recursively, since that side
 * may itself be a "Winner Match M" reference. Until the feeder finishes the slot
 * stays an unresolved projection: a knockout winner can't be read off the draw.
 */
function resolveWinner(
  n: string,
  teamsByCode: Record<string, Team>,
  matches: Match[],
  standings: AllStandings,
  nowMs: number,
  seen: Set<string>,
): ResolvedSlot {
  const fallback: ResolvedSlot = { team: null, label: `Winner Match ${n}`, provisional: true };
  // Guard against a malformed bracket that references itself in a cycle.
  if (seen.has(n)) return fallback;

  const feeder = knockoutMatchByNumber(matches, n);
  if (!feeder || effectiveStatus(feeder, nowMs) !== 'finished' || !feeder.result) return fallback;

  const { home, away } = feeder.result;
  // No extra-time/penalties in the data model, so a level score is undecided.
  if (home === away) return fallback;

  const winningOccupant = home > away ? feeder.home : feeder.away;
  const resolved = resolveSlot(
    winningOccupant,
    teamsByCode,
    matches,
    standings,
    nowMs,
    new Set(seen).add(n),
  );
  // Keep the "Winner Match N" wording while the winning side is itself unresolved.
  return resolved.team ? resolved : fallback;
}

/** Human-readable text for a slot label when no team is resolved. */
export function prettySlot(label: string): string {
  if (label === 'TBD') return 'To be decided';
  const pos = /^([12])([A-L])$/.exec(label);
  if (pos) return `${pos[1] === '1' ? 'Winners' : 'Runners-up'} ${pos[2]}`;
  if (/^3rd-[1-8]$/.exec(label)) return '3rd-placed';
  const w = /^W(\d+)$/.exec(label);
  if (w) return `Winner M${w[1]}`;
  return label;
}

const KNOCKOUT_STAGES: Stage[] = ['r32', 'r16', 'qf', 'sf', 'final'];

/**
 * The knockout matches that make up the bracket. Seed data already carries the
 * canonical ties (K-M ids, structural "1A"/"W73" labels, seeded results), so use
 * them directly. Live data has feed-shaped ties (real team codes or "TBD", with
 * no link telling us which match feeds which slot), so overlay the canonical
 * bracket and hydrate it from the live results — see hydrateLiveKnockout.
 */
function knockoutForBracket(
  matches: Match[],
  groupMatches: Match[],
  teamsByCode: Record<string, Team>,
  teams: Team[],
  nowMs: number,
): Match[] {
  const canonical = matches.filter((m) => m.stage !== 'group' && m.id.startsWith('K-M'));
  if (canonical.length > 0) return canonical;
  const liveKnockout = matches.filter((m) => m.stage !== 'group');
  return hydrateLiveKnockout(liveKnockout, groupMatches, teamsByCode, teams, nowMs);
}

/**
 * Project the live feed onto the canonical bracket. The feed never says which tie
 * feeds which slot, so we walk the canonical templates round by round: resolve
 * each tie's two slots to concrete teams, then find the live fixture with that
 * exact team pair and copy its result/kickoff/venue across. Because we go in
 * round order, a round's resolved winners feed the next — so the R16 onward fill
 * in as soon as their feeder ties finish, without waiting on the feed to assign
 * the next fixture's teams. A tie we can't yet resolve (or whose live fixture
 * isn't found, e.g. a mis-projected third-placed slot) stays unresolved rather
 * than risk showing the wrong team.
 */
function hydrateLiveKnockout(
  liveKnockout: Match[],
  groupMatches: Match[],
  teamsByCode: Record<string, Team>,
  teams: Team[],
  nowMs: number,
): Match[] {
  const hydrated: Match[] = KNOCKOUT_MATCHES.map((t) => ({
    ...t,
    // Clear the seed's placeholder result — only live results should fill these.
    result: null,
    statusOverride: 'upcoming',
    minuteOverride: null,
  }));
  const standings = allStandings(groupMatches, teams, nowMs);
  const all = [...groupMatches, ...hydrated];

  for (const stage of KNOCKOUT_STAGES) {
    for (const tie of hydrated) {
      if (tie.stage !== stage) continue;
      const home = resolveSlot(tie.home, teamsByCode, all, standings, nowMs);
      const away = resolveSlot(tie.away, teamsByCode, all, standings, nowMs);
      if (!home.team || !away.team) continue;
      const a = home.team.code;
      const b = away.team.code;
      const live = liveKnockout.find(
        (lm) =>
          lm.stage === stage &&
          ((lm.home === a && lm.away === b) || (lm.home === b && lm.away === a)),
      );
      if (!live) continue;
      // The live fixture may list the same pair in the opposite order; re-orient
      // its score to the canonical tie's home/away so the winner is read off the
      // right side.
      const flipped = live.home === b;
      tie.result =
        live.result && flipped ? { home: live.result.away, away: live.result.home } : live.result;
      tie.statusOverride = live.statusOverride;
      tie.minuteOverride = live.minuteOverride;
      tie.kickoff = live.kickoff;
      tie.broadcaster = live.broadcaster;
      if (live.venue) tie.venue = live.venue;
    }
  }
  return hydrated;
}

export function buildBracket(matches: Match[], teams: Team[], nowMs: number): BracketRound[] {
  const teamsByCode = Object.fromEntries(teams.map((t) => [t.code, t]));
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const knockout = knockoutForBracket(matches, groupMatches, teamsByCode, teams, nowMs);
  // Resolve slots against the canonical knockout set so "W73" references find
  // their feeder by its K-M id (live ids are numeric and wouldn't match).
  const all = [...groupMatches, ...knockout];
  const standings = allStandings(all, teams, nowMs);
  return ROUND_ORDER.map(({ stage, label }) => ({
    stage,
    label,
    matches: knockout
      .filter((m) => m.stage === stage)
      .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
      .map((match) => ({
        match,
        home: resolveSlot(match.home, teamsByCode, all, standings, nowMs),
        away: resolveSlot(match.away, teamsByCode, all, standings, nowMs),
      })),
  }));
}

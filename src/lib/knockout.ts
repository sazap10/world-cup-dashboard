import type { GroupId, Match, Stage, Team } from '../data/types';
import { GROUP_IDS } from '../data/teams';
import { allStandings, type AllStandings } from './standings';
import { statusOf } from './matches';

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
  return gm.length > 0 && gm.every((m) => statusOf(m, nowMs) === 'finished');
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
    return { team: null, label: `Winner Match ${winner[1]}`, provisional: true };
  }

  return { team: null, label: occupant, provisional: true };
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

export function buildBracket(matches: Match[], teams: Team[], nowMs: number): BracketRound[] {
  const teamsByCode = Object.fromEntries(teams.map((t) => [t.code, t]));
  const standings = allStandings(matches, teams, nowMs);
  return ROUND_ORDER.map(({ stage, label }) => ({
    stage,
    label,
    matches: matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
      .map((match) => ({
        match,
        home: resolveSlot(match.home, teamsByCode, matches, standings, nowMs),
        away: resolveSlot(match.away, teamsByCode, matches, standings, nowMs),
      })),
  }));
}

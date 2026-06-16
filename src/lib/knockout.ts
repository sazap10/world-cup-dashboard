import type { GroupId, Match, Stage, Team } from '../data/types';
import { KNOCKOUT_MATCHES, GROUP_MATCHES } from '../data/schedule';
import { allStandings, type AllStandings } from './standings';
import { statusOf } from './matches';

export interface ResolvedSlot {
  /** A real team once the slot is decided. */
  team: Team | null;
  /** Human label, e.g. "Winners Group A", "3rd C/E/F", "Winner M73". */
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

function groupFinished(group: GroupId, nowMs: number): boolean {
  return GROUP_MATCHES.filter((m) => m.group === group).every(
    (m) => statusOf(m, nowMs) === 'finished',
  );
}

function allGroupsFinished(nowMs: number): boolean {
  return (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as GroupId[]).every((g) =>
    groupFinished(g, nowMs),
  );
}

/** Turn a slot label ("1A", "2C", "3rd-3", "W73") into a resolved occupant. */
export function resolveSlot(label: string, standings: AllStandings, nowMs: number): ResolvedSlot {
  // Group position, e.g. "1A" or "2C".
  const pos = /^([12])([A-L])$/.exec(label);
  if (pos) {
    const rank = Number(pos[1]);
    const group = pos[2] as GroupId;
    const table = standings.byGroup[group];
    const team = table?.[rank - 1]?.team ?? null;
    const decided = groupFinished(group, nowMs) && rank <= 2;
    return {
      team,
      label: `${rank === 1 ? 'Winners' : 'Runners-up'} Group ${group}`,
      provisional: !decided,
    };
  }

  // Best third-placed teams, e.g. "3rd-1" .. "3rd-8".
  const third = /^3rd-([1-8])$/.exec(label);
  if (third) {
    const idx = Number(third[1]) - 1;
    const team = standings.bestThirds[idx]?.team ?? null;
    return {
      team,
      label: '3rd-placed qualifier',
      provisional: !allGroupsFinished(nowMs),
    };
  }

  // Winner of an earlier match, e.g. "W73".
  const winner = /^W(\d+)$/.exec(label);
  if (winner) {
    return { team: null, label: `Winner Match ${winner[1]}`, provisional: true };
  }

  return { team: null, label, provisional: true };
}

/** Human-readable text for a slot label when no team is resolved. */
export function prettySlot(label: string): string {
  const pos = /^([12])([A-L])$/.exec(label);
  if (pos) return `${pos[1] === '1' ? 'Winners' : 'Runners-up'} ${pos[2]}`;
  if (/^3rd-[1-8]$/.exec(label)) return '3rd-placed';
  const w = /^W(\d+)$/.exec(label);
  if (w) return `Winner M${w[1]}`;
  return label;
}

export function buildBracket(nowMs: number): BracketRound[] {
  const standings = allStandings(nowMs);
  return ROUND_ORDER.map(({ stage, label }) => ({
    stage,
    label,
    matches: KNOCKOUT_MATCHES.filter((m) => m.stage === stage).map((match) => ({
      match,
      home: resolveSlot(match.home, standings, nowMs),
      away: resolveSlot(match.away, standings, nowMs),
    })),
  }));
}

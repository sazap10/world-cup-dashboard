import { describe, expect, it } from 'vitest';
import { MATCHES } from '../data/schedule';
import { TEAMS as ALL_TEAMS } from '../data/teams';
import type { GroupId, Match, Score, Team } from '../data/types';
import { buildBracket, resolveSlot } from './knockout';
import { allStandings } from './standings';

// Fixed "now"; past-dated fixtures resolve to 'finished', future-dated ones stay
// upcoming, so a group counts as decided only when all its games are in the past.
const NOW = Date.parse('2026-07-01T00:00:00Z');
const PAST = '2026-06-15T12:00:00Z';
const FUTURE = '2026-07-10T12:00:00Z';

const stub = {
  venue: null,
  broadcaster: { id: 'b', channel: 'BBC One', streaming: 'iPlayer', watchUrl: 'https://x' },
} as const;

let seq = 0;
function match(
  group: GroupId,
  home: string,
  away: string,
  score: Score | null,
  kickoff: string,
): Match {
  seq += 1;
  return {
    id: `m${seq}`,
    stage: 'group',
    group,
    kickoff,
    home,
    away,
    result: score,
    roundLabel: 'Group',
    ...stub,
  };
}

function team(code: string, name: string, group: GroupId): Team {
  return { code, name, group };
}

const TEAMS = [
  team('TA', 'Alpha', 'A'),
  team('TB', 'Bravo', 'A'),
  team('TC', 'Charlie', 'A'),
  team('TD', 'Delta', 'A'),
];
const byCode = Object.fromEntries(TEAMS.map((t) => [t.code, t]));

// A clear group A table: TA wins it, TB runners-up, TC third, TD bottom.
function finishedGroupA(): Match[] {
  return [
    match('A', 'TA', 'TB', { home: 1, away: 0 }, PAST),
    match('A', 'TA', 'TC', { home: 1, away: 0 }, PAST),
    match('A', 'TA', 'TD', { home: 1, away: 0 }, PAST),
    match('A', 'TB', 'TC', { home: 1, away: 0 }, PAST),
    match('A', 'TB', 'TD', { home: 1, away: 0 }, PAST),
    match('A', 'TC', 'TD', { home: 1, away: 0 }, PAST),
  ];
}

describe('resolveSlot only names guaranteed qualifiers', () => {
  it('names the group winner and runner-up once the group has finished', () => {
    const matches = finishedGroupA();
    const standings = allStandings(matches, TEAMS, NOW);

    const first = resolveSlot('1A', byCode, matches, standings, NOW);
    const second = resolveSlot('2A', byCode, matches, standings, NOW);

    expect(first.team?.code).toBe('TA');
    expect(first.provisional).toBe(false);
    expect(second.team?.code).toBe('TB');
    expect(second.provisional).toBe(false);
  });

  it('shows a placeholder (no team) while the group is still wide open', () => {
    // Only one game played: TA leads, but with two rounds to go nothing is
    // clinched, so the slot must show its label rather than a projected team.
    const matches = [
      match('A', 'TA', 'TB', { home: 1, away: 0 }, PAST),
      match('A', 'TC', 'TD', null, FUTURE),
      match('A', 'TA', 'TC', null, FUTURE),
      match('A', 'TA', 'TD', null, FUTURE),
      match('A', 'TB', 'TC', null, FUTURE),
      match('A', 'TB', 'TD', null, FUTURE),
    ];
    const standings = allStandings(matches, TEAMS, NOW);

    const first = resolveSlot('1A', byCode, matches, standings, NOW);
    expect(first.team).toBeNull();
    expect(first.provisional).toBe(true);
    expect(first.label).toBe('Winners Group A');
  });

  it('names a group winner that has clinched 1st before the group has finished', () => {
    // TA beat TB and TC; TB and TC each beat TD. Two games remain (TA-TD, TB-TC),
    // so the group isn't over — but the only teams that can reach TA's points are
    // TB/TC, both already beaten by TA head-to-head. TA has clinched 1st, so the
    // "1A" slot is named while "2A" stays a placeholder (the runner-up is open).
    const matches = [
      match('A', 'TA', 'TB', { home: 1, away: 0 }, PAST),
      match('A', 'TA', 'TC', { home: 1, away: 0 }, PAST),
      match('A', 'TB', 'TD', { home: 1, away: 0 }, PAST),
      match('A', 'TC', 'TD', { home: 1, away: 0 }, PAST),
      match('A', 'TA', 'TD', null, FUTURE),
      match('A', 'TB', 'TC', null, FUTURE),
    ];
    const standings = allStandings(matches, TEAMS, NOW);

    const first = resolveSlot('1A', byCode, matches, standings, NOW);
    const second = resolveSlot('2A', byCode, matches, standings, NOW);

    expect(first.team?.code).toBe('TA');
    expect(first.provisional).toBe(false);
    expect(second.team).toBeNull();
    expect(second.provisional).toBe(true);
  });

  it('orders each round by bracket position, not kickoff time', () => {
    // Pre-tournament: nothing is decided, so this checks the structural layout.
    const rounds = buildBracket(MATCHES, ALL_TEAMS, Date.parse('2026-06-01T00:00:00Z'));
    const ids = (stage: string) =>
      rounds.find((r) => r.stage === stage)?.matches.map((t) => t.match.id) ?? [];

    // Each tie must sit next to the two it feeds: the canonical single-elimination
    // layout walking out from the final (FIFA 2026 bracket progression).
    expect(ids('r32')).toEqual(
      [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87].map((n) => `K-M${n}`),
    );
    expect(ids('r16')).toEqual([89, 90, 93, 94, 91, 92, 95, 96].map((n) => `K-M${n}`));
    expect(ids('qf')).toEqual([97, 98, 99, 100].map((n) => `K-M${n}`));
    expect(ids('sf')).toEqual(['K-M101', 'K-M102']);
    expect(ids('final')).toEqual(['K-M103']);
  });

  it('does not name a best-third qualifier until every group has finished', () => {
    // Only group A is decided here; the other groups have no matches, so the
    // cross-group third-placed ranking isn't guaranteed yet.
    const matches = finishedGroupA();
    const standings = allStandings(matches, TEAMS, NOW);

    const third = resolveSlot('3rd-1', byCode, matches, standings, NOW);
    expect(third.team).toBeNull();
    expect(third.provisional).toBe(true);
    expect(third.label).toBe('3rd-placed qualifier');
  });
});

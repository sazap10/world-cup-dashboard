import { describe, expect, it } from 'vitest';
import type { GroupId, Match, Score, Standing, Team } from '../data/types';
import { compareStandings, standingsForGroup } from './standings';

// Fixed "now"; every fixture kicks off well before this so effectiveStatus
// (clock-derived, no statusOverride) resolves to 'finished' and the result counts.
const NOW = Date.parse('2026-07-01T00:00:00Z');
const KICKOFF = '2026-06-15T12:00:00Z';

const stub = {
  venue: null,
  broadcaster: { id: 'b', channel: 'BBC One', streaming: 'iPlayer', watchUrl: 'https://x' },
} as const;

let matchSeq = 0;
function match(group: GroupId, home: string, away: string, hg: number, ag: number): Match {
  matchSeq += 1;
  return {
    id: `m${matchSeq}`,
    stage: 'group',
    group,
    kickoff: KICKOFF,
    home,
    away,
    result: { home: hg, away: ag } satisfies Score,
    roundLabel: 'Group',
    ...stub,
  };
}

/** An unplayed fixture: kicks off after NOW, so it counts as a remaining game. */
function upcoming(group: GroupId, home: string, away: string): Match {
  matchSeq += 1;
  return {
    id: `m${matchSeq}`,
    stage: 'group',
    group,
    kickoff: '2026-07-10T12:00:00Z', // after NOW
    home,
    away,
    result: null,
    roundLabel: 'Group',
    ...stub,
  };
}

function team(code: string, name: string, group: GroupId): Team {
  return { code, name, group };
}

/** Order of team codes in the resulting table. */
function order(table: Standing[]): string[] {
  return table.map((s) => s.team.code);
}

function byCode(table: Standing[], code: string): Standing {
  const found = table.find((s) => s.team.code === code);
  if (!found) throw new Error(`no standing for ${code}`);
  return found;
}

describe('standingsForGroup head-to-head tiebreakers (FIFA 2026)', () => {
  it('ranks teams level on points by head-to-head before overall goal difference', () => {
    // TA and TB both finish on 6 points. TB has the far better overall goal
    // difference (+5 vs +1), but TA beat TB head-to-head, so under the 2026
    // rules TA ranks above TB. The old points→GD order would have put TB first.
    // TD and TC are level on 3 points and split by their head-to-head too.
    const teams = [
      team('TA', 'Alpha', 'A'),
      team('TB', 'Bravo', 'A'),
      team('TC', 'Charlie', 'A'),
      team('TD', 'Delta', 'A'),
    ];
    const matches = [
      match('A', 'TA', 'TB', 1, 0), // TA beats TB (H2H)
      match('A', 'TA', 'TC', 0, 1), // TC beats TA
      match('A', 'TA', 'TD', 1, 0), // TA beats TD
      match('A', 'TB', 'TC', 3, 0), // TB +GD
      match('A', 'TB', 'TD', 3, 0), // TB +GD
      match('A', 'TC', 'TD', 0, 2), // TD beats TC (H2H)
    ];

    const table = standingsForGroup('A', matches, teams, NOW);
    // Sanity: TB really does have the better overall GD despite ranking lower.
    const ta = byCode(table, 'TA');
    const tb = byCode(table, 'TB');
    expect(ta.points).toBe(6);
    expect(tb.points).toBe(6);
    expect(tb.goalDifference).toBeGreaterThan(ta.goalDifference);

    expect(order(table)).toEqual(['TA', 'TB', 'TD', 'TC']);
  });

  it('resolves a three-way tie via the head-to-head mini-table (H2H goal difference)', () => {
    // TA, TB, TC each beat TD and form a 3-way cycle on H2H points (all 3),
    // broken by H2H goal difference: TA +2, TC 0, TB -2.
    const teams = [
      team('TA', 'Alpha', 'B'),
      team('TB', 'Bravo', 'B'),
      team('TC', 'Charlie', 'B'),
      team('TD', 'Delta', 'B'),
    ];
    const matches = [
      match('B', 'TA', 'TB', 3, 0), // TA beats TB by 3
      match('B', 'TB', 'TC', 1, 0), // TB beats TC by 1
      match('B', 'TC', 'TA', 1, 0), // TC beats TA by 1
      match('B', 'TA', 'TD', 1, 0),
      match('B', 'TB', 'TD', 1, 0),
      match('B', 'TC', 'TD', 1, 0),
    ];

    const table = standingsForGroup('B', matches, teams, NOW);
    expect(table.slice(0, 3).every((s) => s.points === 6)).toBe(true);
    expect(order(table)).toEqual(['TA', 'TC', 'TB', 'TD']);
  });

  it('applies the resume rule: re-runs head-to-head on a still-tied subset', () => {
    // All four teams finish level on 4 points. Head-to-head (here equal to the
    // full table) splits them by goal difference into {P,Q} (+1) and {R,S} (-1).
    // Within each pair the teams are equal on overall GD *and* goals, so the
    // procedure re-runs head-to-head on just that pair — the direct result
    // decides. Names are chosen so the H2H winner sorts *after* the loser
    // alphabetically, proving the order isn't the name fallback.
    const teams = [
      team('ZP', 'Zenith', 'C'),
      team('AQ', 'Apex', 'C'),
      team('YR', 'Yonder', 'C'),
      team('BS', 'Basin', 'C'),
    ];
    const matches = [
      match('C', 'ZP', 'AQ', 2, 0), // Zenith beats Apex (high pair)
      match('C', 'YR', 'BS', 2, 0), // Yonder beats Basin (low pair)
      match('C', 'ZP', 'YR', 0, 0),
      match('C', 'ZP', 'BS', 1, 2), // Basin beats Zenith
      match('C', 'AQ', 'BS', 0, 0),
      match('C', 'AQ', 'YR', 3, 0), // Apex beats Yonder
    ];

    const table = standingsForGroup('C', matches, teams, NOW);
    expect(table.every((s) => s.points === 4)).toBe(true);
    // High pair (GD +1, GF 3): Zenith beat Apex. Low pair (GD -1, GF 2): Yonder beat Basin.
    expect(order(table)).toEqual(['ZP', 'AQ', 'YR', 'BS']);
  });

  it('falls back to overall goal difference when head-to-head cannot separate', () => {
    // U, V, W form a symmetric 3-way cycle (each beats the next 1-0), so their
    // head-to-head is identical. They beat X by different margins, so overall
    // goal difference breaks the tie: U +5, V +3, W +1.
    const teams = [
      team('U', 'Uniform', 'D'),
      team('V', 'Victor', 'D'),
      team('W', 'Whiskey', 'D'),
      team('X', 'Xray', 'D'),
    ];
    const matches = [
      match('D', 'U', 'V', 1, 0),
      match('D', 'V', 'W', 1, 0),
      match('D', 'W', 'U', 1, 0),
      match('D', 'U', 'X', 5, 0),
      match('D', 'V', 'X', 3, 0),
      match('D', 'W', 'X', 1, 0),
    ];

    const table = standingsForGroup('D', matches, teams, NOW);
    expect(table.slice(0, 3).every((s) => s.points === 6)).toBe(true);
    expect(order(table)).toEqual(['U', 'V', 'W', 'X']);
  });

  it('uses the deterministic name fallback for a total tie', () => {
    // A goalless draw leaves both teams identical on every metric, including a
    // level head-to-head, so the alphabetical fallback decides.
    const teams = [team('NEC', 'Nectar', 'E'), team('MAN', 'Mango', 'E')];
    const matches = [match('E', 'NEC', 'MAN', 0, 0)];

    const table = standingsForGroup('E', matches, teams, NOW);
    expect(order(table)).toEqual(['MAN', 'NEC']); // Mango < Nectar
  });

  it('orders a clear, non-tied table by points then goal difference', () => {
    const teams = [team('P1', 'One', 'F'), team('P2', 'Two', 'F'), team('P3', 'Three', 'F')];
    const matches = [
      match('F', 'P1', 'P2', 3, 0),
      match('F', 'P1', 'P3', 2, 0),
      match('F', 'P2', 'P3', 1, 0),
    ];

    const table = standingsForGroup('F', matches, teams, NOW);
    expect(order(table)).toEqual(['P1', 'P2', 'P3']);
    expect(table.map((s) => s.rank)).toEqual([1, 2, 3]);
  });
});

describe('clinching a knockout place (qualified flag)', () => {
  function qualified(table: Standing[]): string[] {
    return table
      .filter((s) => s.qualified)
      .map((s) => s.team.code)
      .sort();
  }

  it('marks the two clear leaders as qualified with a game to spare', () => {
    // TA and TB win both their games; TC and TD have lost twice and can each
    // reach only 3 points, below TA/TB's secured 6. Only TA-TB and TC-TD remain.
    const teams = [
      team('TA', 'Alpha', 'G'),
      team('TB', 'Bravo', 'G'),
      team('TC', 'Charlie', 'G'),
      team('TD', 'Delta', 'G'),
    ];
    const matches = [
      match('G', 'TA', 'TC', 1, 0),
      match('G', 'TA', 'TD', 1, 0),
      match('G', 'TB', 'TC', 1, 0),
      match('G', 'TB', 'TD', 1, 0),
      upcoming('G', 'TA', 'TB'),
      upcoming('G', 'TC', 'TD'),
    ];

    const table = standingsForGroup('G', matches, teams, NOW);
    expect(qualified(table)).toEqual(['TA', 'TB']);
  });

  it('does not mark a leader still catchable by two or more teams', () => {
    // One round played: TA beat TB. With two games each still to play, TB, TC
    // and TD can all out-point TA, so nothing is clinched yet.
    const teams = [
      team('TA', 'Alpha', 'H'),
      team('TB', 'Bravo', 'H'),
      team('TC', 'Charlie', 'H'),
      team('TD', 'Delta', 'H'),
    ];
    const matches = [
      match('H', 'TA', 'TB', 1, 0),
      upcoming('H', 'TC', 'TD'),
      upcoming('H', 'TA', 'TC'),
      upcoming('H', 'TA', 'TD'),
      upcoming('H', 'TB', 'TC'),
      upcoming('H', 'TB', 'TD'),
    ];

    const table = standingsForGroup('H', matches, teams, NOW);
    expect(qualified(table)).toEqual([]);
  });

  it('clinches via head-to-head when a rival can only draw level on points', () => {
    // TA has 6 points (beat TB and TC). The only teams that can still reach 6 are
    // TB and TC — but they play each other, so at most one gets there, and TA has
    // beaten both head-to-head. A points-only check would call TA catchable; the
    // head-to-head-aware check correctly clinches it. (TB/TC are NOT clinched:
    // whichever wins their game, TA finishes above on H2H and the loser drops.)
    const teams = [
      team('TA', 'Alpha', 'I'),
      team('TB', 'Bravo', 'I'),
      team('TC', 'Charlie', 'I'),
      team('TD', 'Delta', 'I'),
    ];
    const matches = [
      match('I', 'TA', 'TB', 1, 0), // TA beats TB (H2H)
      match('I', 'TA', 'TC', 1, 0), // TA beats TC (H2H)
      match('I', 'TB', 'TD', 1, 0), // TB beats TD
      match('I', 'TC', 'TD', 1, 0), // TC beats TD
      upcoming('I', 'TA', 'TD'),
      upcoming('I', 'TB', 'TC'),
    ];

    const table = standingsForGroup('I', matches, teams, NOW);
    expect(qualified(table)).toEqual(['TA']);
    // TA has also clinched *first*: the only teams that can reach 6 are TB/TC,
    // and TA owns the head-to-head over both, so it can't be caught for top spot.
    expect(byCode(table, 'TA').clinchedRank).toBe(1);
    expect(byCode(table, 'TB').clinchedRank).toBeNull();
  });

  it('clinches an exact runner-up slot once the winner is locked', () => {
    // TA has won all three (9 pts, done). TB has beaten TC and TD and lost only to
    // TA (6 pts, done). Only TC-TD is left and neither can pass TB, so TA is the
    // guaranteed winner and TB the guaranteed runner-up — before the group ends.
    const teams = [
      team('TA', 'Alpha', 'K'),
      team('TB', 'Bravo', 'K'),
      team('TC', 'Charlie', 'K'),
      team('TD', 'Delta', 'K'),
    ];
    const matches = [
      match('K', 'TA', 'TB', 1, 0),
      match('K', 'TA', 'TC', 1, 0),
      match('K', 'TA', 'TD', 1, 0),
      match('K', 'TB', 'TC', 1, 0),
      match('K', 'TB', 'TD', 1, 0),
      upcoming('K', 'TC', 'TD'),
    ];

    const table = standingsForGroup('K', matches, teams, NOW);
    expect(byCode(table, 'TA').clinchedRank).toBe(1);
    expect(byCode(table, 'TB').clinchedRank).toBe(2);
    expect(byCode(table, 'TC').clinchedRank).toBeNull();
    expect(byCode(table, 'TD').clinchedRank).toBeNull();
  });

  it('treats a group with no fixtures as undecided, not complete', () => {
    // A partial/empty dataset has no games for the group. It must not be mistaken
    // for a finished group — otherwise the name-sorted "top two" would be marked
    // qualified and handed clinchedRank 1/2 off arbitrary ordering.
    const teams = [
      team('TA', 'Alpha', 'A'),
      team('TB', 'Bravo', 'A'),
      team('TC', 'Charlie', 'A'),
      team('TD', 'Delta', 'A'),
    ];

    const table = standingsForGroup('A', [], teams, NOW);
    expect(table.every((s) => s.qualified === false)).toBe(true);
    expect(table.every((s) => s.clinchedRank === null)).toBe(true);
  });

  it('does not lock a winner while two teams can still finish top on points', () => {
    // After one round TA leads, but with two games to go several teams can still
    // top the group, so no exact placing is guaranteed yet.
    const teams = [
      team('TA', 'Alpha', 'L'),
      team('TB', 'Bravo', 'L'),
      team('TC', 'Charlie', 'L'),
      team('TD', 'Delta', 'L'),
    ];
    const matches = [
      match('L', 'TA', 'TB', 1, 0),
      upcoming('L', 'TC', 'TD'),
      upcoming('L', 'TA', 'TC'),
      upcoming('L', 'TA', 'TD'),
      upcoming('L', 'TB', 'TC'),
      upcoming('L', 'TB', 'TD'),
    ];

    const table = standingsForGroup('L', matches, teams, NOW);
    expect(table.every((s) => s.clinchedRank === null)).toBe(true);
  });

  it('marks the actual top two once the group is complete, even split by goal difference', () => {
    // TA wins the group. TB and TC finish level on 4 points with an identical
    // head-to-head (1-1 draw), separated only by overall goal difference (TB +2,
    // TC 0). The clinch maths is conservative on GD, but a finished group has a
    // definitive order, so the top two (TA, TB) are marked qualified.
    const teams = [
      team('TA', 'Alpha', 'J'),
      team('TB', 'Bravo', 'J'),
      team('TC', 'Charlie', 'J'),
      team('TD', 'Delta', 'J'),
    ];
    const matches = [
      match('J', 'TA', 'TB', 1, 0),
      match('J', 'TA', 'TC', 1, 0),
      match('J', 'TA', 'TD', 1, 0),
      match('J', 'TB', 'TC', 1, 1), // level head-to-head
      match('J', 'TB', 'TD', 3, 0), // TB better overall GD
      match('J', 'TC', 'TD', 1, 0),
    ];

    const table = standingsForGroup('J', matches, teams, NOW);
    expect(order(table)).toEqual(['TA', 'TB', 'TC', 'TD']);
    expect(qualified(table)).toEqual(['TA', 'TB']);
  });
});

describe('compareStandings (cross-group thirds ranking, unchanged)', () => {
  const base: Omit<Standing, 'team' | 'points' | 'goalDifference' | 'goalsFor'> = {
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsAgainst: 0,
    form: [],
    rank: 0,
    qualified: false,
    clinchedRank: null,
  };
  const s = (code: string, points: number, gd: number, gf: number): Standing => ({
    ...base,
    team: { code, name: code },
    points,
    goalDifference: gd,
    goalsFor: gf,
  });

  it('sorts by points, then goal difference, then goals for, then name', () => {
    const a = s('AAA', 6, 2, 5);
    const b = s('BBB', 6, 2, 5); // identical to a except name
    const c = s('CCC', 6, 3, 5); // better GD
    const d = s('DDD', 4, 9, 9); // fewer points

    const sorted = [d, b, c, a].sort(compareStandings).map((x) => x.team.code);
    expect(sorted).toEqual(['CCC', 'AAA', 'BBB', 'DDD']);
  });
});

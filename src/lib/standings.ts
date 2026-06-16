import type { GroupId, Match, Standing, Team } from '../data/types';
import { GROUP_IDS } from '../data/teams';
import { byKickoff, statusOf } from './matches';

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
      },
    });
  }

  const played = matches
    .filter(
      (m) =>
        m.stage === 'group' &&
        m.group === group &&
        m.result &&
        statusOf(m, nowMs) === 'finished' &&
        table.has(m.home) &&
        table.has(m.away),
    )
    .sort(byKickoff);

  for (const m of played) {
    const home = table.get(m.home)!.standing;
    const away = table.get(m.away)!.standing;
    const { home: hg, away: ag } = m.result!;

    home.played++; away.played++;
    home.goalsFor += hg; home.goalsAgainst += ag;
    away.goalsFor += ag; away.goalsAgainst += hg;

    if (hg > ag) {
      home.won++; home.points += 3; home.form.push('W');
      away.lost++; away.form.push('L');
    } else if (hg < ag) {
      away.won++; away.points += 3; away.form.push('W');
      home.lost++; home.form.push('L');
    } else {
      home.drawn++; home.points++; home.form.push('D');
      away.drawn++; away.points++; away.form.push('D');
    }
  }

  const standings = [...table.values()].map((m) => {
    m.standing.goalDifference = m.standing.goalsFor - m.standing.goalsAgainst;
    m.standing.form.reverse(); // most recent first
    return m.standing;
  });

  standings.sort(compareStandings);
  standings.forEach((s, i) => (s.rank = i + 1));
  return standings;
}

/** points → goal difference → goals for → team name (stable fallback). */
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

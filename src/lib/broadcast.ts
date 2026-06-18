import { BROADCASTER_TBC, BROADCASTERS_BY_ID } from '../data/broadcasters';
import type { Broadcaster, GroupId } from '../data/types';

// UK free-to-air broadcast listings for the FIFA World Cup 2026, transcribed
// from live-footballontv.com. That page lists only upcoming fixtures, so this
// covers roughly the group-stage games still to come; anything not listed here
// (games already played, the last round of groups, the knockout bracket) falls
// back to a "Broadcaster TBC" placeholder via broadcasterForTeams().
//
// Kickoffs are converted from UK local time (BST, UTC+1 in June) to UTC.
// `channel` is a broadcaster id from src/data/broadcasters.ts.
export interface RealFixture {
  group: GroupId;
  /** Listed home/away order from the source. */
  home: string;
  away: string;
  /** ISO 8601 UTC kickoff. */
  kickoff: string;
  /** Broadcaster id (see BROADCASTERS_BY_ID). */
  channel: string;
}

export const REAL_GROUP_FIXTURES: RealFixture[] = [
  { group: 'L', home: 'GHA', away: 'PAN', kickoff: '2026-06-17T23:00:00Z', channel: 'itv1' },
  { group: 'K', home: 'UZB', away: 'COL', kickoff: '2026-06-18T02:00:00Z', channel: 'bbc-one' },
  { group: 'A', home: 'CZE', away: 'RSA', kickoff: '2026-06-18T16:00:00Z', channel: 'bbc-one' },
  { group: 'B', home: 'SUI', away: 'BIH', kickoff: '2026-06-18T19:00:00Z', channel: 'itv1' },
  { group: 'B', home: 'CAN', away: 'QAT', kickoff: '2026-06-18T22:00:00Z', channel: 'itv1' },
  { group: 'A', home: 'MEX', away: 'KOR', kickoff: '2026-06-19T01:00:00Z', channel: 'bbc-two' },
  { group: 'D', home: 'USA', away: 'AUS', kickoff: '2026-06-19T19:00:00Z', channel: 'bbc-one' },
  { group: 'C', home: 'SCO', away: 'MAR', kickoff: '2026-06-19T22:00:00Z', channel: 'itv1' },
  { group: 'C', home: 'BRA', away: 'HAI', kickoff: '2026-06-20T01:00:00Z', channel: 'itv1' },
  { group: 'D', home: 'TUR', away: 'PAR', kickoff: '2026-06-20T04:00:00Z', channel: 'itv1' },
  { group: 'F', home: 'NED', away: 'SWE', kickoff: '2026-06-20T17:00:00Z', channel: 'bbc-one' },
  { group: 'E', home: 'GER', away: 'CIV', kickoff: '2026-06-20T20:00:00Z', channel: 'itv1' },
  { group: 'E', home: 'ECU', away: 'CUW', kickoff: '2026-06-21T00:00:00Z', channel: 'bbc-one' },
  { group: 'F', home: 'TUN', away: 'JPN', kickoff: '2026-06-21T04:00:00Z', channel: 'bbc-one' },
  { group: 'H', home: 'ESP', away: 'KSA', kickoff: '2026-06-21T16:00:00Z', channel: 'bbc-one' },
  { group: 'G', home: 'BEL', away: 'IRN', kickoff: '2026-06-21T19:00:00Z', channel: 'itv1' },
  { group: 'H', home: 'URU', away: 'CPV', kickoff: '2026-06-21T22:00:00Z', channel: 'bbc-one' },
  { group: 'G', home: 'NZL', away: 'EGY', kickoff: '2026-06-22T01:00:00Z', channel: 'itv1' },
  { group: 'J', home: 'ARG', away: 'AUT', kickoff: '2026-06-22T17:00:00Z', channel: 'bbc-one' },
  { group: 'I', home: 'FRA', away: 'IRQ', kickoff: '2026-06-22T21:00:00Z', channel: 'bbc-one' },
  { group: 'I', home: 'NOR', away: 'SEN', kickoff: '2026-06-23T00:00:00Z', channel: 'itv1' },
  { group: 'J', home: 'JOR', away: 'ALG', kickoff: '2026-06-23T03:00:00Z', channel: 'itv1' },
  { group: 'K', home: 'POR', away: 'UZB', kickoff: '2026-06-23T17:00:00Z', channel: 'itv1' },
  { group: 'L', home: 'ENG', away: 'GHA', kickoff: '2026-06-23T20:00:00Z', channel: 'bbc-one' },
  { group: 'L', home: 'PAN', away: 'CRO', kickoff: '2026-06-23T23:00:00Z', channel: 'bbc-one' },
  { group: 'K', home: 'COL', away: 'COD', kickoff: '2026-06-24T02:00:00Z', channel: 'itv1' },
  { group: 'B', home: 'BIH', away: 'QAT', kickoff: '2026-06-24T19:00:00Z', channel: 'itv4' },
  { group: 'B', home: 'SUI', away: 'CAN', kickoff: '2026-06-24T19:00:00Z', channel: 'itv1' },
  { group: 'C', home: 'MAR', away: 'HAI', kickoff: '2026-06-24T22:00:00Z', channel: 'bbc-two' },
  { group: 'C', home: 'SCO', away: 'BRA', kickoff: '2026-06-24T22:00:00Z', channel: 'bbc-one' },
  { group: 'A', home: 'CZE', away: 'MEX', kickoff: '2026-06-25T01:00:00Z', channel: 'bbc-one' },
  { group: 'A', home: 'RSA', away: 'KOR', kickoff: '2026-06-25T01:00:00Z', channel: 'bbc-two' },
  { group: 'E', home: 'CUW', away: 'CIV', kickoff: '2026-06-25T20:00:00Z', channel: 'bbc-two' },
  { group: 'E', home: 'ECU', away: 'GER', kickoff: '2026-06-25T20:00:00Z', channel: 'bbc-one' },
  { group: 'F', home: 'JPN', away: 'SWE', kickoff: '2026-06-25T23:00:00Z', channel: 'bbc-two' },
  { group: 'F', home: 'TUN', away: 'NED', kickoff: '2026-06-25T23:00:00Z', channel: 'bbc-one' },
  { group: 'D', home: 'PAR', away: 'AUS', kickoff: '2026-06-26T02:00:00Z', channel: 'itv4' },
  { group: 'D', home: 'TUR', away: 'USA', kickoff: '2026-06-26T02:00:00Z', channel: 'itv1' },
  { group: 'I', home: 'NOR', away: 'FRA', kickoff: '2026-06-26T19:00:00Z', channel: 'itv1' },
  { group: 'I', home: 'SEN', away: 'IRQ', kickoff: '2026-06-26T19:00:00Z', channel: 'itv4' },
  { group: 'H', home: 'CPV', away: 'KSA', kickoff: '2026-06-27T00:00:00Z', channel: 'itv4' },
  { group: 'H', home: 'URU', away: 'ESP', kickoff: '2026-06-27T00:00:00Z', channel: 'itv1' },
  { group: 'G', home: 'EGY', away: 'IRN', kickoff: '2026-06-27T03:00:00Z', channel: 'bbc-two' },
  { group: 'G', home: 'NZL', away: 'BEL', kickoff: '2026-06-27T03:00:00Z', channel: 'bbc-one' },
  { group: 'L', home: 'CRO', away: 'GHA', kickoff: '2026-06-27T21:00:00Z', channel: 'itv4' },
  { group: 'L', home: 'PAN', away: 'ENG', kickoff: '2026-06-27T21:00:00Z', channel: 'itv1' },
  { group: 'K', home: 'COL', away: 'POR', kickoff: '2026-06-27T23:30:00Z', channel: 'bbc-one' },
  { group: 'K', home: 'COD', away: 'UZB', kickoff: '2026-06-27T23:30:00Z', channel: 'bbc-two' },
  { group: 'J', home: 'ALG', away: 'AUT', kickoff: '2026-06-28T02:00:00Z', channel: 'bbc-two' },
  { group: 'J', home: 'JOR', away: 'ARG', kickoff: '2026-06-28T02:00:00Z', channel: 'bbc-one' },
];

/** Order-independent key for a tie, so home/away ordering doesn't matter. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const FIXTURE_BY_PAIR = new Map<string, RealFixture>(
  REAL_GROUP_FIXTURES.map((f) => [pairKey(f.home, f.away), f]),
);

/** The listed fixture for a tie, or undefined when the source doesn't cover it. */
export function realFixtureFor(home: string, away: string): RealFixture | undefined {
  return FIXTURE_BY_PAIR.get(pairKey(home, away));
}

/**
 * Real UK broadcaster for a tie, sourced from live-footballontv.com. Falls back
 * to a "TBC" placeholder for any tie the listings don't (yet) cover.
 */
export function broadcasterForTeams(home: string, away: string): Broadcaster {
  const fixture = FIXTURE_BY_PAIR.get(pairKey(home, away));
  return (fixture && BROADCASTERS_BY_ID[fixture.channel]) || BROADCASTER_TBC;
}

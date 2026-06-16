// Core domain types for the World Cup 2026 dashboard.

export type GroupId =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export interface Team {
  /** FIFA-style 3-letter code, e.g. ENG. Used as the stable id. */
  code: string;
  name: string;
  /** Emoji flag (falls back gracefully where unsupported). */
  flag: string;
  group: GroupId;
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';
}

export interface Venue {
  id: string;
  stadium: string;
  city: string;
  country: 'USA' | 'Canada' | 'Mexico';
}

export interface Broadcaster {
  id: string;
  /** Linear channel shown to the user, e.g. "BBC One". */
  channel: string;
  /** Streaming service, e.g. "BBC iPlayer". */
  streaming: string;
  /** Deep-ish link to the place a UK viewer would watch / stream. */
  watchUrl: string;
}

export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';

export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface Score {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  stage: Stage;
  group?: GroupId;
  /** Round-robin matchday within the group stage (1–3). */
  matchday?: number;
  /** ISO 8601 UTC kickoff timestamp. */
  kickoff: string;
  venueId: string;
  broadcasterId: string;
  /** Team codes, or knockout placeholder labels like "1A" / "W73". */
  home: string;
  away: string;
  /**
   * The eventual full-time score, known for every scheduled group game.
   * `null` for knockout ties whose participants aren't decided yet.
   * Whether it's revealed depends on the match's live status (see lib/matches).
   */
  result: Score | null;
  /** Human label for the round, e.g. "Round of 16". */
  roundLabel: string;
}

/** A match plus its clock-derived state, for rendering. */
export interface MatchView extends Match {
  status: MatchStatus;
  /** Score to display now: final if finished, running if live, null if upcoming. */
  displayScore: Score | null;
  /** Simulated minute for live matches (1–90+). */
  minute: number | null;
}

export interface Standing {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Most-recent-first list of results for the form guide. */
  form: ('W' | 'D' | 'L')[];
  /** 1-based position within the group. */
  rank: number;
}

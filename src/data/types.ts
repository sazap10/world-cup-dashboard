// Core domain types for the World Cup 2026 dashboard.

export type GroupId =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export interface Team {
  /** FIFA-style 3-letter code, e.g. ENG. Used as the stable id. */
  code: string;
  name: string;
  /** Emoji flag (seed data). Falls back gracefully where unsupported. */
  flag?: string;
  /** Crest image URL (live data) — preferred over the emoji flag when present. */
  crest?: string;
  /** Group, when known. Absent for knockout-only teams in the live feed. */
  group?: GroupId;
  confederation?: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';
}

export interface Venue {
  id: string;
  stadium: string;
  city?: string;
  country?: string;
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

export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'third';

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
  /** Resolved venue, or null when unknown (live data may omit it). */
  venue: Venue | null;
  /** UK broadcaster, always assigned locally (no API provides this). */
  broadcaster: Broadcaster;
  /** Team codes, or knockout placeholder labels like "1A" / "W73". */
  home: string;
  away: string;
  /**
   * Score to use. For seed group games this is the eventual full-time score
   * (revealed progressively by the clock). For live data it is the current
   * score reported by the API. `null` when no score applies yet.
   */
  result: Score | null;
  /** Human label for the round, e.g. "Round of 16". */
  roundLabel: string;
  /**
   * When set (live data), the clock-derived status/minute are bypassed and
   * the API's truth is used instead. Absent for seed data (clock drives it).
   */
  statusOverride?: MatchStatus;
  minuteOverride?: number | null;
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

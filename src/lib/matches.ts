import type { Match, MatchStatus, MatchView, Score } from '../data/types';
import { dayKey } from './time';

// A match is "live" from kickoff until ~105 minutes later (two halves +
// half-time + stoppage). After that it's finished.
const LIVE_DURATION_MS = 105 * 60 * 1000;

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic minute (1–90) at which the n-th goal of a side is scored. */
function goalMinutes(matchId: string, side: 'h' | 'a', count: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < count; k++) {
    const seed = hashString(`${matchId}-${side}-${k}`);
    const base = ((k + 1) / (count + 1)) * 88;
    const jitter = (seed % 1000) / 1000 - 0.5; // -0.5..0.5
    out.push(Math.max(1, Math.min(90, Math.round(base + jitter * 14))));
  }
  return out.sort((x, y) => x - y);
}

export function statusOf(match: Match, nowMs: number): MatchStatus {
  const kickoff = Date.parse(match.kickoff);
  if (nowMs < kickoff) return 'upcoming';
  if (nowMs < kickoff + LIVE_DURATION_MS) return 'live';
  return 'finished';
}

/**
 * The match's true status: the API's reported status when present (live data),
 * otherwise the clock-derived one (seed data). Prefer this over `statusOf` for
 * anything that gates on a result being final — live data can be FINISHED before
 * the 105-minute clock window elapses.
 */
export function effectiveStatus(match: Match, nowMs: number): MatchStatus {
  return match.statusOverride ?? statusOf(match, nowMs);
}

/**
 * Simulated current minute for a live match when the feed omits a real one.
 * Models the match clock in phases rather than linearly stretching the
 * 105-minute window onto 90: the broadcast clock pauses for the ~15-minute
 * half-time, so a linear map runs several minutes ahead all through the second
 * half (e.g. ~89' shown while the TV reads ~81'). First half is wall 0–45,
 * half-time holds at 45 across wall 45–60, second half is 45–90 over wall
 * 60–105 — matching LIVE_DURATION_MS so it still reaches 90 at the window's end.
 */
function liveMinute(match: Match, nowMs: number): { minute: number; halftime: boolean } {
  const elapsed = (nowMs - Date.parse(match.kickoff)) / 60000;
  if (elapsed < 45) return { minute: Math.max(1, Math.round(elapsed)), halftime: false };
  if (elapsed < 60) return { minute: 45, halftime: true };
  return { minute: Math.min(90, Math.round(45 + (elapsed - 60))), halftime: false };
}

/**
 * Score to show right now. Live API data carries the true current score in
 * `result`, so we show it directly; seed data reveals its final score
 * progressively over the simulated 90 minutes.
 */
function displayScore(
  match: Match,
  status: MatchStatus,
  minute: number | null,
  liveSource: boolean,
): Score | null {
  if (status === 'upcoming' || !match.result) return null;
  if (status === 'finished' || liveSource) return match.result;
  if (status === 'live' && minute !== null) {
    const homeScored = goalMinutes(match.id, 'h', match.result.home).filter(
      (m) => m <= minute,
    ).length;
    const awayScored = goalMinutes(match.id, 'a', match.result.away).filter(
      (m) => m <= minute,
    ).length;
    return { home: homeScored, away: awayScored };
  }
  return null;
}

export function toView(match: Match, nowMs: number): MatchView {
  // Live data overrides the clock with the API's reported status/minute.
  const liveSource = match.statusOverride !== undefined;
  const status = match.statusOverride ?? statusOf(match, nowMs);
  // `minute` stays numeric for the score reveal; `minuteLabel` is the display
  // string ("HT" during the half-time hold, otherwise e.g. "67’").
  let minute: number | null = null;
  let minuteLabel: string | null = null;
  if (status === 'live') {
    if (match.halftimeOverride) {
      // Feed reports the half-time break (PAUSED) outright.
      minute = match.minuteOverride ?? 45;
      minuteLabel = 'HT';
    } else if (match.minuteOverride != null) {
      minute = match.minuteOverride;
      minuteLabel = `${minute}’`;
    } else {
      const sim = liveMinute(match, nowMs);
      minute = sim.minute;
      minuteLabel = sim.halftime ? 'HT' : `${sim.minute}’`;
    }
  }
  return {
    ...match,
    status,
    minute,
    minuteLabel,
    displayScore: displayScore(match, status, minute, liveSource),
  };
}

export function viewsOf(matches: Match[], nowMs: number): MatchView[] {
  return matches.map((m) => toView(m, nowMs));
}

export function byKickoff(a: { kickoff: string }, b: { kickoff: string }): number {
  return Date.parse(a.kickoff) - Date.parse(b.kickoff);
}

export interface DayGroup {
  key: string;
  /** ISO of the first match that day, for label formatting. */
  iso: string;
  matches: MatchView[];
}

/** Group matches into calendar days (in the given timezone), sorted ascending. */
export function groupByDay(matches: MatchView[], tz: string): DayGroup[] {
  const map = new Map<string, MatchView[]>();
  for (const m of [...matches].sort(byKickoff)) {
    const key = dayKey(m.kickoff, tz);
    const bucket = map.get(key);
    if (bucket) bucket.push(m);
    else map.set(key, [m]);
  }
  return [...map.entries()].map(([key, ms]) => ({ key, iso: ms[0].kickoff, matches: ms }));
}

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

/** Simulated current minute for a live match (1–90, then "90+"). */
function liveMinute(match: Match, nowMs: number): number {
  const elapsed = (nowMs - Date.parse(match.kickoff)) / 60000;
  // Compress the 105-minute real window onto a 90-minute clock.
  return Math.max(1, Math.min(90, Math.round((elapsed / 105) * 90)));
}

/** Score to show right now: final when finished, progressive when live. */
function displayScore(match: Match, status: MatchStatus, minute: number | null): Score | null {
  if (!match.result) return null;
  if (status === 'finished') return match.result;
  if (status === 'live' && minute !== null) {
    const homeScored = goalMinutes(match.id, 'h', match.result.home).filter((m) => m <= minute).length;
    const awayScored = goalMinutes(match.id, 'a', match.result.away).filter((m) => m <= minute).length;
    return { home: homeScored, away: awayScored };
  }
  return null;
}

export function toView(match: Match, nowMs: number): MatchView {
  const status = statusOf(match, nowMs);
  const minute = status === 'live' ? liveMinute(match, nowMs) : null;
  return {
    ...match,
    status,
    minute,
    displayScore: displayScore(match, status, minute),
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

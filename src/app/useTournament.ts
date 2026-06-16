import { useMemo } from 'react';
import { MATCHES } from '../data/schedule';
import { byKickoff, viewsOf } from '../lib/matches';
import type { MatchView } from '../data/types';
import { useNow } from './providers';

export interface Tournament {
  nowMs: number;
  all: MatchView[];
  live: MatchView[];
  upcoming: MatchView[];
  finished: MatchView[];
  /** Next match to kick off, if any remain. */
  next: MatchView | null;
}

/**
 * Single derivation of the whole schedule against the current clock.
 * Memoised on a 5s bucket so the once-a-second tick doesn't recompute
 * standings-scale work on every render.
 */
export function useTournament(): Tournament {
  const nowMs = useNow();
  const bucket = Math.floor(nowMs / 5000);

  return useMemo(() => {
    const all = viewsOf(MATCHES, nowMs).sort(byKickoff);
    const live = all.filter((m) => m.status === 'live');
    const upcoming = all.filter((m) => m.status === 'upcoming');
    const finished = all.filter((m) => m.status === 'finished');
    return { nowMs, all, live, upcoming, finished, next: upcoming[0] ?? null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);
}

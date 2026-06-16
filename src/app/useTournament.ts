import { useMemo } from 'react';
import type { MatchView } from '../data/types';
import { byKickoff, viewsOf } from '../lib/matches';
import { useData } from './DataProvider';
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
 * Single derivation of the active dataset against the current clock.
 * Memoised on a 5s bucket so the once-a-second tick doesn't recompute
 * standings-scale work on every render.
 */
export function useTournament(): Tournament {
  const nowMs = useNow();
  const { dataset } = useData();
  const bucket = Math.floor(nowMs / 5000);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nowMs is intentionally excluded in favour of the 5s `bucket` so this recomputes every 5s, not on every 1s tick
  return useMemo(() => {
    const all = viewsOf(dataset.matches, nowMs).sort(byKickoff);
    const live = all.filter((m) => m.status === 'live');
    const upcoming = all.filter((m) => m.status === 'upcoming');
    const finished = all.filter((m) => m.status === 'finished');
    return { nowMs, all, live, upcoming, finished, next: upcoming[0] ?? null };
  }, [bucket, dataset]);
}

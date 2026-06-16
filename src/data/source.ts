// The data-source abstraction. The app always has a dataset: it starts on the
// bundled seed data (instant, offline) and upgrades to the live football-data.org
// feed when that succeeds. Both produce the same shape, so consumers don't care
// which is active.

import type { Match, Team } from './types';
import { MATCHES } from './schedule';
import { TEAMS } from './teams';
import { fetchLiveDataset } from './live';

export interface Dataset {
  source: 'seed' | 'live';
  teams: Team[];
  matches: Match[];
  /** epoch ms when this dataset was produced. */
  fetchedAt: number;
}

export const SEED_DATASET: Dataset = {
  source: 'seed',
  teams: TEAMS,
  matches: MATCHES,
  fetchedAt: Date.now(),
};

/** Live data is on unless explicitly disabled via VITE_USE_LIVE=false. */
export function isLiveEnabled(): boolean {
  return (import.meta.env.VITE_USE_LIVE as string | undefined) !== 'false';
}

/** Fetch the live dataset. Throws on any failure so callers can fall back. */
export function loadLiveDataset(signal?: AbortSignal): Promise<Dataset> {
  return fetchLiveDataset(signal);
}

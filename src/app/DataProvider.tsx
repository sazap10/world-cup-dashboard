import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  applyBroadcastOverrides,
  type BroadcastOverrides,
  fetchBroadcastOverrides,
} from '../data/broadcast-feed';
import { type Dataset, isLiveEnabled, loadLiveDataset, SEED_DATASET } from '../data/source';
import type { Team } from '../data/types';

interface DataState {
  /** The active dataset (seed until/unless live succeeds). */
  dataset: Dataset;
  source: 'seed' | 'live';
  /** A live fetch is currently in flight. */
  refreshing: boolean;
  /** Last live-fetch error, if the most recent attempt failed. */
  error: string | null;
  /** Code → team lookup for the active dataset. */
  teamsByCode: Record<string, Team>;
  /** Trigger an immediate live refresh. */
  reload: () => void;
}

const DataContext = createContext<DataState>({
  dataset: SEED_DATASET,
  source: 'seed',
  refreshing: false,
  error: null,
  teamsByCode: {},
  reload: () => {},
});

// Re-poll the live feed on this cadence (well within the free 10 req/min limit).
const REFRESH_MS = 60_000;

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset>(SEED_DATASET);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live UK broadcaster allocation, scraped from live-footballontv.com and merged
  // over the static tables. Independent of the live match feed (and its token), so
  // it enhances both the seed and live datasets. Empty until the first fetch lands.
  const [overrides, setOverrides] = useState<BroadcastOverrides>(() => ({
    byPair: new Map(),
    byKnockoutMatch: new Map(),
  }));
  const abortRef = useRef<AbortController | null>(null);
  const bcastAbortRef = useRef<AbortController | null>(null);

  const loadBroadcasters = useCallback(async () => {
    bcastAbortRef.current?.abort();
    const ctrl = new AbortController();
    bcastAbortRef.current = ctrl;
    const next = await fetchBroadcastOverrides(ctrl.signal);
    if (!ctrl.signal.aborted) setOverrides(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!isLiveEnabled()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRefreshing(true);
    try {
      const live = await loadLiveDataset(ctrl.signal);
      setDataset(live);
      setError(null);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      // Keep whatever dataset we already have (seed, or a previous live snapshot).
      setError(err instanceof Error ? err.message : 'Live data unavailable');
    } finally {
      if (!ctrl.signal.aborted) setRefreshing(false);
    }
  }, []);

  const reload = useCallback(() => {
    refresh();
    loadBroadcasters();
  }, [refresh, loadBroadcasters]);

  useEffect(() => {
    if (!isLiveEnabled()) return;
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [refresh]);

  // Broadcaster scrape runs once on mount regardless of the live feed (its 6h
  // server cache makes a per-session fetch plenty), and again on an explicit reload.
  useEffect(() => {
    loadBroadcasters();
    return () => bcastAbortRef.current?.abort();
  }, [loadBroadcasters]);

  // Merge the live broadcaster allocation over whichever dataset is active.
  const displayed = useMemo(
    () => applyBroadcastOverrides(dataset, overrides),
    [dataset, overrides],
  );

  const teamsByCode = useMemo(
    () => Object.fromEntries(displayed.teams.map((t) => [t.code, t])),
    [displayed],
  );

  const value = useMemo<DataState>(
    () => ({
      dataset: displayed,
      source: displayed.source,
      refreshing,
      error,
      teamsByCode,
      reload,
    }),
    [displayed, refreshing, error, teamsByCode, reload],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  return useContext(DataContext);
}

export function useTeam(code: string): Team | undefined {
  return useContext(DataContext).teamsByCode[code];
}

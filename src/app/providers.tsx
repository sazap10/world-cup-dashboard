import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { now as readClock } from '../lib/clock';
import { DEFAULT_TIMEZONE, TIMEZONES } from '../lib/time';

// --- Clock: a single ticking source of "now" shared by the whole tree. ------
const ClockContext = createContext<number>(readClock());

export function ClockProvider({ children }: { children: ReactNode }) {
  const [nowMs, setNowMs] = useState(() => readClock());

  useEffect(() => {
    const id = setInterval(() => setNowMs(readClock()), 1000);
    return () => clearInterval(id);
  }, []);

  return <ClockContext.Provider value={nowMs}>{children}</ClockContext.Provider>;
}

/** Current time in ms, updating once a second. */
export function useNow(): number {
  return useContext(ClockContext);
}

// --- Timezone: persisted user preference, default Europe/London (BST). ------
interface TimezoneState {
  tz: string;
  setTz: (tz: string) => void;
}

const TimezoneContext = createContext<TimezoneState>({
  tz: DEFAULT_TIMEZONE,
  setTz: () => {},
});

const STORAGE_KEY = 'wc26.timezone';

function initialTimezone(): string {
  if (typeof window === 'undefined') return DEFAULT_TIMEZONE;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && TIMEZONES.some((t) => t.id === saved)) return saved;
  return DEFAULT_TIMEZONE;
}

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [tz, setTzState] = useState(initialTimezone);

  const value = useMemo<TimezoneState>(
    () => ({
      tz,
      setTz: (next) => {
        setTzState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* storage may be unavailable; preference is non-critical */
        }
      },
    }),
    [tz],
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export function useTimezone(): TimezoneState {
  return useContext(TimezoneContext);
}

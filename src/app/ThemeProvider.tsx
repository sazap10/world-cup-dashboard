import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'wc26.theme';
const META_COLOR: Record<ResolvedTheme, string> = { light: '#eef1f6', dark: '#0c1322' };

interface ThemeState {
  /** What the user chose: light, dark, or follow the OS. */
  preference: ThemePreference;
  /** What's actually applied right now (system resolved against the OS). */
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
  /** Cycle system → light → dark → system. */
  cycle: () => void;
}

const ThemeContext = createContext<ThemeState>({
  preference: 'system',
  resolved: 'dark',
  setPreference: () => {},
  cycle: () => {},
});

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return pref;
}

function initialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>(initialPreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(initialPreference()));

  // Apply the resolved theme to <html> and sync the browser UI colour.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[resolved]);
  }, [resolved]);

  // Recompute on preference change; while on "system", track OS changes live.
  useEffect(() => {
    setResolved(resolve(preference));
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* storage may be unavailable; preference is non-critical */
    }
  }, []);

  const cycle = useCallback(() => {
    setPreference(preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system');
  }, [preference, setPreference]);

  const value = useMemo<ThemeState>(
    () => ({ preference, resolved, setPreference, cycle }),
    [preference, resolved, setPreference, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}

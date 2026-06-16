// Timezone-aware formatting. All kickoff times are stored in UTC and rendered
// in the user's selected zone via the built-in Intl APIs (which handle DST,
// so "Europe/London" is BST in summer automatically).

export interface TimezoneOption {
  /** IANA timezone id. */
  id: string;
  /** Short label shown in the picker, e.g. "London (BST)". */
  label: string;
}

// Default is Europe/London (BST during the tournament), then the host-nation
// zones and a few common fan timezones.
export const TIMEZONES: TimezoneOption[] = [
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Dublin', label: 'Dublin' },
  { id: 'Europe/Paris', label: 'Central Europe' },
  { id: 'America/New_York', label: 'New York (ET)' },
  { id: 'America/Chicago', label: 'Chicago (CT)' },
  { id: 'America/Denver', label: 'Denver (MT)' },
  { id: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { id: 'America/Mexico_City', label: 'Mexico City' },
  { id: 'America/Toronto', label: 'Toronto' },
  { id: 'UTC', label: 'UTC' },
];

export const DEFAULT_TIMEZONE = 'Europe/London';

/** Append the live abbreviation for a zone, e.g. "London (BST)". */
export function zoneLabelWithAbbr(tz: string, referenceMs: number): string {
  const base = TIMEZONES.find((t) => t.id === tz)?.label ?? tz;
  const abbr = abbreviation(tz, referenceMs);
  // Don't double up if the label already names the offset.
  if (!abbr || base.includes('(')) return base;
  return `${base} (${abbr})`;
}

export function abbreviation(tz: string, referenceMs: number): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date(referenceMs));
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

export function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** "Sat 21 Jun" */
export function formatDayShort(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

/** "Saturday 21 June" */
export function formatDayLong(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

/** A stable yyyy-mm-dd key for grouping matches by calendar day in a zone. */
export function dayKey(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Relative day label: Today / Tomorrow / weekday name. */
export function relativeDayLabel(iso: string, tz: string, nowMs: number): string {
  const target = dayKey(iso, tz);
  const today = dayKey(new Date(nowMs).toISOString(), tz);
  const tomorrow = dayKey(new Date(nowMs + 86400000).toISOString(), tz);
  if (target === today) return 'Today';
  if (target === tomorrow) return 'Tomorrow';
  return formatDayLong(iso, tz);
}

/** Break a duration in ms into d/h/m/s for a countdown. */
export function breakdown(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

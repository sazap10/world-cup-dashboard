// A single source of "now" so the whole app agrees on the tournament clock.
//
// Defaults to the real wall clock. For demos and screenshots you can freeze
// time by adding ?now=2026-06-22T19:30:00Z to the URL — handy for showing the
// live state regardless of when the page is opened.

let frozenNow: number | null = null;

if (typeof window !== 'undefined') {
  const param = new URLSearchParams(window.location.search).get('now');
  if (param) {
    const parsed = Date.parse(param);
    if (!Number.isNaN(parsed)) frozenNow = parsed;
  }
}

/** Current time in epoch milliseconds. */
export function now(): number {
  return frozenNow ?? Date.now();
}

export function isFrozen(): boolean {
  return frozenNow !== null;
}

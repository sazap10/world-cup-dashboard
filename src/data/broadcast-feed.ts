// Live "where to watch" overrides, scraped from live-footballontv.com.
//
// The UK broadcaster allocation (which match is on BBC One / BBC Two / ITV1 /
// ITV4) used to be hand-transcribed into src/lib/broadcast.ts and updated by PR.
// This module instead pulls the current allocation at runtime: the browser
// fetches our own same-origin /api/wc/broadcasters endpoint (a 6h-cached
// passthrough of the source page — the browser can't fetch it directly: no CORS,
// and our CSP is connect-src 'self'), parses the HTML here (regex over the page's
// rigid, machine-generated markup), and merges the result over the static tables.
// Anything the page doesn't list (it only shows upcoming
// fixtures), an unrecognised team/channel, or a failed fetch falls back to the
// baked-in static value, so links never break.

import { pairKey } from '../lib/broadcast';
import { BROADCASTERS_BY_ID } from './broadcasters';
import { knockoutMatchNumberForKickoff } from './schedule';
import type { Dataset } from './source';
import { TEAMS } from './teams';

/** Same-origin cached endpoint; override via VITE_BROADCASTERS_URL. */
export const BROADCAST_FEED_URL =
  (import.meta.env.VITE_BROADCASTERS_URL as string | undefined) ?? '/api/wc/broadcasters';

export interface BroadcastOverrides {
  /** pairKey(homeCode, awayCode) → broadcaster id, for group ties. */
  byPair: Map<string, string>;
  /** FIFA match number → broadcaster id, for knockout ties. */
  byKnockoutMatch: Map<number, string>;
}

function emptyOverrides(): BroadcastOverrides {
  return { byPair: new Map(), byKnockoutMatch: new Map() };
}

// --- team name → code -------------------------------------------------------

/** Lowercase, strip accents and any non-alphanumerics, so spelling/punctuation
 *  differences between the source and our team names don't matter. NFD splits
 *  accented letters into base + combining mark; the alphanumeric filter then
 *  drops the marks (and spaces, "&", "-", etc.), e.g. "Côte d'Ivoire" → "cotedivoire". */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '');
}

// Aliases for the few names the source spells differently from our TEAMS list
// (most align once normalised, e.g. "Bosnia-Herzegovina" ↔ "Bosnia & Herzegovina").
const NAME_ALIASES: Record<string, string> = {
  usa: 'USA', // we store "United States"
  ivorycoast: 'CIV', // we store "Côte d'Ivoire"
  turkiye: 'TUR', // we store "Turkey"
  southkorea: 'KOR',
};

const NAME_TO_CODE: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const t of TEAMS) map.set(normalizeName(t.name), t.code);
  for (const [name, code] of Object.entries(NAME_ALIASES)) map.set(name, code);
  return map;
})();

function codeFor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return NAME_TO_CODE.get(normalizeName(raw));
}

// --- channel name → broadcaster id ------------------------------------------

// The source lists TV channel(s) followed by streaming services in one row
// (e.g. "ITV1 STV ITVX STV Player"). We map the leading TV channel to one of our
// broadcaster ids; streaming-only tokens and "TBC" don't match (→ no override).
const CHANNEL_BY_NAME: Record<string, string> = {
  'bbc one': 'bbc-one',
  'bbc two': 'bbc-two',
  itv1: 'itv1',
  itv4: 'itv4',
  stv: 'itv1', // ITV's Scottish variant collapses onto our base itv1
};

const PILL_RE = /<span class="channel-pill"[^>]*>(.*?)<\/span>/gs;

/** The first recognised TV channel among a row's channel pills (HTML fragment),
 *  or undefined when only streaming/TBC tokens are present. */
function channelIdFromPills(pillsHtml: string): string | undefined {
  for (const [, text] of pillsHtml.matchAll(PILL_RE)) {
    const id = CHANNEL_BY_NAME[decodeEntities(text).trim().toLowerCase()];
    if (id) return id;
  }
  return undefined;
}

/** Decode the handful of HTML entities the source emits (notably &nbsp; between
 *  the year and round, and &amp; in names). Enough for the text we read. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

// --- kickoff (UK local) → UTC ISO -------------------------------------------

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/**
 * Combine a date heading ("Monday 29th June 2026") and a time ("18:00"), both in
 * UK local time (BST = UTC+1 across the June–July tournament window), into a UTC
 * ISO string in the same no-milliseconds form as the schedule's kickoffs, so it
 * can key knockoutMatchNumberForKickoff. Returns null if it can't be parsed.
 */
export function parseKickoffUTC(dateText: string, timeText: string): string | null {
  const d = dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/);
  const t = timeText.match(/(\d{1,2}):(\d{2})/);
  if (!d || !t) return null;
  const month = MONTHS[d[2].toLowerCase()];
  if (month === undefined) return null;
  // BST → UTC is a constant −1h offset for the whole tournament; Date.UTC handles
  // any midnight rollover (e.g. 00:30 BST → the previous UTC day).
  const utc = new Date(Date.UTC(Number(d[3]), month, Number(d[1]), Number(t[1]) - 1, Number(t[2])));
  return `${utc.toISOString().slice(0, 19)}Z`;
}

// --- parsing ----------------------------------------------------------------

// Matches, in document order, either a date heading or a full fixture row. The
// source is machine-generated with a rigid structure, so this is reliable; the
// unit test pins it. `s` lets `.` span the minified markup; `g` drives matchAll.
const ROW_RE = new RegExp(
  '<div class="fixture-date">(.*?)</div>' +
    '|' +
    '<div class="fixture__time">(.*?)</div>\\s*' +
    '<div class="fixture__teams">(.*?)</div>\\s*' +
    '<div class="fixture__competition">(.*?)</div>\\s*' +
    '<div class="fixture__channel">\\s*<div class="span3 channels">(.*?)</div>',
  'gs',
);

/**
 * Parse the source page into broadcaster overrides. Pure (no network), so it's
 * unit-tested against a saved fixture. Walks the interleaved date headings and
 * fixture rows in document order, tracking the current date; group ties key by
 * team pairing, knockout ties by FIFA match number recovered from the kickoff.
 */
export function parseBroadcastHtml(html: string): BroadcastOverrides {
  const overrides = emptyOverrides();
  let currentDate = '';

  for (const m of html.matchAll(ROW_RE)) {
    const [, dateText, time, teamsText, comp, pillsHtml] = m;
    if (dateText !== undefined) {
      currentDate = decodeEntities(dateText).trim();
      continue;
    }

    const channelId = channelIdFromPills(pillsHtml);
    if (!channelId) continue; // TBC or an unrecognised channel → keep static value

    const [homeRaw, awayRaw] = decodeEntities(teamsText)
      .trim()
      .split(/\s+v\s+/i);
    const home = codeFor(homeRaw);
    const away = codeFor(awayRaw);
    if (!home || !away) continue; // unknown team (incl. "TBC") → skip

    if (/group/i.test(comp)) {
      overrides.byPair.set(pairKey(home, away), channelId);
    } else {
      const iso = parseKickoffUTC(currentDate, decodeEntities(time).trim());
      const num = iso ? knockoutMatchNumberForKickoff(iso) : null;
      if (num != null) overrides.byKnockoutMatch.set(num, channelId);
    }
  }
  return overrides;
}

// --- fetch + merge ----------------------------------------------------------

/** Fetch and parse the live allocation. Returns empty overrides on any failure
 *  so the caller keeps the static baseline. */
export async function fetchBroadcastOverrides(signal?: AbortSignal): Promise<BroadcastOverrides> {
  try {
    const res = await fetch(BROADCAST_FEED_URL, { headers: { Accept: 'text/html' }, signal });
    if (!res.ok) return emptyOverrides();
    return parseBroadcastHtml(await res.text());
  } catch {
    return emptyOverrides();
  }
}

/**
 * Return a dataset with each match's broadcaster re-resolved from the live
 * overrides, falling back to its existing (static) broadcaster when the page
 * doesn't cover it. Mirrors the resolution in src/data/live.ts: group ties by
 * team pairing, knockout ties by FIFA match number. Returns the input unchanged
 * when nothing applies, so referential equality is preserved for memoisation.
 */
export function applyBroadcastOverrides(dataset: Dataset, overrides: BroadcastOverrides): Dataset {
  if (overrides.byPair.size === 0 && overrides.byKnockoutMatch.size === 0) return dataset;

  let changed = false;
  const matches = dataset.matches.map((m) => {
    const id =
      m.stage === 'group'
        ? overrides.byPair.get(pairKey(m.home, m.away))
        : overrides.byKnockoutMatch.get(knockoutMatchNumberForKickoff(m.kickoff) ?? -1);
    const next = id ? BROADCASTERS_BY_ID[id] : undefined;
    if (next && next !== m.broadcaster) {
      changed = true;
      return { ...m, broadcaster: next };
    }
    return m;
  });
  return changed ? { ...dataset, matches } : dataset;
}

// football-data.org (v4) adapter. Maps the World Cup competition feed into the
// app's domain types. The API key is never sent from the browser: requests go
// to a same-origin base ("/fd" by default) where the Vite dev proxy — or a
// production proxy — injects the X-Auth-Token header.

import type { GroupId, Match, Stage, Team } from './types';
import { pickBroadcaster } from '../lib/broadcast';
import type { Dataset } from './source';

// The app calls our own server-side cached endpoint, which fetches the upstream
// football-data.org feed at most once per TTL and fans it out to all clients.
// Override with VITE_MATCHES_URL to point at a production caching proxy, or set
// it to "/fd/v4/competitions/WC/matches" to hit the raw passthrough proxy.
const MATCHES_URL =
  (import.meta.env.VITE_MATCHES_URL as string | undefined) ?? '/api/wc/matches';

interface FdTeam {
  id: number;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  matchday: number | null;
  minute?: number | null;
  venue?: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

const STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: 'group',
  LAST_32: 'r32',
  ROUND_OF_32: 'r32',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  QUARTER_FINAL: 'qf',
  SEMI_FINALS: 'sf',
  SEMI_FINAL: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final',
};

const ROUND_LABEL: Record<Stage, string> = {
  group: 'Group stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-final',
  sf: 'Semi-final',
  third: 'Third-place play-off',
  final: 'Final',
};

const GROUP_LETTERS = 'ABCDEFGHIJKL';

function parseGroup(raw: string | null): GroupId | undefined {
  if (!raw) return undefined;
  const letter = raw.trim().toUpperCase().slice(-1);
  return GROUP_LETTERS.includes(letter) ? (letter as GroupId) : undefined;
}

function teamCode(t: FdTeam): string {
  return t.tla ?? t.shortName ?? t.name ?? `T${t.id}`;
}

function mapStatus(s: string): Match['statusOverride'] {
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'live';
  if (s === 'FINISHED' || s === 'AWARDED') return 'finished';
  return 'upcoming';
}

function mapMatch(m: FdMatch): Match {
  const stage = STAGE_MAP[m.stage] ?? 'group';
  const group = parseGroup(m.group);
  const id = String(m.id);
  const home = m.homeTeam?.tla ? teamCode(m.homeTeam) : 'TBD';
  const away = m.awayTeam?.tla ? teamCode(m.awayTeam) : 'TBD';

  const ft = m.score?.fullTime;
  const result =
    ft && ft.home !== null && ft.away !== null ? { home: ft.home, away: ft.away } : null;

  const roundLabel =
    stage === 'group' && group
      ? `Group ${group}${m.matchday ? ` · Matchday ${m.matchday}` : ''}`
      : ROUND_LABEL[stage];

  return {
    id,
    stage,
    group,
    matchday: m.matchday ?? undefined,
    kickoff: m.utcDate,
    venue: m.venue ? { id: `v-${id}`, stadium: m.venue } : null,
    broadcaster: pickBroadcaster(id),
    home,
    away,
    result,
    roundLabel,
    statusOverride: mapStatus(m.status),
    minuteOverride: typeof m.minute === 'number' ? m.minute : null,
  };
}

function collectTeams(matches: FdMatch[]): Team[] {
  const byCode = new Map<string, Team>();
  for (const m of matches) {
    for (const side of [m.homeTeam, m.awayTeam]) {
      if (!side?.tla) continue;
      const code = teamCode(side);
      const group = parseGroup(m.group);
      const existing = byCode.get(code);
      if (existing) {
        // Backfill a group if a later (group-stage) match reveals it.
        if (!existing.group && group) existing.group = group;
        continue;
      }
      byCode.set(code, {
        code,
        name: side.name ?? side.shortName ?? code,
        crest: side.crest ?? undefined,
        group: group ?? ('A' as GroupId),
      });
    }
  }
  return [...byCode.values()];
}

export async function fetchLiveDataset(signal?: AbortSignal): Promise<Dataset> {
  const res = await fetch(MATCHES_URL, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Live feed responded ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { matches?: FdMatch[] };
  const fdMatches = body.matches ?? [];
  if (fdMatches.length === 0) {
    throw new Error('No fixtures returned for this competition yet.');
  }

  return {
    source: 'live',
    teams: collectTeams(fdMatches),
    matches: fdMatches.map(mapMatch),
    fetchedAt: Date.now(),
  };
}

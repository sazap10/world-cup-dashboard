import { describe, expect, it } from 'vitest';
import { pairKey } from '../lib/broadcast';
import FIXTURE from './__fixtures__/live-footballontv.html?raw';
import {
  applyBroadcastOverrides,
  type BroadcastOverrides,
  parseBroadcastHtml,
  parseKickoffUTC,
} from './broadcast-feed';
import { BROADCASTER_TBC, BROADCASTERS_BY_ID } from './broadcasters';
import type { Dataset } from './source';
import type { Match } from './types';

function match(
  partial: Partial<Match> & Pick<Match, 'stage' | 'home' | 'away' | 'kickoff'>,
): Match {
  return {
    id: `${partial.home}-${partial.away}`,
    venue: null,
    broadcaster: BROADCASTER_TBC,
    result: null,
    roundLabel: '',
    ...partial,
  };
}

describe('parseBroadcastHtml', () => {
  const overrides = parseBroadcastHtml(FIXTURE);

  it('maps group ties by team pairing, resolving source names to codes', () => {
    // "Czech Republic v South Africa" → CZE/RSA on BBC Two.
    expect(overrides.byPair.get(pairKey('CZE', 'RSA'))).toBe('bbc-two');
    // "USA v Australia" exercises the United-States alias → USA/AUS on ITV1.
    expect(overrides.byPair.get(pairKey('USA', 'AUS'))).toBe('itv1');
    expect(overrides.byPair.size).toBe(2);
  });

  it('maps knockout ties by FIFA match number recovered from the kickoff', () => {
    expect(overrides.byKnockoutMatch.get(76)).toBe('itv1'); // Brazil v Japan, 18:00 BST
    expect(overrides.byKnockoutMatch.get(74)).toBe('bbc-one'); // Germany v Paraguay, 21:30 BST
    expect(overrides.byKnockoutMatch.get(81)).toBe('bbc-one'); // USA v Bosnia-Herzegovina, 01:00 BST
    expect(overrides.byKnockoutMatch.size).toBe(3);
  });

  it('skips TBC rows (unknown team and TBC-only channel)', () => {
    // "Canada v TBC" (R16) and the "TBC" Final must produce no override.
    expect([...overrides.byKnockoutMatch.values()]).not.toContain(undefined);
    expect(overrides.byKnockoutMatch.size + overrides.byPair.size).toBe(5);
  });

  it('is robust to malformed input', () => {
    const empty = parseBroadcastHtml('<html><body>nothing here</body></html>');
    expect(empty.byPair.size).toBe(0);
    expect(empty.byKnockoutMatch.size).toBe(0);
  });
});

describe('parseKickoffUTC', () => {
  it('converts UK local (BST) date + time to the schedule UTC form', () => {
    // 18:00 BST on 29 June → 17:00 UTC, matching juneKickoff's no-millis format.
    expect(parseKickoffUTC('Monday 29th June 2026', '18:00')).toBe('2026-06-29T17:00:00Z');
    // 01:00 BST on 2 July → 00:00 UTC the same day.
    expect(parseKickoffUTC('Thursday 2nd July 2026', '01:00')).toBe('2026-07-02T00:00:00Z');
  });

  it('returns null when it cannot parse', () => {
    expect(parseKickoffUTC('not a date', '18:00')).toBeNull();
    expect(parseKickoffUTC('Monday 29th June 2026', 'tbc')).toBeNull();
  });
});

describe('applyBroadcastOverrides', () => {
  const overrides = parseBroadcastHtml(FIXTURE);
  const dataset: Dataset = {
    source: 'seed',
    teams: [],
    fetchedAt: 0,
    matches: [
      match({ stage: 'group', home: 'CZE', away: 'RSA', kickoff: '2026-06-17T16:00:00Z' }),
      match({ stage: 'r32', home: '1C', away: '2F', kickoff: '2026-06-29T17:00:00Z' }), // FIFA #76
      match({ stage: 'group', home: 'BRA', away: 'HAI', kickoff: '2026-06-20T01:00:00Z' }), // uncovered
    ],
  };

  it('overrides group and knockout broadcasters, leaving uncovered matches alone', () => {
    const merged = applyBroadcastOverrides(dataset, overrides);
    expect(merged.matches[0].broadcaster).toBe(BROADCASTERS_BY_ID['bbc-two']); // group by pairing
    expect(merged.matches[1].broadcaster).toBe(BROADCASTERS_BY_ID.itv1); // knockout by match number
    expect(merged.matches[2].broadcaster).toBe(BROADCASTER_TBC); // unchanged fallback
  });

  it('returns the input unchanged when no overrides apply', () => {
    const empty: BroadcastOverrides = { byPair: new Map(), byKnockoutMatch: new Map() };
    expect(applyBroadcastOverrides(dataset, empty)).toBe(dataset);
  });
});

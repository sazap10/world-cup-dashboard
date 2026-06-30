import { describe, expect, it } from 'vitest';
import { mapScore } from './live';

describe('mapScore splits the feed score into scoreline and shootout', () => {
  it('passes a regular full-time score straight through', () => {
    const { result, penalties } = mapScore({
      duration: 'REGULAR',
      fullTime: { home: 2, away: 1 },
    });
    expect(result).toEqual({ home: 2, away: 1 });
    expect(penalties).toBeNull();
  });

  it('subtracts the shootout from fullTime to recover the level scoreline', () => {
    // football-data folds the shootout into fullTime: 1-1 won 6-5 on pens is
    // reported as fullTime 7-6, penalties 6-5 (see "Dealing with scores").
    const { result, penalties } = mapScore({
      duration: 'PENALTY_SHOOTOUT',
      fullTime: { home: 7, away: 6 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 6, away: 5 },
    });
    expect(result).toEqual({ home: 1, away: 1 });
    expect(penalties).toEqual({ home: 6, away: 5 });
  });

  it('returns null when no full-time score is set yet', () => {
    const { result, penalties } = mapScore({ fullTime: { home: null, away: null } });
    expect(result).toBeNull();
    expect(penalties).toBeNull();
  });
});

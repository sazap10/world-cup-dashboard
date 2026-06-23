import { describe, expect, it } from 'vitest';
import { THIRD_PLACE_ALLOCATION, thirdPlaceGroupForSlot } from './third-place-allocation';
import type { GroupId } from './types';

// Per-slot allowed third-placed groups, straight from FIFA's round-of-32
// schedule (slot order 3rd-1…3rd-8 = matches 74, 77, 79, 80, 81, 82, 85, 87).
const ALLOWED: GroupId[][] = [
  ['A', 'B', 'C', 'D', 'F'], // M74 (Winner E)
  ['C', 'D', 'F', 'G', 'H'], // M77 (Winner I)
  ['C', 'E', 'F', 'H', 'I'], // M79 (Winner A)
  ['E', 'H', 'I', 'J', 'K'], // M80 (Winner L)
  ['B', 'E', 'F', 'I', 'J'], // M81 (Winner D)
  ['A', 'E', 'H', 'I', 'J'], // M82 (Winner G)
  ['E', 'F', 'G', 'I', 'J'], // M85 (Winner B)
  ['D', 'E', 'I', 'J', 'L'], // M87 (Winner K)
];

describe('third-placed allocation table', () => {
  it('covers all 495 eight-of-twelve combinations', () => {
    expect(Object.keys(THIRD_PLACE_ALLOCATION)).toHaveLength(495);
  });

  it('keys are sorted strings of eight distinct groups and values permute them', () => {
    for (const [key, value] of Object.entries(THIRD_PLACE_ALLOCATION)) {
      expect(key).toMatch(/^[A-L]{8}$/);
      expect(new Set(key).size).toBe(8); // eight distinct groups
      expect([...key].sort().join('')).toBe(key); // key already sorted
      expect(new Set(value).size).toBe(8); // value has no repeated group
      expect([...value].sort().join('')).toBe(key); // value is a permutation of the key
    }
  });

  it("every slot assignment respects FIFA's allowed groups", () => {
    for (const value of Object.values(THIRD_PLACE_ALLOCATION)) {
      [...value].forEach((group, slot) => {
        expect(ALLOWED[slot]).toContain(group);
      });
    }
  });
});

describe('thirdPlaceGroupForSlot', () => {
  it('maps each slot to the correct group for a known combination', () => {
    // Combination E F G H I J K L → "FGEKIHJL" (slot order 3rd-1…3rd-8).
    const groups: GroupId[] = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const expected: GroupId[] = ['F', 'G', 'E', 'K', 'I', 'H', 'J', 'L'];
    expected.forEach((group, i) => {
      expect(thirdPlaceGroupForSlot(groups, i + 1)).toBe(group);
    });
  });

  it('is order-independent — only the set of qualifying groups matters', () => {
    const shuffled: GroupId[] = ['L', 'H', 'E', 'K', 'J', 'F', 'I', 'G'];
    expect(thirdPlaceGroupForSlot(shuffled, 1)).toBe('F');
    expect(thirdPlaceGroupForSlot(shuffled, 4)).toBe('K');
  });

  it('returns null for an unrecognised set or out-of-range slot', () => {
    expect(thirdPlaceGroupForSlot(['A', 'B', 'C'] as GroupId[], 1)).toBeNull();
    expect(thirdPlaceGroupForSlot(['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'], 9)).toBeNull();
    expect(thirdPlaceGroupForSlot(['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'], 0)).toBeNull();
  });
});

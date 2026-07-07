import { describe, expect, it } from 'vitest';
import { flipKeys } from './flipKeys';

describe('flipKeys', () => {
  it('gives every value a stable identity key', () => {
    expect(flipKeys([5, 2, 9])).toEqual(['5#0/1', '2#0/1', '9#0/1']);
  });

  it('disambiguates duplicates by occurrence order and count', () => {
    expect(flipKeys([3, 3, 1, 3])).toEqual(['3#0/3', '3#1/3', '1#0/1', '3#2/3']);
  });

  it('keeps identities stable across rearrangements', () => {
    const before = flipKeys([5, 2, 9]);
    const after = flipKeys([2, 5, 9]);
    expect(new Set(after)).toEqual(new Set(before));
  });

  it('retires duplicate identities when one is removed, so no survivor inherits an evicted position', () => {
    const before = new Set(flipKeys([7, 2, 7]));
    const after = flipKeys([2, 7]);
    const afterFirst = after[0];
    const afterSecond = after[1];
    expect(afterFirst).toBeDefined();
    expect(afterSecond).toBeDefined();
    expect(before.has(afterSecond!)).toBe(false);
    expect(before.has(afterFirst!)).toBe(true);
  });

  it('prefixes keys for per-board uniqueness', () => {
    expect(flipKeys([1], ':r1:')).toEqual([':r1:1#0/1']);
  });
});

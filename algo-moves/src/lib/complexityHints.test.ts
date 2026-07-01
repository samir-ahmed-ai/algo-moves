import { describe, expect, it } from 'vitest';
import { COMPLEXITY_POOL, complexityHint, formatComplexityChoice } from './complexityHints';

describe('complexityHints', () => {
  it('formats choice with hint', () => {
    expect(formatComplexityChoice('O(n!)')).toBe('O(n!) — branching narrows each deeper row');
  });

  it('exposes pool keys', () => {
    expect(COMPLEXITY_POOL).toContain('O(n log n)');
    expect(complexityHint('O(1)')).toMatch(/constant/);
  });
});

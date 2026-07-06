import { describe, expect, it } from 'vitest';
import {
  clampCodeSplitPct,
  clampSplitPct,
  CODE_SPLIT_MAX,
  CODE_SPLIT_MIN,
  OVERVIEW_PROBLEM_DEFAULT,
  OVERVIEW_PROBLEM_MAX,
  OVERVIEW_PROBLEM_MIN,
} from './resizeSplit';

describe('resizeSplit', () => {
  it('clamps arbitrary ranges', () => {
    expect(clampSplitPct(10, 20, 80)).toBe(20);
    expect(clampSplitPct(90, 20, 80)).toBe(80);
    expect(clampSplitPct(50, 20, 80)).toBe(50);
  });

  it('clamps code editor split percentages', () => {
    expect(clampCodeSplitPct(CODE_SPLIT_MIN - 1)).toBe(CODE_SPLIT_MIN);
    expect(clampCodeSplitPct(CODE_SPLIT_MAX + 1)).toBe(CODE_SPLIT_MAX);
    expect(clampCodeSplitPct(50)).toBe(50);
  });

  it('uses overview defaults inside bounds', () => {
    expect(OVERVIEW_PROBLEM_DEFAULT).toBeGreaterThanOrEqual(OVERVIEW_PROBLEM_MIN);
    expect(OVERVIEW_PROBLEM_DEFAULT).toBeLessThanOrEqual(OVERVIEW_PROBLEM_MAX);
  });
});

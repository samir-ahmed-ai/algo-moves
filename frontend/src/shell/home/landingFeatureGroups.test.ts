import { describe, expect, it } from 'vitest';
import { EXPLORE_GROUPS } from './landingFeatureGroups';

describe('EXPLORE_GROUPS', () => {
  const optionIds = EXPLORE_GROUPS.flatMap((g) => g.options.map((o) => o.id));

  it('includes interview canvas for the landing explore popover', () => {
    expect(optionIds).toContain('interview-canvas');
  });

  it('keeps explore option ids unique', () => {
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });
});

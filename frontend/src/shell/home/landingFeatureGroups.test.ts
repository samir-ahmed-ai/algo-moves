import { describe, expect, it } from 'vitest';
import { EXPLORE_GROUPS } from './landingFeatureGroups';

describe('EXPLORE_GROUPS', () => {
  const optionIds = EXPLORE_GROUPS.flatMap((g) => g.options.map((o) => o.id));

  it('keeps interview tools out of the public explore popover', () => {
    expect(optionIds).not.toContain('interview-canvas');
    expect(optionIds).not.toContain('plans');
    expect(optionIds).not.toContain('resumes');
  });

  it('keeps explore option ids unique', () => {
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });
});

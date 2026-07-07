import { describe, expect, it } from 'vitest';
import type { StudioTab } from './studioTabs';
import { studioNextAllLabel, studioTabAfter } from './studioArcNav';

const tabs = (ids: string[]): StudioTab[] =>
  ids.map((id) => ({
    id,
    label: id,
    icon: (() => null) as unknown as StudioTab['icon'],
    group: 'start',
    render: 'panel',
  }));

describe('studioArcNav', () => {
  it('studioTabAfter returns the following tab', () => {
    const order = tabs(['overview', 'quiz', 'assemble', 'source']);
    expect(studioTabAfter(order, 'quiz')?.id).toBe('assemble');
    expect(studioTabAfter(order, 'assemble')?.id).toBe('source');
    expect(studioTabAfter(order, 'missing')).toBeUndefined();
  });

  it('studioNextAllLabel hides when one step from the end', () => {
    const order = tabs(['quiz', 'assemble', 'notes']);
    expect(studioNextAllLabel(order[2], undefined)).toBeUndefined();
    expect(studioNextAllLabel(order[2], order[2])).toBeUndefined();
    expect(studioNextAllLabel(order[2], order[1])).toBe('notes');
  });
});

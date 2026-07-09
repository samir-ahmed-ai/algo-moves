import { describe, expect, it } from 'vitest';
import { buildCatalog } from './catalog';
import type { CourseDef } from './types';
import { checkBindings, checkPrereqDag, checkPrereqRefs } from './integrity';

/** One-topic course of problem items with the given (id, prereqs, pluginId). */
function courseOf(
  items: Array<{ id: string; prereqs?: string[]; pluginId?: string; kind?: 'problem' | 'reading' }>,
): CourseDef {
  return {
    id: 'c',
    title: 'C',
    topics: [
      {
        id: 't',
        title: 'T',
        items: items.map((i) => ({
          id: i.id,
          kind: i.kind ?? 'problem',
          ...(i.pluginId ? { pluginId: i.pluginId } : {}),
          ...(i.prereqs ? { prereqs: i.prereqs } : {}),
        })),
      },
    ],
  };
}

const bindsAll = { hasPlugin: () => true };

describe('checkBindings', () => {
  it('flags a problem item bound to an unknown plugin', () => {
    const catalog = buildCatalog([courseOf([{ id: 'a', pluginId: 'ghost' }])]);
    const errors = checkBindings(catalog, { hasPlugin: (id) => id !== 'ghost' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("unknown plugin 'ghost'");
  });

  it('passes when every plugin id resolves', () => {
    const catalog = buildCatalog([courseOf([{ id: 'a', pluginId: 'real' }])]);
    expect(checkBindings(catalog, { hasPlugin: () => true })).toEqual([]);
  });

  it('flags a reading item with no lesson only when the lesson binder exists', () => {
    const catalog = buildCatalog([courseOf([{ id: 'lesson-1', kind: 'reading' }])]);
    expect(checkBindings(catalog, bindsAll)).toEqual([]); // no binder → not checked
    const errors = checkBindings(catalog, { ...bindsAll, hasLesson: () => false });
    expect(errors[0]).toContain("item 'lesson-1' (reading) has no lesson");
  });
});

describe('checkPrereqRefs', () => {
  it('flags a prereq that references a missing item', () => {
    const catalog = buildCatalog([courseOf([{ id: 'a', prereqs: ['nope'] }])]);
    const errors = checkPrereqRefs(catalog);
    expect(errors[0]).toContain("unknown prereq 'nope'");
  });

  it('passes when every prereq resolves', () => {
    const catalog = buildCatalog([courseOf([{ id: 'a' }, { id: 'b', prereqs: ['a'] }])]);
    expect(checkPrereqRefs(catalog)).toEqual([]);
  });
});

describe('checkPrereqDag', () => {
  it('detects a two-node cycle', () => {
    const catalog = buildCatalog([
      courseOf([
        { id: 'a', prereqs: ['b'] },
        { id: 'b', prereqs: ['a'] },
      ]),
    ]);
    const errors = checkPrereqDag(catalog);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('prereq cycle detected');
  });

  it('accepts a DAG', () => {
    const catalog = buildCatalog([
      courseOf([{ id: 'a' }, { id: 'b', prereqs: ['a'] }, { id: 'c', prereqs: ['a', 'b'] }]),
    ]);
    expect(checkPrereqDag(catalog)).toEqual([]);
  });

  it('does not crash on a dangling prereq (reported separately by checkPrereqRefs)', () => {
    const catalog = buildCatalog([courseOf([{ id: 'a', prereqs: ['ghost'] }])]);
    expect(checkPrereqDag(catalog)).toEqual([]);
  });
});

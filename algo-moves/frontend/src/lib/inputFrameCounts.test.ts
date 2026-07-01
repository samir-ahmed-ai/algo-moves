import { describe, expect, it } from 'vitest';
import { definePlugin, type ProblemPlugin } from '../core/types';
import {
  computeInputFrameCounts,
  inputFrameCount,
  inputFrameCountsKey,
} from './inputFrameCounts';

const plugin = definePlugin({
  meta: {
    id: 'test-counts',
    title: 'Test',
    difficulty: 'Easy',
    tags: [],
    summary: 'frame count helper test fixture',
  },
  inputs: [
    { id: 'a', label: 'one step', value: 1 },
    { id: 'b', label: 'three steps', value: 3 },
  ],
  record: (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      move: { type: 'STEP', note: String(i), caption: `step ${i}` },
      state: { i },
    })),
  View: () => null,
});

/** Mirrors ExamplesPanelBody / BigOPanelBody — reads cached counts, never re-records per render. */
function panelOpsFromCache(
  p: ProblemPlugin<number, { i: number }>,
  counts: ReturnType<typeof computeInputFrameCounts>,
  activeId: string,
) {
  return p.inputs.map((inp) => ({
    id: inp.id,
    ops: inputFrameCount(counts, inp.id),
    active: inp.id === activeId,
  }));
}

describe('inputFrameCounts', () => {
  it('computes counts per input id', () => {
    const counts = computeInputFrameCounts(plugin);
    expect(inputFrameCount(counts, 'a')).toBe(1);
    expect(inputFrameCount(counts, 'b')).toBe(3);
    expect(inputFrameCount(counts, 'missing')).toBe(0);
  });

  it('builds a stable memo key from input ids', () => {
    expect(inputFrameCountsKey(plugin.inputs)).toBe('a\0b');
  });

  it('supports panel-style ops lookup without calling record() again', () => {
    const counts = computeInputFrameCounts(plugin);
    const rows = panelOpsFromCache(plugin, counts, 'b');
    expect(rows).toEqual([
      { id: 'a', ops: 1, active: false },
      { id: 'b', ops: 3, active: true },
    ]);
    expect(rows.every((r) => r.ops === inputFrameCount(counts, r.id))).toBe(true);
  });
});

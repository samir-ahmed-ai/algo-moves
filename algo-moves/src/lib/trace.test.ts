import { describe, expect, it } from 'vitest';
import { stackFrames, transformFramesForGraph } from './trace';
import type { Frame } from '../core/types';

describe('stackFrames', () => {
  it('interleaves two frame lanes', () => {
    const a: Frame[] = [{ move: { type: 'A', note: '', caption: 'a1' }, state: 1 }];
    const b: Frame[] = [{ move: { type: 'B', note: '', caption: 'b1' }, state: 2 }];
    const out = stackFrames([a, b]);
    expect(out).toHaveLength(2);
    expect(out[0].move.type).toBe('A');
    expect(out[1].move.type).toBe('B');
  });
});

describe('transformFramesForGraph', () => {
  const base: Frame[] = [
    { move: { type: 'step', note: '', caption: 's1' }, state: 0 },
    { move: { type: 'step', note: '', caption: 's2' }, state: 1 },
  ];

  it('stacks independent effect chains in parallel', () => {
    const nodes = [
      { id: 'e1', type: 'effect', data: { effectId: 'reverse' }, position: { x: 0, y: 0 } },
      { id: 'e2', type: 'effect', data: { effectId: 'reverse' }, position: { x: 200, y: 0 } },
    ];
    const out = transformFramesForGraph(base, nodes, []);
    expect(out).toHaveLength(4);
  });
});

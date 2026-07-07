import { describe, expect, it } from 'vitest';
import type { Frame, Player } from '@/core';
import { buildFrameContextValue, diffFrameStates, EMPTY_FRAME } from './frameDiff';

const player = { index: 0 } as Player;

describe('buildFrameContextValue', () => {
  it('uses EMPTY_FRAME when frames are empty (standalone canvas)', () => {
    const value = buildFrameContextValue([], player, undefined);
    expect(value.frame).toBe(EMPTY_FRAME);
    expect(value.changedKeys).toEqual([]);
  });

  it('diffs consecutive frame states', () => {
    const frames: Frame[] = [
      { move: { type: 'a', note: '', caption: '' }, state: { x: 1 } },
      { move: { type: 'b', note: '', caption: '' }, state: { x: 2 } },
    ];
    const value = buildFrameContextValue(frames, { ...player, index: 1 }, frames[1]);
    expect(value.changedKeys).toEqual(['x']);
  });

  it('handles cyclic state values as changed instead of throwing', () => {
    const prev: Record<string, unknown> = {};
    prev.self = prev;
    const cur: Record<string, unknown> = {};
    cur.self = cur;
    expect(diffFrameStates(prev, cur)).toEqual(['self']);
  });
});

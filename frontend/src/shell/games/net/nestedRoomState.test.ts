import { describe, expect, it } from 'vitest';
import {
  mergeNestedRoomState,
  nestedSnapshotEqual,
  readNestedRoomState,
  stripNestedGameState,
} from './nestedRoomState';

describe('nestedRoomState', () => {
  it('merges game state under a key without dropping room metadata', () => {
    const room = { game: 'mind-meld', started: true, locale: 'en' };
    const merged = mergeNestedRoomState(room, 'meld', { round: 0, phase: 'answer' });
    expect(merged).toEqual({
      game: 'mind-meld',
      started: true,
      locale: 'en',
      meld: { round: 0, phase: 'answer' },
    });
  });

  it('reads nested game state when present', () => {
    const shared = { game: 'would-you-rather', wyr: { phase: 'picking', round: 1 } };
    const state = readNestedRoomState(shared, 'wyr', (v): v is { phase: string; round: number } =>
      !!v && typeof v === 'object' && 'phase' in v,
    );
    expect(state).toEqual({ phase: 'picking', round: 1 });
  });

  it('returns null when nested key is missing', () => {
    expect(readNestedRoomState({ game: 'tic-tac-toe' }, 'ttt', (v): v is object => !!v)).toBeNull();
  });

  it('strips nested game keys while preserving room metadata', () => {
    const room = {
      game: 'mind-meld',
      started: true,
      locale: 'en',
      ttt: { board: [], gen: 0 },
      meld: { round: 2 },
      wyr: { phase: 'over' },
    };
    expect(stripNestedGameState(room)).toEqual({
      game: 'mind-meld',
      started: true,
      locale: 'en',
    });
  });

  it('compares nested snapshots by value', () => {
    expect(nestedSnapshotEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(nestedSnapshotEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

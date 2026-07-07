import { describe, expect, it } from 'vitest';
import {
  applyDeltas,
  compatLabel,
  computeRoundDeltas,
  freshState,
  isMatch,
  ROUNDS,
  startGame,
  type WyrChoice,
} from './logic';

describe('would-you-rather state machine', () => {
  it('starts in category-pick with empty prompts', () => {
    const state = freshState();
    expect(state.phase).toBe('category-pick');
    expect(state.round).toBe(0);
    expect(state.prompts).toEqual([]);
    expect(state.deadline).toBeNull();
  });

  it('transitions to picking with seeded prompts on startGame', () => {
    const next = startGame(['fun'], 42);
    expect(next.phase).toBe('picking');
    expect(next.round).toBe(0);
    expect(next.prompts).toHaveLength(ROUNDS);
    expect(next.categories).toEqual(['fun']);
    expect(next.answers).toEqual({});
    expect(next.scores).toEqual({});
  });

  it('detects matching picks between two players', () => {
    const answers: Record<string, WyrChoice> = { host: 'a', guest: 'a' };
    expect(isMatch(answers, ['host', 'guest'])).toBe(true);
    expect(isMatch({ host: 'a', guest: 'b' }, ['host', 'guest'])).toBe(false);
    expect(isMatch({ host: 'a' }, ['host', 'guest'])).toBe(false);
  });

  it('awards +2 each on a match, +1 each on a split', () => {
    expect(computeRoundDeltas({ a: 'a', b: 'a' }, ['a', 'b'])).toEqual({ a: 2, b: 2 });
    expect(computeRoundDeltas({ a: 'a', b: 'b' }, ['a', 'b'])).toEqual({ a: 1, b: 1 });
  });

  it('folds round deltas into cumulative scores', () => {
    const scores = applyDeltas({ a: 2 }, { a: 1, b: 2 });
    expect(scores).toEqual({ a: 3, b: 2 });
  });

  it('labels compatibility from match ratio', () => {
    expect(compatLabel(6, 8)).toBe('soulmates');
    expect(compatLabel(4, 8)).toBe('wellMatched');
    expect(compatLabel(2, 8)).toBe('beautyInDifference');
    expect(compatLabel(0, 0)).toBe('beautyInDifference');
  });
});

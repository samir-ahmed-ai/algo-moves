import { describe, expect, it } from 'vitest';
import { clampNumber, decideWinner, evaluateGuess, MAX_NUMBER, MIN_NUMBER } from './logic';

describe('number-duel logic', () => {
  it('evaluates guesses relative to the secret', () => {
    expect(evaluateGuess(50, 30)).toBe('higher');
    expect(evaluateGuess(50, 70)).toBe('lower');
    expect(evaluateGuess(50, 50)).toBe('correct');
  });

  it('clamps and rounds into range', () => {
    expect(clampNumber(0)).toBe(MIN_NUMBER);
    expect(clampNumber(999)).toBe(MAX_NUMBER);
    expect(clampNumber(42.4)).toBe(42);
    expect(clampNumber(NaN)).toBe(MIN_NUMBER);
  });

  it('awards the win to fewer guesses', () => {
    expect(decideWinner(4, 7)).toBe('host');
    expect(decideWinner(9, 3)).toBe('guest');
    expect(decideWinner(5, 5)).toBe('draw');
  });
});

import { describe, expect, it } from 'vitest';
import {
  clampNumber,
  decideWinner,
  evaluateGuess,
  MAX_NUMBER,
  MIN_NUMBER,
  narrowedRange,
  proximityBand,
  proximityFraction,
} from './logic';

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

  it('bands proximity from freezing to burning', () => {
    expect(proximityBand(50, 50)).toBe('burning');
    expect(proximityBand(50, 52)).toBe('burning');
    expect(proximityBand(50, 55)).toBe('hot');
    expect(proximityBand(50, 60)).toBe('warm');
    expect(proximityBand(50, 75)).toBe('cold');
    expect(proximityBand(50, 99)).toBe('freezing');
    // symmetric below the secret
    expect(proximityBand(50, 45)).toBe('hot');
  });

  it('reports proximity as a 0..1 closeness fraction', () => {
    expect(proximityFraction(50, 50)).toBe(1);
    expect(proximityFraction(MIN_NUMBER, MAX_NUMBER)).toBe(0);
    expect(proximityFraction(50, 60)).toBeCloseTo(1 - 10 / (MAX_NUMBER - MIN_NUMBER));
    expect(proximityFraction(50, 40)).toBeCloseTo(proximityFraction(50, 60));
  });

  it('narrows the plausible range from higher/lower clues', () => {
    expect(narrowedRange([])).toEqual({ min: MIN_NUMBER, max: MAX_NUMBER });
    // guessed 30 → too low (aim higher): floor rises to 31
    expect(narrowedRange([{ value: 30, result: 'higher' }])).toEqual({ min: 31, max: MAX_NUMBER });
    // then guessed 80 → too high (aim lower): ceiling drops to 79
    expect(
      narrowedRange([
        { value: 30, result: 'higher' },
        { value: 80, result: 'lower' },
      ]),
    ).toEqual({ min: 31, max: 79 });
    // a correct guess pins the range exactly
    expect(narrowedRange([{ value: 42, result: 'correct' }])).toEqual({ min: 42, max: 42 });
  });
});

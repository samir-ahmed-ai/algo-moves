export type GuessResult = 'higher' | 'lower' | 'correct';

export const MIN_NUMBER = 1;
export const MAX_NUMBER = 100;

/** Clamp any input into the legal secret/guess range. */
export function clampNumber(n: number): number {
  if (Number.isNaN(n)) return MIN_NUMBER;
  return Math.max(MIN_NUMBER, Math.min(MAX_NUMBER, Math.round(n)));
}

/**
 * Evaluate a guess against the keeper's secret, from the guesser's point of view:
 * 'higher' means the secret is above the guess (aim higher).
 */
export function evaluateGuess(secret: number, guess: number): GuessResult {
  if (guess === secret) return 'correct';
  return secret > guess ? 'higher' : 'lower';
}

export type Winner = 'host' | 'guest' | 'draw';

/** Fewer guesses wins. Counts are the guesses each player needed to crack the other's number. */
export function decideWinner(hostGuesses: number, guestGuesses: number): Winner {
  if (hostGuesses < guestGuesses) return 'host';
  if (guestGuesses < hostGuesses) return 'guest';
  return 'draw';
}

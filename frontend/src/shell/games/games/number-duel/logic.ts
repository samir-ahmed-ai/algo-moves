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

// ── Proximity ("hot / cold") feedback ────────────────────────────────────────

/**
 * How close a guess is to the secret, coldest → hottest. Used to tint the guess
 * feed and drive the heat label so the guesser can feel themselves homing in.
 */
export type HeatLevel = 'burning' | 'hot' | 'warm' | 'cold' | 'freezing';

/** The absolute distance below which we call it a bullseye-adjacent hit. */
const HEAT_BANDS: { max: number; level: HeatLevel }[] = [
  { max: 2, level: 'burning' },
  { max: 6, level: 'hot' },
  { max: 14, level: 'warm' },
  { max: 30, level: 'cold' },
  { max: Infinity, level: 'freezing' },
];

/** Classify a guess into a heat band by its distance from the secret. */
export function proximityBand(secret: number, guess: number): HeatLevel {
  const dist = Math.abs(secret - guess);
  return HEAT_BANDS.find((b) => dist <= b.max)!.level;
}

/**
 * Closeness as a 0..1 fraction (1 = exact hit) across the full legal span.
 * Drives the heat meter fill width so proximity reads continuously, not just in
 * discrete bands.
 */
export function proximityFraction(secret: number, guess: number): number {
  const span = MAX_NUMBER - MIN_NUMBER;
  const dist = Math.abs(secret - guess);
  return Math.max(0, Math.min(1, 1 - dist / span));
}

// ── Narrowing search range ───────────────────────────────────────────────────

export interface Range {
  min: number;
  max: number;
}

/**
 * Fold the higher/lower feedback the guesser has received into the interval the
 * secret must still live in. 'higher' means aim above the guess (raise the
 * floor); 'lower' means aim below (drop the ceiling). Powers the shrinking
 * range bar so the guesser sees the noose tighten with every clue.
 */
export function narrowedRange(
  feedback: { value: number; result: GuessResult }[],
): Range {
  let min = MIN_NUMBER;
  let max = MAX_NUMBER;
  for (const { value, result } of feedback) {
    if (result === 'higher') min = Math.max(min, value + 1);
    else if (result === 'lower') max = Math.min(max, value - 1);
    else {
      // A correct guess pins the range to the exact value.
      min = value;
      max = value;
    }
  }
  if (min > max) {
    // Contradictory clues (shouldn't happen with honest feedback) — collapse
    // sanely rather than invert.
    return { min: max, max: min };
  }
  return { min, max };
}

import { shuffleSeeded } from './shuffleSeeded';

/**
 * Build a multiple-choice option list for a given `round`: the correct `answer`
 * plus up to `distractors` wrong options drawn from `pool`, deterministically
 * shuffled by round so options stay stable within a round but reshuffle each round.
 *
 * Shared by the predict-the-move and complexity practice panels.
 */
export function buildShuffledChoices<T>(answer: T, pool: T[], round: number, distractors = 3): T[] {
  const distract = shuffleSeeded(
    pool.filter((p) => p !== answer),
    round,
  ).slice(0, distractors);
  return shuffleSeeded([answer, ...distract], round + 1);
}

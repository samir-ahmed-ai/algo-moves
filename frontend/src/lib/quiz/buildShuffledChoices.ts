import { shuffleSeeded } from './shuffleSeeded';

/**
 * Build a multiple-choice option list for a given `round`: the correct `answer`
 * plus up to `distractors` wrong options drawn from `pool`, deterministically
 * shuffled by round so options stay stable within a round but reshuffle each round.
 *
 * Shared by the predict-the-move and complexity practice panels.
 */
export function buildShuffledChoices<T>(
  answer: T,
  pool: readonly T[],
  round: number,
  distractors = 3,
): T[] {
  const safeRound = Number.isFinite(round) ? Math.trunc(round) : 0;
  const limit = Number.isFinite(distractors) ? Math.max(0, Math.floor(distractors)) : 0;
  const distract = shuffleSeeded(
    pool.filter((p) => p !== answer),
    safeRound,
  ).slice(0, limit);
  return shuffleSeeded([answer, ...distract], safeRound + 1);
}

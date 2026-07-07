import type { QuizQuestion } from '@/core/types';
import { QUIZ_SHUFFLE_BY_DEFAULT } from './quizConstants';
import { shuffleSeeded } from './shuffleSeeded';

const MAX_SEED = 0x7fffffff;

export function randomShuffleSeed(): number {
  return Math.floor(Math.random() * MAX_SEED);
}

/** Fresh seed for a quiz run — random per session, stable within a run until retry. */
export function newQuizRunSeed(): number {
  return randomShuffleSeed();
}

/** Deterministic per-question seed from a run seed, question index, and retry attempt. */
export function quizQuestionSeed(runSeed: number, questionIndex: number, attempt = 0): number {
  const safeRunSeed = Number.isFinite(runSeed) ? Math.trunc(runSeed) : 0;
  const safeQuestionIndex = Number.isFinite(questionIndex)
    ? Math.max(0, Math.trunc(questionIndex))
    : 0;
  const safeAttempt = Number.isFinite(attempt) ? Math.max(0, Math.trunc(attempt)) : 0;
  return (safeRunSeed + safeAttempt * 997 + safeQuestionIndex * 131) | 0;
}

/** Return a copy of the question with choices in a new order. */
export function shuffleQuizQuestion(
  q: QuizQuestion,
  seed: number = randomShuffleSeed(),
  shuffle = QUIZ_SHUFFLE_BY_DEFAULT,
): QuizQuestion {
  if (!shuffle || q.choices.length < 2) return { ...q, choices: q.choices.slice() };
  return { ...q, choices: shuffleSeeded(q.choices, seed) };
}

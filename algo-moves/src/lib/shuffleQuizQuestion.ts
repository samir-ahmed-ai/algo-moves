import type { QuizQuestion } from '../core/types';
import { QUIZ_SHUFFLE_BY_DEFAULT } from './quizConstants';
import { shuffleSeeded } from './shuffleSeeded';

export function randomShuffleSeed(): number {
  return (Math.random() * 0x7fffffff) | 0;
}

/** Fresh seed for a quiz run — random per session, stable within a run until retry. */
export function newQuizRunSeed(): number {
  return randomShuffleSeed();
}

/** Deterministic per-question seed from a run seed, question index, and retry attempt. */
export function quizQuestionSeed(runSeed: number, questionIndex: number, attempt = 0): number {
  return (runSeed + attempt * 997 + questionIndex * 131) | 0;
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

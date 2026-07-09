import type { QuizQuestion } from '@/core/types';

/**
 * Checkpoint scoring — a graded assessment, not a practice quiz. Every answer counts
 * (no restart-on-wrong); the final percentage decides pass/fail. Pure and tested.
 */

export interface CheckpointResult {
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
}

/** Index of the single correct choice, or -1 if malformed. */
export function correctIndex(q: QuizQuestion): number {
  return q.choices.findIndex((c) => c.correct);
}

/** Deterministic first-N sample (no RNG so seed + tests stay stable). */
export function drawQuestions(questions: QuizQuestion[], drawCount?: number): QuizQuestion[] {
  if (!drawCount || drawCount >= questions.length) return questions;
  return questions.slice(0, drawCount);
}

export function scoreCheckpoint(
  questions: QuizQuestion[],
  answers: ReadonlyArray<number | null>,
  passPct: number,
): CheckpointResult {
  const total = questions.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    const answer = answers[i];
    if (answer != null && answer === correctIndex(questions[i]!)) correct++;
  }
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, pct, passed: pct >= passPct };
}

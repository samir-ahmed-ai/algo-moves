import type { QuizQuestion } from '@/core/types';

/**
 * A graded checkpoint — the first-class `kind:'quiz'` content type. Unlike practice
 * quizzes (restart-on-wrong, ephemeral), a checkpoint records every answer, computes
 * a final score, and certifies the scope on a pass. Authored as data (its own
 * `QuizQuestion`s) so it round-trips into the read-only seed like everything else.
 */
export interface CheckpointDef {
  /** Matches the `kind:'quiz'` catalog item id (or its explicit `lessonId`/id). */
  id: string;
  /** The course this checkpoint certifies. */
  courseId: string;
  title: string;
  summary?: string;
  /** Passing percentage, 0–100. */
  passPct: number;
  /** If set, sample this many questions from the pool; otherwise use all. */
  drawCount?: number;
  questions: QuizQuestion[];
}

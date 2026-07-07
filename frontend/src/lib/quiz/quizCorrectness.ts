import type { QuizQuestion } from '@/core/types';

/** Structural invariants every quiz question must satisfy. */
export function quizCorrectnessIssues(q: QuizQuestion): string[] {
  const issues: string[] = [];
  if (q.choices.length < 2) issues.push('fewer than 2 choices');
  const correct = q.choices.filter((c) => c.correct === true);
  if (correct.length !== 1) issues.push(`expected 1 correct choice, got ${correct.length}`);
  const labels = q.choices.map((c) => c.label.trim());
  const unique = new Set(labels);
  if (unique.size !== labels.length) issues.push('duplicate choice labels');
  const correctLabel = correct[0]?.label.trim();
  if (correctLabel) {
    for (const c of q.choices) {
      if (!c.correct && c.label.trim() === correctLabel) {
        issues.push('non-correct choice matches correct label');
        break;
      }
    }
  }
  return issues;
}

import type { QuizQuestion } from '@/core/types';

/** Structural invariants every quiz question must satisfy. */
export function quizCorrectnessIssues(q: QuizQuestion): string[] {
  const issues: string[] = [];
  if (!q.id.trim()) issues.push('missing question id');
  if (!q.prompt.trim()) issues.push('missing question prompt');
  if (!q.explain.trim()) issues.push('missing explanation');
  if (q.choices.length < 2) issues.push('fewer than 2 choices');
  const correct = q.choices.filter((c) => c.correct === true);
  if (correct.length !== 1) issues.push(`expected 1 correct choice, got ${correct.length}`);
  const labels = q.choices.map((c) => c.label.trim());
  if (labels.some((label) => label.length === 0)) issues.push('blank choice label');
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

import type { QuizQuestion } from '../../core/types';
import { COMPLEXITY_POOL } from '@/lib/quiz';
import type { PrepProblem } from './prepTypes';
import { PREP_DATA } from './prepManifest';

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic pseudo-shuffle — stable across reloads for a given seed. */
function seededOrder<T>(items: T[], seed: number): T[] {
  return items
    .map((item, i) => ({ item, k: Math.imul(seed + i, 2654435761) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .map(({ item }) => item);
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function pickDistractors(correct: string, pool: string[], count: number, seed: number): string[] {
  const trimmed = correct.trim();
  const candidates = uniqueNonEmpty(pool).filter((v) => v.trim() !== trimmed);
  return seededOrder(candidates, seed).slice(0, count);
}

function fmtPattern(label: string, correct: boolean): { label: string; correct?: boolean } {
  const detail = correct ? 'fits this problem' : 'different approach';
  return { label: `${label} — ${detail}`, correct: correct || undefined };
}

function fmtTime(label: string, correct: boolean): { label: string; correct?: boolean } {
  const detail = correct ? 'standard solution runtime' : 'wrong order of growth';
  return { label: `${label} — ${detail}`, correct: correct || undefined };
}

function buildChoices(
  correct: string,
  distractors: string[],
  fmt: (label: string, correct: boolean) => { label: string; correct?: boolean },
): { label: string; correct?: boolean }[] {
  return [fmt(correct, true), ...distractors.map((d) => fmt(d, false))];
}

/**
 * Build up to two language-agnostic default MCQs from prep manifest metadata
 * (approach pattern + Big-O time) when a simulator ships no hand-authored
 * practice quiz. No question references a specific language or the solution code.
 */
export function defaultPrepQuiz(
  p: PrepProblem,
  siblings: PrepProblem[] = PREP_DATA,
): QuizQuestion[] {
  const seed = hashSeed(p.id);
  const topicPeers = siblings.filter((s) => s.topic === p.topic && s.id !== p.id);
  const coursePeers = siblings.filter((s) => s.course === p.course && s.id !== p.id);

  const questions: QuizQuestion[] = [];

  if (p.pattern.trim()) {
    const patternPool = uniqueNonEmpty([
      ...topicPeers.map((s) => s.pattern),
      ...coursePeers.map((s) => s.pattern),
    ]);
    const patternDistractors = pickDistractors(p.pattern, patternPool, 3, seed);
    const patternChoices = buildChoices(p.pattern, patternDistractors, fmtPattern);
    questions.push({
      id: `${p.id}:pattern`,
      prompt: `Which approach fits “${p.title}”?`,
      choices: patternChoices,
      explain: p.visual || p.pattern,
    });
  }

  const timePool = uniqueNonEmpty([...topicPeers.map((s) => s.time), ...COMPLEXITY_POOL]);
  const timeDistractors = pickDistractors(p.time, timePool, 3, seed + 2);
  const timeChoices = buildChoices(p.time || 'O(n)', timeDistractors, fmtTime);

  if (p.time) {
    questions.push({
      id: `${p.id}:time`,
      prompt: `What is the time complexity of the standard solution?`,
      choices: timeChoices,
      explain: p.visual || `${p.time} time, ${p.space || '—'} space.`,
    });
  }

  return questions;
}

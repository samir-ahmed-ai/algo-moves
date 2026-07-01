import type { QuizQuestion } from '../../core/types';
import { COMPLEXITY_POOL } from '../../lib/complexityHints';
import { truncateAtWord } from '../../lib/quizLabelRules';
import type { PrepProblem } from './prepFactory';
import { PREP_DATA } from './prepManifest';

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic pseudo-shuffle — stable across reloads for a given seed. */
function seededOrder<T>(items: T[], seed: number): T[] {
  return items
    .map((item, i) => ({ item, k: (Math.imul(seed + i, 2654435761) >>> 0) }))
    .sort((a, b) => a.k - b.k)
    .map(({ item }) => item);
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function pickDistractors(correct: string, pool: string[], count: number, seed: number): string[] {
  const candidates = uniqueNonEmpty(pool).filter((v) => v !== correct);
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

function memorizeHeadline(label: string): string {
  const clean = label.replace(/`/g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const fn = clean.match(/^(DENSE_RANK|ROW_NUMBER|RANK|NTILE|LEAD|LAG)\b/i)?.[1];
  if (fn) return `${fn.toUpperCase()} window fn`;
  const beforeOver = clean.split(/\s+OVER\b/i)[0]?.trim();
  if (beforeOver && beforeOver.length <= 36) return beforeOver;
  return truncateAtWord(clean, 28);
}

function fmtMemorize(label: string, correct: boolean): { label: string; correct?: boolean } {
  const headline = memorizeHeadline(label);
  const detail = correct
    ? truncateAtWord(label.replace(/`/g, '').trim(), 38)
    : 'from another problem';
  let out = `${headline} — ${detail}`;
  if (out.length > 72) out = `${headline} — ${truncateAtWord(detail, 38)}`;
  return { label: out.slice(0, 72), correct: correct || undefined };
}

function buildChoices(
  correct: string,
  distractors: string[],
  fmt: (label: string, correct: boolean) => { label: string; correct?: boolean },
): { label: string; correct?: boolean }[] {
  return [fmt(correct, true), ...distractors.map((d) => fmt(d, false))];
}

/**
 * Build two default MCQs from prep manifest metadata when a simulator ships no
 * hand-authored practice quiz.
 */
export function defaultPrepQuiz(p: PrepProblem, siblings: PrepProblem[] = PREP_DATA): QuizQuestion[] {
  const seed = hashSeed(p.id);
  const topicPeers = siblings.filter((s) => s.topic === p.topic && s.id !== p.id);
  const categoryPeers = siblings.filter((s) => s.category === p.category && s.id !== p.id);

  const patternPool = uniqueNonEmpty([
    ...topicPeers.map((s) => s.pattern),
    ...categoryPeers.map((s) => s.pattern),
  ]);
  const patternDistractors = pickDistractors(p.pattern, patternPool, 3, seed);
  const patternChoices = buildChoices(p.pattern, patternDistractors, fmtPattern);

  const timePool = uniqueNonEmpty([...topicPeers.map((s) => s.time), ...COMPLEXITY_POOL]);
  const timeDistractors = pickDistractors(p.time, timePool, 3, seed + 2);
  const timeChoices = buildChoices(p.time || 'O(n)', timeDistractors, fmtTime);

  const questions: QuizQuestion[] = [
    {
      id: `${p.id}:pattern`,
      prompt: `Which approach fits “${p.title}”?`,
      choices: patternChoices,
      explain: p.visual || p.pattern,
    },
  ];

  if (p.time) {
    questions.push({
      id: `${p.id}:time`,
      prompt: `What is the time complexity of the standard solution?`,
      choices: timeChoices,
      explain: p.visual || `${p.time} time, ${p.space || '—'} space.`,
    });
  } else if (p.memorize) {
    const memorizeSnippet = p.memorize.length > 72 ? `${p.memorize.slice(0, 69)}…` : p.memorize;
    const memorizeDistractors = pickDistractors(
      p.memorize,
      topicPeers.map((s) => s.memorize),
      3,
      seed + 4,
    );
    questions.push({
      id: `${p.id}:memorize`,
      prompt: `Which memorization line matches this problem?`,
      choices: buildChoices(p.memorize, memorizeDistractors, fmtMemorize),
      explain: memorizeSnippet,
    });
  }

  return questions;
}

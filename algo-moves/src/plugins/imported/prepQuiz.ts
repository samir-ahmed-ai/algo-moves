import type { QuizQuestion } from '../../core/types';
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

function shuffleChoices(labels: string[], seed: number): { label: string; correct?: boolean }[] {
  const correct = labels[0];
  return seededOrder(labels, seed).map((label) => ({ label, correct: label === correct }));
}

/**
 * Build two default MCQs from prep manifest metadata when a simulator ships no
 * hand-authored practice quiz.
 */
export function defaultPrepQuiz(p: PrepProblem, siblings: PrepProblem[] = PREP_DATA): QuizQuestion[] {
  const seed = hashSeed(p.id);
  const topicPeers = siblings.filter((s) => s.topic === p.topic && s.id !== p.id);

  const patternPool = uniqueNonEmpty([
    ...topicPeers.map((s) => s.pattern),
    ...siblings.slice(0, 40).map((s) => s.pattern),
  ]);
  const patternDistractors = pickDistractors(p.pattern, patternPool, 3, seed);
  const patternChoices = shuffleChoices([p.pattern, ...patternDistractors], seed + 1);

  const timePool = uniqueNonEmpty([
    ...topicPeers.map((s) => s.time),
    'O(1)',
    'O(log n)',
    'O(n)',
    'O(n log n)',
    'O(n²)',
  ]);
  const timeDistractors = pickDistractors(p.time, timePool, 3, seed + 2);
  const timeChoices = shuffleChoices([p.time || 'O(n)', ...timeDistractors], seed + 3);

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
    questions.push({
      id: `${p.id}:memorize`,
      prompt: `Which memorization line matches this problem?`,
      choices: shuffleChoices(
        [
          p.memorize,
          ...pickDistractors(
            p.memorize,
            topicPeers.map((s) => s.memorize),
            3,
            seed + 4,
          ),
        ],
        seed + 5,
      ),
      explain: memorizeSnippet,
    });
  }

  return questions;
}

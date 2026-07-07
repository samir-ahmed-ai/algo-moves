import type { Difficulty } from './types';

/** Difficulty → accent color (CSS var), shared by browse rails and mobile card tints. */
export const DIFFICULTY_TINT: Readonly<Record<Difficulty, string>> = {
  Easy: 'var(--good)',
  Medium: 'var(--edge-active)',
  Hard: 'var(--bad)',
};

const DIFFICULTY_KEY: Readonly<Record<string, Difficulty>> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/** Resolve a difficulty's tint color, falling back to `fallback` for unrated/unknown. */
export function difficultyTint(difficulty: string | undefined, fallback: string): string {
  const key = DIFFICULTY_KEY[(difficulty ?? '').trim().toLowerCase()];
  return key ? DIFFICULTY_TINT[key] : fallback.trim() || 'var(--text-3)';
}

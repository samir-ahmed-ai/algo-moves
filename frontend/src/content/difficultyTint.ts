/** Difficulty → accent color (CSS var), shared by browse rails and mobile card tints. */
const DIFFICULTY_TINT: Record<string, string> = {
  Easy: 'var(--good)',
  Medium: 'var(--edge-active)',
  Hard: 'var(--bad)',
};

/** Resolve a difficulty's tint color, falling back to `fallback` for unrated/unknown. */
export function difficultyTint(difficulty: string | undefined, fallback: string): string {
  return DIFFICULTY_TINT[difficulty ?? ''] ?? fallback;
}

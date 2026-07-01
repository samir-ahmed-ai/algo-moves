/** A single option index: 0 = option a, 1 = option b. */
export type MeldChoice = 0 | 1;

/** Do the two picks for a prompt match? */
export function isMatch(mine: MeldChoice, theirs: MeldChoice): boolean {
  return mine === theirs;
}

/**
 * Playful compatibility line based on how many prompts synced up.
 * >=80% two peas in a pod · >=50% pretty in tune · else opposites attract.
 */
export function compatibilityLabel(score: number, total: number): string {
  if (total <= 0) return 'Opposites attract ✨';
  const ratio = score / total;
  if (ratio >= 0.8) return 'Two peas in a pod 🫛';
  if (ratio >= 0.5) return 'Pretty in tune 💫';
  return 'Opposites attract ✨';
}

/** A single option index: 0 = option a, 1 = option b. */
export type MeldChoice = 0 | 1;

export type CompatibilityKey = 'twoPeas' | 'prettyInTune' | 'opposites';

/** Do the two picks for a prompt match? */
export function isMatch(mine: MeldChoice, theirs: MeldChoice): boolean {
  return mine === theirs;
}

/**
 * Playful compatibility key based on how many prompts synced up.
 * >=80% two peas · >=50% pretty in tune · else opposites attract.
 */
export function compatibilityKey(score: number, total: number): CompatibilityKey {
  if (total <= 0) return 'opposites';
  const ratio = score / total;
  if (ratio >= 0.8) return 'twoPeas';
  if (ratio >= 0.5) return 'prettyInTune';
  return 'opposites';
}

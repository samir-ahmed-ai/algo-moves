/** A single option index: 0 = option a, 1 = option b. */
export type MeldChoice = 0 | 1;

export type CompatibilityKey = 'twoPeas' | 'prettyInTune' | 'opposites';

/** Do the two picks for a prompt match? */
export function isMatch(mine: MeldChoice, theirs: MeldChoice): boolean {
  return mine === theirs;
}

/**
 * Playful compatibility key based on how in-sync the players were.
 * Works off a 0..1 ratio so it serves both the 2-player matched-count and the
 * N-player group-sync percentage.
 * >=80% two peas · >=50% pretty in tune · else opposites attract.
 */
export function compatibilityKeyFromRatio(ratio: number): CompatibilityKey {
  if (ratio >= 0.8) return 'twoPeas';
  if (ratio >= 0.5) return 'prettyInTune';
  return 'opposites';
}

/**
 * Playful compatibility key based on how many prompts synced up.
 * >=80% two peas · >=50% pretty in tune · else opposites attract.
 */
export function compatibilityKey(score: number, total: number): CompatibilityKey {
  if (total <= 0) return 'opposites';
  return compatibilityKeyFromRatio(score / total);
}

/**
 * Plurality agreement for a single group round: the fraction of answers that
 * landed on the most-popular option. 1.0 = everyone agreed; 0.5 = a dead split.
 * Undecided (null) picks are ignored; an all-empty round scores 0.
 */
export function pluralityAgreement(choices: (MeldChoice | null)[]): number {
  let a = 0;
  let b = 0;
  for (const c of choices) {
    if (c === 0) a++;
    else if (c === 1) b++;
  }
  const answered = a + b;
  if (answered === 0) return 0;
  return Math.max(a, b) / answered;
}

/**
 * Group sync percentage (0..100) averaged over every round played. Each round
 * contributes its plurality agreement; the mean is scaled to a whole percent.
 * Rounds with no answers are skipped so a partial game reads fairly.
 */
export function groupSyncPercent(rounds: (MeldChoice | null)[][]): number {
  const scored = rounds
    .map((r) => ({ agreement: pluralityAgreement(r), answered: r.some((c) => c !== null) }))
    .filter((r) => r.answered);
  if (scored.length === 0) return 0;
  const mean = scored.reduce((sum, r) => sum + r.agreement, 0) / scored.length;
  return Math.round(mean * 100);
}

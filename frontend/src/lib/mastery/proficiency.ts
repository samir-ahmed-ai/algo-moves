/**
 * A real mastery model: proficiency blends FSRS retrievability (how well the item is
 * likely retained right now) with observed accuracy. Because retrievability decays as
 * time passes since the last review, "Mastered" naturally slips back toward
 * "Proficient" when an item goes un-reviewed — the forgetting curve, sourced from the
 * FSRS card rather than an ad-hoc decay constant.
 *
 * Pure and store-free (the `lib` layer may not import `store`); callers map an
 * `SrsCard` + `ProblemStat` into `ProficiencyInput`.
 */

export interface ProficiencyInput {
  /** FSRS stability in days (0 when the item has no review card yet). */
  stability: number;
  /** Days elapsed since the last review (0 when just reviewed / unknown). */
  elapsedDays: number;
  /** FSRS repetitions — a proxy for "has been genuinely recalled at least once". */
  reps: number;
  attempts: number;
  correct: number;
}

export type MasteryBand = 'New' | 'Learning' | 'Familiar' | 'Proficient' | 'Mastered';

const LN_09 = Math.log(0.9);

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}

/** FSRS retrievability R = 0.9^(elapsed/stability) ∈ (0,1]; 0 when never scheduled. */
export function retrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  return clamp01(Math.exp((LN_09 * Math.max(0, elapsedDays)) / stability));
}

export function proficiency(input: ProficiencyInput): number {
  const r = retrievability(input.stability, input.elapsedDays);
  const accuracy = input.attempts > 0 ? clamp01(input.correct / input.attempts) : 0;
  let p = 0.6 * r + 0.4 * accuracy;
  // Cannot reach Proficient/Mastered without at least one real recall — accuracy on
  // quizzes alone should not certify retention.
  if (input.reps < 1) p = Math.min(p, 0.74);
  return clamp01(p);
}

export function masteryBand(p: number): MasteryBand {
  if (p >= 0.9) return 'Mastered';
  if (p >= 0.75) return 'Proficient';
  if (p >= 0.5) return 'Familiar';
  if (p >= 0.2) return 'Learning';
  return 'New';
}

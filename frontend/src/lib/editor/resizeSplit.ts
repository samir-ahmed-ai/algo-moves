/** Clamp a split percentage into the usable range. */
export function clampSplitPct(pct: number, min: number, max: number, fallback = min): number {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? Math.max(safeMin, max) : safeMin;
  const safePct = Number.isFinite(pct) ? pct : fallback;
  return Math.min(safeMax, Math.max(safeMin, safePct));
}

/** Split-pane bounds for the code editor reference/draft columns. */
export const CODE_SPLIT_MIN = 28;
export const CODE_SPLIT_MAX = 72;

export function clampCodeSplitPct(pct: number): number {
  return clampSplitPct(pct, CODE_SPLIT_MIN, CODE_SPLIT_MAX, 50);
}

/** Overview layout: problem statement column width. */
export const OVERVIEW_PROBLEM_MIN = 18;
export const OVERVIEW_PROBLEM_MAX = 50;
export const OVERVIEW_PROBLEM_DEFAULT = 32;
/** Concept courses (code trace, no graph board): wider problem column by default. */
export const OVERVIEW_PROBLEM_CONCEPT_DEFAULT = 42;
export const OVERVIEW_PROBLEM_CONCEPT_MAX = 55;

export function clampOverviewProblemPct(pct: number): number {
  return clampSplitPct(pct, OVERVIEW_PROBLEM_MIN, OVERVIEW_PROBLEM_MAX, OVERVIEW_PROBLEM_DEFAULT);
}

export function clampConceptOverviewProblemPct(pct: number): number {
  return clampSplitPct(
    pct,
    OVERVIEW_PROBLEM_MIN,
    OVERVIEW_PROBLEM_CONCEPT_MAX,
    OVERVIEW_PROBLEM_CONCEPT_DEFAULT,
  );
}

/** Clamp a split percentage into the usable range. */
export function clampSplitPct(pct: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, pct));
}

/** Split-pane bounds for the code editor reference/draft columns. */
export const CODE_SPLIT_MIN = 28;
export const CODE_SPLIT_MAX = 72;

export function clampCodeSplitPct(pct: number): number {
  return clampSplitPct(pct, CODE_SPLIT_MIN, CODE_SPLIT_MAX);
}

/** Overview layout: problem statement column width. */
export const OVERVIEW_PROBLEM_MIN = 18;
export const OVERVIEW_PROBLEM_MAX = 50;
export const OVERVIEW_PROBLEM_DEFAULT = 32;
/** Concept courses (code trace, no graph board): wider problem column by default. */
export const OVERVIEW_PROBLEM_CONCEPT_DEFAULT = 42;
export const OVERVIEW_PROBLEM_CONCEPT_MAX = 55;

/** Overview layout: top row height (problem + viz); bottom is recall editor. */
export const OVERVIEW_TOP_MIN = 35;
export const OVERVIEW_TOP_MAX = 80;
export const OVERVIEW_TOP_DEFAULT = 62;

/** Overview layout: viz column within the animation + transport row. */
export const OVERVIEW_VIZ_MIN = 70;
export const OVERVIEW_VIZ_MAX = 96;
export const OVERVIEW_VIZ_DEFAULT = 88;

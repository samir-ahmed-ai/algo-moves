import {
  clampConceptOverviewProblemPct,
  OVERVIEW_PROBLEM_CONCEPT_DEFAULT,
  OVERVIEW_PROBLEM_DEFAULT,
} from '@/lib/editor/resizeSplit';

/** Course ids that use code-trace / scene text viz instead of graph animations. */
const CONCEPT_COURSE_IDS: ReadonlySet<string> = new Set(['go-senior', 'openrtb-eng']);

export function isConceptCourse(item: Readonly<{ courseId: string }>): boolean {
  return CONCEPT_COURSE_IDS.has(item.courseId.trim().toLowerCase());
}

/** Widen the saved overview split once for concept courses still on the algo default. */
export function conceptOverviewProblemPct(savedPct: number): number {
  if (!Number.isFinite(savedPct)) return OVERVIEW_PROBLEM_CONCEPT_DEFAULT;
  return clampConceptOverviewProblemPct(
    savedPct === OVERVIEW_PROBLEM_DEFAULT ? OVERVIEW_PROBLEM_CONCEPT_DEFAULT : savedPct,
  );
}

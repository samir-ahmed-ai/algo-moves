import {
  OVERVIEW_PROBLEM_CONCEPT_DEFAULT,
  OVERVIEW_PROBLEM_DEFAULT,
} from '@/lib/editor/resizeSplit';

/** Course ids that use code-trace / scene text viz instead of graph animations. */
const CONCEPT_COURSE_IDS = new Set(['go-senior', 'openrtb-eng']);

export function isConceptCourse(item: { courseId: string }): boolean {
  return CONCEPT_COURSE_IDS.has(item.courseId);
}

/** Widen the saved overview split once for concept courses still on the algo default. */
export function conceptOverviewProblemPct(savedPct: number): number {
  return savedPct === OVERVIEW_PROBLEM_DEFAULT ? OVERVIEW_PROBLEM_CONCEPT_DEFAULT : savedPct;
}

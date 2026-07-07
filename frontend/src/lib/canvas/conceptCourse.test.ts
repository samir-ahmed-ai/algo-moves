import { describe, expect, it } from 'vitest';
import { conceptOverviewProblemPct, isConceptCourse } from './conceptCourse';
import {
  OVERVIEW_PROBLEM_CONCEPT_DEFAULT,
  OVERVIEW_PROBLEM_DEFAULT,
} from '@/lib/editor/resizeSplit';

describe('isConceptCourse', () => {
  it('recognises Go and OpenRTB concept courses', () => {
    expect(isConceptCourse({ courseId: 'go-senior' })).toBe(true);
    expect(isConceptCourse({ courseId: 'openrtb-eng' })).toBe(true);
    expect(isConceptCourse({ courseId: ' Go-Senior ' })).toBe(true);
  });

  it('returns false for algorithm problem courses', () => {
    expect(isConceptCourse({ courseId: 'graphs' })).toBe(false);
    expect(isConceptCourse({ courseId: 'prep-arrays' })).toBe(false);
  });
});

describe('conceptOverviewProblemPct', () => {
  it('widens the layout when still on the algorithm default', () => {
    expect(conceptOverviewProblemPct(OVERVIEW_PROBLEM_DEFAULT)).toBe(
      OVERVIEW_PROBLEM_CONCEPT_DEFAULT,
    );
  });

  it('preserves a user-customised split', () => {
    expect(conceptOverviewProblemPct(45)).toBe(45);
  });
});

import type { WorkedCase } from '../_shared/practice';
import type { SchedInput } from './index';

export const goodCases: WorkedCase<SchedInput>[] = [
  {
    id: 'classic',
    title: 'Pick by earliest finish time',
    input: {
      intervals: [
        [1, 3],
        [2, 4],
        [3, 5],
      ] as [number, number][],
    },
    inputLabel: '[[1,3],[2,4],[3,5]]',
    returns: '2 jobs: [1,3] and [3,5]',
    tone: 'ok',
    question: 'Why sort by finish time, not start time?',
    answer:
      'After accepting a job, the next compatible job is the one that finishes earliest among those that start after the last finish — greedy by finish time is optimal for interval scheduling.',
  },
];

export const badCases: WorkedCase<SchedInput>[] = [
  {
    id: 'greedy-start-fails',
    title: 'Earliest-start greedy fails',
    input: {
      intervals: [
        [1, 10],
        [2, 3],
        [4, 5],
      ] as [number, number][],
    },
    inputLabel: '[[1,10],[2,3],[4,5]]',
    returns: 'optimal count 2, not 1',
    tone: 'bad',
    question: 'Why is picking [1,10] first wrong?',
    answer:
      'The long first interval blocks two short jobs [2,3] and [4,5]. Sorting by finish time picks the short jobs first for count 2 — a counterexample to start-time greedy.',
  },
];

export const intro =
  'Interval scheduling: sort by finish time, greedily accept non-overlapping jobs.';

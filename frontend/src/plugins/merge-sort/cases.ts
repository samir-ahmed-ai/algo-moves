import type { WorkedCase } from '../_shared/practice';
import type { SortInput } from './index';

export const goodCases: WorkedCase<SortInput>[] = [
  {
    id: 'merge-runs',
    title: 'Merge two sorted runs',
    input: { values: [5, 2, 8, 1] },
    inputLabel: '[5, 2, 8, 1]',
    returns: 'sorted',
    tone: 'ok',
    question: 'When merging runs [2] and [1], which front element is written first?',
    answer:
      'Compare fronts of both runs: 1 < 2, so 1 is copied first. Merge sort always picks the smaller of the two run heads.',
  },
];

export const badCases: WorkedCase<SortInput>[] = [
  {
    id: 'reverse',
    title: 'Reverse input — many merge levels',
    input: { values: [5, 4, 3, 2, 1] },
    inputLabel: '[5, 4, 3, 2, 1]',
    returns: 'sorted in O(n log n) time',
    tone: 'bad',
    question: 'Why is merge sort still O(n log n) on reverse order?',
    answer:
      'Every merge still touches each element once per level; run width doubles each pass regardless of input order.',
  },
];

export const intro =
  'Bottom-up merge sort treats each element as a sorted run, then repeatedly merges adjacent runs by comparing their fronts and doubling run width each pass.';

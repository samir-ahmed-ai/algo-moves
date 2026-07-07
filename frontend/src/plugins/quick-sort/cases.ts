import type { WorkedCase } from '../_shared/practice';
import type { SortInput } from './index';

export const goodCases: WorkedCase<SortInput>[] = [
  {
    id: 'pivot-partition',
    title: 'Pivot lands in final position',
    input: { values: [3, 1, 4, 2] },
    inputLabel: '[3, 1, 4, 2]',
    returns: 'sorted',
    tone: 'ok',
    question: 'After partitioning on pivot 4, where does the pivot end up?',
    answer:
      'Elements ≤ pivot move left, greater move right; the pivot index is its sorted position — smaller subarrays recurse independently.',
  },
];

export const badCases: WorkedCase<SortInput>[] = [
  {
    id: 'sorted-pivot',
    title: 'Already sorted — unbalanced partitions',
    input: { values: [1, 2, 3, 4, 5] },
    inputLabel: '[1, 2, 3, 4, 5]',
    returns: 'sorted but Θ(n²) if pivot is always max',
    tone: 'bad',
    question: 'Why can quicksort degrade on sorted input?',
    answer:
      'Choosing the last element as pivot on sorted data yields empty left partitions — recursion depth becomes n instead of log n.',
  },
];

export const intro =
  'Quick sort picks a pivot, partitions so smaller values sit left and larger right, then recurses on each side until subarrays have size ≤ 1.';

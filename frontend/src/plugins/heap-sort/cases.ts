import type { WorkedCase } from '../_shared/practice';
import type { SortInput } from './index';

export const goodCases: WorkedCase<SortInput>[] = [
  {
    id: 'heapify',
    title: 'Max-heap then extract-max',
    input: { values: [4, 1, 3, 2] },
    inputLabel: '[4, 1, 3, 2]',
    returns: 'sorted',
    tone: 'ok',
    question: 'Why sift-down after swapping root with the last heap slot?',
    answer:
      'The new root may violate the heap property; sift-down pushes it down by swapping with the larger child until the max-heap invariant holds.',
  },
];

export const badCases: WorkedCase<SortInput>[] = [
  {
    id: 'duplicates',
    title: 'Many equal values',
    input: { values: [2, 2, 2, 2, 2] },
    inputLabel: '[2, 2, 2, 2, 2]',
    returns: 'sorted — heap property still holds',
    tone: 'bad',
    question: 'Does heap sort break when all elements are equal?',
    answer:
      'No — comparisons use ≤/≥ so equal children are fine; each extract-max still shrinks the heap by one.',
  },
];

export const intro =
  'Heap sort builds a max-heap in place, repeatedly swaps the root with the last unsorted slot, and sift-downs to extract the next largest value.';

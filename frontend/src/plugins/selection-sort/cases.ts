import type { WorkedCase } from '../_shared/practice';
import type { SortInput } from '../_shared/sortRecorder';

export const goodCases: WorkedCase<SortInput>[] = [
  {
    id: 'scan-min',
    title: 'Find minimum of unsorted suffix',
    input: { values: [5, 2, 8, 1] },
    inputLabel: '[5, 2, 8, 1]',
    returns: 'sorted',
    tone: 'ok',
    question: 'After round 0, which index holds the minimum of the whole array?',
    answer: 'Scan j from i+1..n-1 tracking minIdx. Here min is 1 at index 3 — swap it with index 0 so the smallest value locks into place.',
  },
];

export const badCases: WorkedCase<SortInput>[] = [
  {
    id: 'reverse',
    title: 'Reverse order — every round scans full suffix',
    input: { values: [5, 4, 3, 2, 1] },
    inputLabel: '[5, 4, 3, 2, 1]',
    returns: 'sorted after Θ(n²) comparisons',
    tone: 'bad',
    question: 'Why is this the worst case for selection sort?',
    answer: 'Each of n-1 rounds scans the entire remaining suffix even when the minimum is obvious — Θ(n²) comparisons regardless of input order.',
  },
];

export const intro =
  'Selection sort locks one minimum per round: scan the unsorted suffix, swap the smallest element to the front, grow the sorted prefix.';

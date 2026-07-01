import type { WorkedCase } from '../_shared/practice';
import type { TwoSumInput } from './index';

export const goodCases: WorkedCase<TwoSumInput>[] = [
  {
    id: 'classic',
    title: 'Pair in the middle',
    input: { values: [1, 2, 4, 6, 8, 9, 11], target: 15 },
    inputLabel: 'values=[1,2,4,6,8,9,11], target=15',
    returns: 'indices (4, 5) → 6 + 9',
    tone: 'ok',
    question: 'Why start with pointers at both ends?',
    answer: 'The array is sorted, so the sum at the ends is the largest possible. If it is too big, shrink from the right; if too small, grow from the left — each move discards a whole line of impossible pairs.',
  },
  {
    id: 'ends',
    title: 'Pair uses the minimum and maximum',
    input: { values: [1, 3, 5, 7, 9], target: 10 },
    inputLabel: 'values=[1,3,5,7,9], target=10',
    returns: 'indices (0, 4) → 1 + 9',
    tone: 'ok',
    question: 'First sum is 1 + 9 = 10 — why stop immediately?',
    answer: 'With sorted order, the first valid hit from the two-pointer walk is guaranteed to be correct — you never need to backtrack because moving either pointer only monotonically changes the sum.',
  },
];

export const badCases: WorkedCase<TwoSumInput>[] = [
  {
    id: 'miss',
    title: 'No pair sums to target',
    input: { values: [1, 2, 4, 6, 8], target: 7 },
    inputLabel: 'values=[1,2,4,6,8], target=7',
    returns: 'no pair (pointers cross)',
    tone: 'bad',
    question: 'Pointers meet without a hit — why is that definitive?',
    answer: 'Every smaller candidate was skipped by moving left rightward; every larger sum was pruned by moving right leftward. When left >= right, every pair was implicitly checked.',
  },
];

export const intro =
  'Two pointers on a sorted array: the sum at (left, right) tells you which pointer to move — O(n) time, O(1) space.';

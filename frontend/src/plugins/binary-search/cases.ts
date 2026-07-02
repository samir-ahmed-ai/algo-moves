import type { WorkedCase } from '../_shared/practice';
import type { BinInput } from './index';

/** Target present → the search lands on its index. */
export const goodCases: WorkedCase<BinInput>[] = [
  {
    id: 'mid-hit',
    title: 'Target is the first mid (1 step)',
    input: { values: [1, 3, 5, 7, 9], target: 5 },
    inputLabel: 'values = [1,3,5,7,9], target = 5',
    returns: 'found at i=2',
    tone: 'ok',
    question: 'Why does this finish in a single comparison?',
    answer:
      'The window is [0,4], so mid = (0+4)/2 = 2 and values[2] = 5 = target. Because the array is sorted, one look at the middle is enough — best case is O(1).',
  },
  {
    id: 'end-hit',
    title: 'Target sits at an end',
    input: { values: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 91 },
    inputLabel: 'values = [2,5,8,…,91], target = 91',
    returns: 'found at i=9',
    tone: 'ok',
    question: 'How does the window walk to the very last element?',
    answer:
      'Every mid is smaller than 91, so each step discards the left half and pushes lo rightward (lo = mid+1). The window keeps halving until lo = hi = 9, where values[9] = 91. That is ~log2(10) ≈ 4 steps, not 10.',
  },
  {
    id: 'halved-hit',
    title: 'Found after a couple of halvings',
    input: { values: [1, 3, 4, 6, 8, 9, 11, 14, 17], target: 14 },
    inputLabel: 'values = [1,3,4,6,8,9,11,14,17], target = 14',
    returns: 'found at i=7',
    tone: 'ok',
    question: 'Trace the lo/hi/mid pointers — which halves get thrown away?',
    answer:
      'mid=4 (8<14) keeps the right half → lo=5; mid=7 (values[7]=14) is a hit. Each comparison against the monotonic order halves the live window, so 9 elements take ~log2(9) ≈ 4 steps.',
  },
];

/** Target absent → lo passes hi and the search returns -1. */
export const badCases: WorkedCase<BinInput>[] = [
  {
    id: 'too-small',
    title: 'Target smaller than everything',
    input: { values: [10, 20, 30, 40, 50], target: 3 },
    inputLabel: 'values = [10,20,30,40,50], target = 3',
    returns: 'not found (-1)',
    tone: 'bad',
    question: 'Where does the window collapse when the target is below the minimum?',
    answer:
      'Every mid value exceeds 3, so the right half is discarded each time and hi marches left (hi = mid-1). Eventually hi drops below lo=0, the loop condition lo <= hi fails, and the function returns -1.',
  },
  {
    id: 'between',
    title: 'Target falls between two elements',
    input: { values: [1, 3, 4, 6, 8, 9, 11, 14, 17], target: 7 },
    inputLabel: 'values = [1,3,4,6,8,9,11,14,17], target = 7',
    returns: 'not found (-1)',
    tone: 'bad',
    question: 'The window shrinks to nothing — why is that a definitive "absent"?',
    answer:
      '7 lies between 6 and 8. The pointers squeeze the window until lo > hi without ever matching. Because the array is sorted, an empty window proves no element equals 7, so -1 is correct, not a missed cell.',
  },
];

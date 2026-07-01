import type { WorkedCase } from '../_shared/practice';
import type { WindowInput } from './index';

export const goodCases: WorkedCase<WindowInput>[] = [
  {
    id: 'k3',
    title: 'Window of size 3',
    input: { values: [2, 1, 5, 1, 3, 2], k: 3 },
    inputLabel: 'values=[2,1,5,1,3,2], k=3',
    returns: 'max sum 9 (window [5,1,3])',
    tone: 'ok',
    question: 'How do you update the sum when the window slides one step?',
    answer: 'Subtract the element leaving the left edge and add the new right element — O(1) per slide instead of recomputing k terms each time.',
  },
];

export const badCases: WorkedCase<WindowInput>[] = [
  {
    id: 'off-by-one',
    title: 'Window not full yet',
    input: { values: [4, 2, 1], k: 3 },
    inputLabel: 'values=[4,2,1], k=3 (exact fit)',
    returns: 'max sum 7 after one window',
    tone: 'bad',
    question: 'When k equals n, how many slides occur?',
    answer: 'Exactly one window — indices 0..k-1. A common bug is sliding before the window is full; here the first valid window is also the last.',
  },
];

export const intro = 'Fixed-size sliding window: maintain running sum while advancing left and right together.';

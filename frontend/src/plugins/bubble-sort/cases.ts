import type { WorkedCase } from '../_shared/practice';
import type { SortInput } from '../_shared/sortRecorder';

export const goodCases: WorkedCase<SortInput>[] = [
  {
    id: 'bubble-pass',
    title: 'One pass floats the largest',
    input: { values: [3, 1, 4, 2] },
    inputLabel: '[3, 1, 4, 2]',
    returns: 'sorted',
    tone: 'ok',
    question: 'After the first full pass, which index is locked?',
    answer: 'Adjacent swaps move 4 rightward until it sits at index 3 — the largest value bubbles to the end each pass.',
  },
];

export const badCases: WorkedCase<SortInput>[] = [
  {
    id: 'reverse',
    title: 'Reverse order needs n−1 passes',
    input: { values: [5, 4, 3, 2, 1] },
    inputLabel: '[5, 4, 3, 2, 1]',
    returns: 'sorted after Θ(n²) swaps',
    tone: 'bad',
    question: 'Why is reverse input the worst case?',
    answer: 'Every adjacent pair is out of order, so each pass performs a swap at every position — Θ(n²) comparisons and swaps.',
  },
];

export const intro =
  'Bubble sort walks the array swapping adjacent out-of-order pairs; each pass locks the next-largest value at the tail.';

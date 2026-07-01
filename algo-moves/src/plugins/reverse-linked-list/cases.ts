import type { WorkedCase } from '../_shared/practice';
import type { ListInput } from './index';

export const goodCases: WorkedCase<ListInput>[] = [
  {
    id: 'three-node',
    title: 'Reverse 1 → 2 → 3',
    input: { values: [1, 2, 3] },
    inputLabel: 'list 1 → 2 → 3',
    returns: '3 → 2 → 1',
    tone: 'ok',
    question: 'What three pointers does iterative reversal need?',
    answer: 'prev, curr, and next. Save curr.next, point curr.next to prev, then advance prev and curr — each node is rewired once in O(n).',
  },
];

export const intro = 'Iterative reversal rewires next pointers one node at a time while preserving the rest of the list.';

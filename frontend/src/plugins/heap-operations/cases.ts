import type { WorkedCase } from '../_shared/practice';
import type { HeapInput } from './index';

export const goodCases: WorkedCase<HeapInput>[] = [
  {
    id: 'insert-extract',
    title: 'Min-heap insert then extract',
    input: { ops: [{ kind: 'insert', value: 3 }, { kind: 'insert', value: 1 }, { kind: 'extract' }] },
    inputLabel: 'insert 3, insert 1, extract-min',
    returns: 'extract returns 1',
    tone: 'ok',
    question: 'After inserting 3 then 1, where does 1 sit in the array heap?',
    answer: '1 bubbles up to the root via sift-up comparisons with parent — extract-min returns the root and sift-down restores the heap.',
  },
];

export const intro = 'Binary heap in an array: parent at (i-1)/2, children at 2i+1 and 2i+2; sift-up on insert, sift-down on extract.';

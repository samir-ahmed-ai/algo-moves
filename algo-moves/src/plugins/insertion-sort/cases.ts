import type { WorkedCase } from '../_shared/practice';
import type { SortInput } from './index';

export const goodCases: WorkedCase<SortInput>[] = [
  {
    id: 'insert-key',
    title: 'Insert key into sorted prefix',
    input: { values: [2, 5, 1, 4] },
    inputLabel: '[2, 5, 1, 4]',
    returns: 'sorted',
    tone: 'ok',
    question: 'When inserting key=1, why shift 5 rightward?',
    answer: 'The sorted prefix [2,5] must stay ordered. 5 > 1, so shift 5 one slot right to open a gap at index 1, then drop 1 there.',
  },
];

export const badCases: WorkedCase<SortInput>[] = [
  {
    id: 'reverse',
    title: 'Reverse input — many shifts',
    input: { values: [5, 4, 3, 2, 1] },
    inputLabel: '[5, 4, 3, 2, 1]',
    returns: 'sorted with Θ(n²) shifts',
    tone: 'bad',
    question: 'Why is reverse order hard for insertion sort?',
    answer: 'Each new key walks left across the entire sorted prefix, shifting every larger element — Θ(n²) work.',
  },
];

export const intro = 'Insertion sort grows a sorted prefix: take the next key, shift larger neighbors right, insert the key in the gap.';

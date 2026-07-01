import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';
import { splitCodeIntoPieces } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'partition',
    prompt: 'After one partition around pivot p, what is true about index p?',
    choices: [
      { label: 'Every element left of p is ≤ p and every element right is ≥ p', correct: true },
      { label: 'The entire array is sorted' },
      { label: 'p is always the minimum' },
      { label: 'No swaps occurred' },
    ],
    explain: 'Partitioning places the pivot in its final sorted rank; recursion only needs to sort the strictly smaller and larger sides.',
  },
];

const go = `func quickSort(nums []int, lo, hi int) {
	if lo >= hi { return }
	p := partition(nums, lo, hi)
	quickSort(nums, lo, p-1)
	quickSort(nums, p+1, hi)
}`;

export const codePieces: CodePiece[] = splitCodeIntoPieces(go) ?? [];

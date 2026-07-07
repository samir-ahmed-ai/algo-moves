import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '@/lib/code';
import { splitCodeIntoPieces } from '@/lib/code';

export const quiz: QuizQuestion[] = [
  {
    id: 'partition',
    prompt: 'After one partition step, what is true about the pivot?',
    choices: [
      { label: 'Left ≤ pivot, right ≥ pivot — pivot in final rank', correct: true },
      { label: 'Fully sorted — only one pivot placed' },
      { label: 'p is minimum — not guaranteed' },
      { label: 'No swaps — partition swaps elements' },
    ],
    explain:
      'Partitioning places the pivot in its final sorted rank; recursion only needs to sort the strictly smaller and larger sides.',
  },
];

const go = `func quickSort(nums []int, lo, hi int) {
	if lo >= hi { return }
	p := partition(nums, lo, hi)
	quickSort(nums, lo, p-1)
	quickSort(nums, p+1, hi)
}`;

export const codePieces: CodePiece[] = splitCodeIntoPieces(go) ?? [];

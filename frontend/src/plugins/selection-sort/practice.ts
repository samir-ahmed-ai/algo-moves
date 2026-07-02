import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '@/lib/code';
import { splitCodeIntoPieces } from '@/lib/code';

export const quiz: QuizQuestion[] = [
  {
    id: 'invariant',
    prompt: 'What does each round of selection sort guarantee?',
    choices: [
      { label: 'Next smallest placed — front of unsorted', correct: true },
      { label: 'Fully sorted — one pass is not enough' },
      { label: 'Adjacent ordered — bubble sort shape' },
      { label: 'Array halved — merge sort shape' },
    ],
    explain: 'After round i, indices 0..i hold the i+1 smallest values in sorted order.',
  },
];

const go = `func selectionSort(nums []int) {
	n := len(nums)
	for i := 0; i < n-1; i++ {
		minIdx := i
		for j := i + 1; j < n; j++ {
			if nums[j] < nums[minIdx] {
				minIdx = j
			}
		}
		if minIdx != i {
			nums[i], nums[minIdx] = nums[minIdx], nums[i]
		}
	}
}`;

export const codePieces: CodePiece[] = splitCodeIntoPieces(go) ?? [];

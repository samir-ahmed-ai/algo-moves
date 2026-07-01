import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';
import { splitCodeIntoPieces } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'invariant',
    prompt: 'What does each round of selection sort guarantee?',
    choices: [
      { label: 'The next smallest element is placed at the front of the unsorted suffix', correct: true },
      { label: 'The entire array is sorted after one pass' },
      { label: 'Adjacent pairs are ordered' },
      { label: 'The array is split in half' },
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

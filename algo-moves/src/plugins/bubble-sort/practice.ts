import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';
import { splitCodeIntoPieces } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'invariant',
    prompt: 'What does one complete bubble-sort pass guarantee?',
    choices: [
      { label: 'The largest unsorted element is in its final position', correct: true },
      { label: 'The entire array is sorted' },
      { label: 'The smallest element moves to the front' },
      { label: 'No comparisons occur' },
    ],
    explain: 'Each pass compares adjacent pairs and swaps out-of-order neighbors, so the maximum "bubbles" to the rightmost unsorted slot.',
  },
];

const go = `func bubbleSort(nums []int) {
	for i := 0; i < len(nums)-1; i++ {
		swapped := false
		for j := 0; j < len(nums)-1-i; j++ {
			if nums[j] > nums[j+1] {
				nums[j], nums[j+1] = nums[j+1], nums[j]
				swapped = true
			}
		}
		if !swapped { break }
	}
}`;

export const codePieces: CodePiece[] = splitCodeIntoPieces(go) ?? [];

import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';
import { splitCodeIntoPieces } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'merge-pick',
    prompt: 'During a merge of two sorted runs, which element moves to the output next?',
    choices: [
      { label: 'The smaller of the two run fronts', correct: true },
      { label: 'Always the left run front' },
      { label: 'The larger of the two run fronts' },
      { label: 'The middle element of the combined range' },
    ],
    explain: 'Merge compares the smallest unconsumed elements from each run and appends the smaller — preserving sorted order.',
  },
];

const go = `func mergeSort(nums []int) {
	n := len(nums)
	buf := make([]int, n)
	for width := 1; width < n; width *= 2 {
		for lo := 0; lo+width < n; lo += 2 * width {
			// merge nums[lo:lo+width] with nums[lo+width:...]
		}
	}
}`;

export const codePieces: CodePiece[] = splitCodeIntoPieces(go) ?? [];

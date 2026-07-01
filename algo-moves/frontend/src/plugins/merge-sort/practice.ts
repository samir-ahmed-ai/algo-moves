import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';
import { splitCodeIntoPieces } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'merge-pick',
    prompt: 'During a merge of two sorted runs, which element moves to the output next?',
    choices: [
      { label: 'Smaller front — preserves sorted order', correct: true },
      { label: 'Left front always — ignores right run', },
      { label: 'Larger front — would reverse order', },
      { label: 'Middle element — not how merge works', },
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

import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';
import { splitCodeIntoPieces } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'invariant',
    prompt: 'What is true after processing index i in insertion sort?',
    choices: [
      { label: 'values[0..i] is sorted', correct: true },
      { label: 'The whole array is sorted' },
      { label: 'The maximum is at index i' },
      { label: 'No swaps occur' },
    ],
    explain: 'The outer loop extends the sorted prefix one element at a time by inserting the key at its correct position.',
  },
];

const go = `func insertionSort(nums []int) {
	for i := 1; i < len(nums); i++ {
		key := nums[i]
		j := i - 1
		for j >= 0 && nums[j] > key {
			nums[j+1] = nums[j]
			j--
		}
		nums[j+1] = key
	}
}`;

export const codePieces: CodePiece[] = splitCodeIntoPieces(go) ?? [];

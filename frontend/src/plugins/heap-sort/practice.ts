import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';
import { splitCodeIntoPieces } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'heap-invariant',
    prompt: 'In a max-heap stored in an array, what holds for every node?',
    choices: [
      { label: 'Parent ≥ both children — local max-heap rule', correct: true },
      { label: 'Left < right — not a heap rule' },
      { label: 'Globally sorted — stronger than heap' },
      { label: 'Root only is max — too weak' },
    ],
    explain: 'The heap property is local: each parent dominates its children; the global maximum sits at index 0.',
  },
];

const go = `func heapSort(nums []int) {
	buildMaxHeap(nums)
	for end := len(nums)-1; end > 0; end-- {
		nums[0], nums[end] = nums[end], nums[0]
		siftDown(nums, 0, end)
	}
}`;

export const codePieces: CodePiece[] = splitCodeIntoPieces(go) ?? [];

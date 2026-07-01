import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';
import { splitCodeIntoPieces } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'heap-invariant',
    prompt: 'In a max-heap stored in an array, what is true of each node i?',
    choices: [
      { label: 'nums[i] ≥ nums[2i+1] and nums[i] ≥ nums[2i+2] (when children exist)', correct: true },
      { label: 'Left child is always smaller than right child' },
      { label: 'The array is globally sorted' },
      { label: 'Only the root is the maximum' },
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

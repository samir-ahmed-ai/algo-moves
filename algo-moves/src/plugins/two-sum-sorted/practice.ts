import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'move-low',
    prompt: 'When values[left] + values[right] < target, which pointer moves?',
    choices: [
      { label: 'left++ — need a larger sum, so drop the smaller left value', correct: true },
      { label: 'right-- — shrink from the right' },
      { label: 'Both pointers move inward' },
      { label: 'Restart from the middle' },
    ],
    explain: 'The sum is too small. Every pair involving the current left value with any index ≤ right was too small, so advance left to a bigger element.',
  },
  {
    id: 'precondition',
    prompt: 'Why must the input array be sorted?',
    choices: [
      { label: 'So shrinking one pointer monotonically increases or decreases the sum', correct: true },
      { label: 'So binary search on values works' },
      { label: 'Only to deduplicate elements' },
      { label: 'It does not need to be sorted' },
    ],
    explain: 'The discard logic assumes that all elements left of left are ≤ values[left] and all right of right are ≥ values[right]. Without sorted order those inferences fail.',
  },
];

export const codePieces: CodePiece[] = [
  { id: 'sig', code: 'func twoSum(nums []int, target int) []int {', role: 'return indices of the two numbers that sum to target' },
  { id: 'init', code: '\tleft, right := 0, len(nums)-1', role: 'two pointers at the ends of the sorted array' },
  { id: 'loop', code: '\tfor left < right {', role: 'stop when pointers cross — no pair left' },
  { id: 'sum', code: '\t\tsum := nums[left] + nums[right]', role: 'current candidate sum' },
  { id: 'hit', code: '\t\tif sum == target {\n\t\t\treturn []int{left, right}\n\t\t}', role: 'found the pair' },
  { id: 'low', code: '\t\tif sum < target {\n\t\t\tleft++\n\t\t} else {\n\t\t\tright--\n\t\t}', role: 'too small → move left; too big → move right' },
  { id: 'end', code: '\t}\n\treturn nil\n}', role: 'no valid pair' },
];

import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'update',
    prompt: 'When the window slides right by one, how is the sum updated?',
    choices: [
      { label: 'sum += in − out — O(1) slide update', correct: true },
      { label: 'Rescan all k — O(k) each slide' },
      { label: 'Add right only forgets outgoing — subtract the leaving left element' },
      { label: 'Binary search max — wrong tool' },
    ],
    explain: 'Only one element enters and one leaves per slide — subtract the outgoing value and add the incoming value.',
  },
];

export const codePieces: CodePiece[] = [
  { id: 'sig', code: 'func maxSum(nums []int, k int) int {', role: 'maximum sum among all contiguous subarrays of length k' },
  { id: 'init', code: '\tsum, best := 0, 0\n\tfor i := 0; i < k; i++ { sum += nums[i] }', role: 'seed the first window sum' },
  { id: 'best', code: '\tbest = sum', role: 'track the best sum seen' },
  { id: 'slide', code: '\tfor right := k; right < len(nums); right++ {', role: 'slide window: new right index, left = right-k' },
  { id: 'update', code: '\t\tsum += nums[right] - nums[right-k]', role: 'O(1) window update' },
  { id: 'track', code: '\t\tif sum > best { best = sum }', role: 'record new maximum' },
  { id: 'ret', code: '\t}\n\treturn best\n}', role: 'return best window sum' },
];

import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'shrink',
    prompt: 'When s[right] repeats a character already in the window, what must happen?',
    choices: [
      { label: 'Jump left past repeat — restore uniqueness', correct: true },
      { label: 'Step right back — wrong direction', },
      { label: 'Clear window — too aggressive', },
      { label: 'Ignore duplicate — breaks invariant', },
    ],
    explain: 'The window invariant is "all characters unique". Left jumps to last[char]+1 so the duplicate is evicted.',
  },
];

export const codePieces: CodePiece[] = [
  { id: 'sig', code: 'func lengthOfLongestSubstring(s string) int {', role: 'length of longest substring without repeating characters' },
  { id: 'map', code: '\tlast := map[byte]int{}', role: 'last index seen for each character' },
  { id: 'init', code: '\tleft, best := 0, 0', role: 'window left edge and best length' },
  { id: 'loop', code: '\tfor right := 0; right < len(s); right++ {', role: 'expand window with right pointer' },
  { id: 'jump', code: '\t\tif i, ok := last[s[right]]; ok && i >= left {\n\t\t\tleft = i + 1\n\t\t}', role: 'shrink left past previous duplicate' },
  { id: 'record', code: '\t\tlast[s[right]] = right', role: 'update last seen index' },
  { id: 'best', code: '\t\tif right-left+1 > best { best = right - left + 1 }', role: 'track maximum window length' },
  { id: 'ret', code: '\t}\n\treturn best\n}', role: 'return best length' },
];

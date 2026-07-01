import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'phase1',
    prompt: 'After slow and fast meet, how do you find the cycle entrance?',
    choices: [
      { label: 'Reset one pointer to head; advance both one step until they meet', correct: true },
      { label: 'Binary search on node indices' },
      { label: 'Mark visited nodes with a hash set' },
      { label: 'Run BFS from the head' },
    ],
    explain: 'The distance from head to cycle entrance equals the distance from meeting point to entrance — reset one pointer to head and walk both at speed 1.',
  },
  {
    id: 'null',
    prompt: 'What does fast == nil or fast.next == nil prove?',
    choices: [
      { label: 'The list has no cycle', correct: true },
      { label: 'The cycle length is 1' },
      { label: 'Slow is at the head' },
      { label: 'The list is empty only' },
    ],
    explain: 'An acyclic linked list eventually runs off the end — fast hits null first.',
  },
];

export const codePieces: CodePiece[] = [
  { id: 'sig', code: 'func hasCycle(head *ListNode) bool {', role: 'detect cycle in linked list' },
  { id: 'init', code: '\tslow, fast := head, head', role: 'both start at head' },
  { id: 'loop', code: '\tfor fast != nil && fast.Next != nil {', role: 'fast needs two hops — stop if acyclic' },
  { id: 'move', code: '\t\tslow = slow.Next\n\t\tfast = fast.Next.Next', role: '1 step vs 2 steps' },
  { id: 'meet', code: '\t\tif slow == fast {\n\t\t\treturn true\n\t\t}', role: 'meeting inside a cycle' },
  { id: 'ret', code: '\t}\n\treturn false\n}', role: 'reached end — no cycle' },
];

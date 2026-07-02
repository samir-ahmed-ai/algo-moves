import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'phase1',
    prompt: 'After slow and fast meet, how do you find the cycle entrance?',
    choices: [
      { label: 'Reset to head — walk both at speed 1', correct: true },
      { label: 'Binary search — no sorted order', },
      { label: 'Hash set visit marks — extra space', },
      { label: 'BFS from head — wrong traversal', },
    ],
    explain: 'The distance from head to cycle entrance equals the distance from meeting point to entrance — reset one pointer to head and walk both at speed 1.',
  },
  {
    id: 'null',
    prompt: 'What does it prove when the fast pointer reaches the end of the list?',
    choices: [
      { label: 'No cycle — fast reaches the end', correct: true },
      { label: 'Cycle length 1 — not implied', },
      { label: 'Slow at head — unrelated', },
      { label: 'Empty only any acyclic list — Floyd detects a cycle' },
    ],
    explain: 'An acyclic linked list eventually runs off the end — the fast pointer reaches the end first.',
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

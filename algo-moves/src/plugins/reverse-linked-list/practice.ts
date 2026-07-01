import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'next-save',
    prompt: 'Before setting curr.next = prev, what must you save?',
    choices: [
      { label: 'Save curr.next tail link — lost otherwise', correct: true },
      { label: 'Head only not enough — rewind', },
      { label: 'Nothing — would drop the tail', },
      { label: 'Old prev — wrong pointer to save', },
    ],
    explain: 'curr.next is the only link to the remainder. Store it in next before rewiring curr.',
  },
];

export const codePieces: CodePiece[] = [
  { id: 'sig', code: 'func reverseList(head *ListNode) *ListNode {', role: 'reverse singly linked list in-place' },
  { id: 'init', code: '\tvar prev *ListNode', role: 'prev starts nil — new tail' },
  { id: 'loop', code: '\tfor head != nil {', role: 'walk until all nodes reversed' },
  { id: 'save', code: '\t\tnext := head.Next', role: 'save remainder before rewiring' },
  { id: 'rewire', code: '\t\thead.Next = prev', role: 'reverse the link' },
  { id: 'advance', code: '\t\tprev = head\n\t\thead = next', role: 'shift prev and curr forward' },
  { id: 'ret', code: '\t}\n\treturn prev\n}', role: 'prev is the new head' },
];

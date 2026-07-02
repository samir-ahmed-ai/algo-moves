import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '@/lib/code';

export const quiz: QuizQuestion[] = [
  {
    id: 'parent',
    prompt: 'In a 0-indexed array heap, what is the parent of index i (i > 0)?',
    choices: [
      { label: '(i - 1) / 2 — parent index formula', correct: true },
      { label: 'i / 2 — child index, not parent' },
      { label: 'i - 1 — previous slot in array' },
      { label: '2i + 1 — left child index' },
    ],
    explain: 'Parent index is floor((i-1)/2) — the inverse of children 2i+1 and 2i+2.',
  },
];

export const codePieces: CodePiece[] = [
  { id: 'insert', code: 'func (h *IntHeap) Push(x int) {', role: 'append and sift up' },
  { id: 'append', code: '\t*h = append(*h, x)', role: 'place new leaf at end' },
  { id: 'sift-up', code: '\tfor i := len(*h) - 1; i > 0; {', role: 'bubble up while smaller than parent' },
  { id: 'pop', code: 'func (h *IntHeap) Pop() int {', role: 'remove minimum (root)' },
  { id: 'swap-root', code: '\troot := (*h)[0]\n\t(*h)[0] = (*h)[len(*h)-1]', role: 'move last leaf to root' },
  { id: 'sift-down', code: '\t// sift down from index 0', role: 'restore heap property' },
];

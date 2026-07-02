import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'precondition',
    prompt: 'What must be true about the array before binary search works?',
    choices: [
      { label: 'Sorted on key — enables halving', correct: true },
      { label: 'No duplicates — not required', },
      { label: 'Power-of-two length — not required', },
      { label: 'Linked list — wrong structure', },
    ],
    explain:
      'Binary search relies on a monotonic order: once mid is too small (or too big) you can discard a whole half. On an unsorted array that inference is invalid, so sorting is a hard precondition.',
  },
  {
    id: 'mid',
    prompt: 'How is mid computed each step?',
    choices: [
      { label: 'lo + (hi−lo)/2 — overflow-safe midpoint', correct: true },
      { label: '(lo + hi) × 2 — wrong formula', },
      { label: 'Random index — not deterministic', },
      { label: 'hi − lo — not the midpoint', },
    ],
    explain:
      'mid is the middle of the current [lo, hi] window. Writing it as lo + (hi - lo) / 2 is equivalent to (lo + hi) / 2 but avoids integer overflow when lo + hi exceeds the int range.',
  },
  {
    id: 'discard',
    prompt: 'When the middle element is smaller than the target, which half is discarded and why?',
    choices: [
      { label: 'Left half — all ≤ mid too small', correct: true },
      { label: 'Right half — wrong direction', },
      { label: 'Restart at 0 — loses progress', },
      { label: 'Both halves — mid still one cell', },
    ],
    explain:
      'Sorted order means every element at or left of the middle is ≤ the middle value < target, so none can equal the target. That whole half is pruned.',
  },
  {
    id: 'loop',
    prompt: 'How small a search window should still be examined, and why?',
    choices: [
      { label: 'lo ≤ hi — single-cell window still valid', correct: true },
      { label: 'lo < hi — skips last candidate', },
      { label: 'mid ≠ target — may never converge', },
      { label: 'lo ≠ 0 — arbitrary bound', },
    ],
    explain:
      'lo <= hi keeps a single-element window [lo, lo] alive so that last candidate is compared. Using lo < hi would skip it and miss targets that sit there.',
  },
  {
    id: 'absent',
    prompt: 'What does the function return when the target is not present?',
    choices: [
      { label: '−1 — window emptied, no match', correct: true },
      { label: 'Insert index — not standard here', },
      { label: '0 — not a sentinel', },
      { label: 'Panic — returns quietly', },
    ],
    explain:
      'If no mid ever equals the target, the pointers eventually cross (lo > hi), the loop exits, and the function returns the sentinel -1 to signal "absent".',
  },
  {
    id: 'complexity',
    prompt: 'Why is binary search O(log n)?',
    choices: [
      { label: 'O(log n) — halve window each step', correct: true },
      { label: 'O(n) — scans every element', },
      { label: 'O(n log n) — sorts first', },
      { label: 'O(n²) — all pairs', },
    ],
    explain:
      'Starting from n candidates, one comparison leaves n/2, then n/4, … The number of halvings before the window is empty is log2(n), giving O(log n) time and O(1) extra space.',
  },
];

/** Ordered decomposition of the Go solution for the Code Studio reassemble drill. */
export const codePieces: CodePiece[] = [
  { id: 'sig', code: 'func search(nums []int, target int) int {', role: 'signature — return the index of target, or -1 if absent' },
  { id: 'window', code: '\tlo, hi := 0, len(nums)-1', role: 'window: the answer can only live in [lo, hi]' },
  { id: 'loop', code: '\tfor lo <= hi {', role: 'keep going while the window is non-empty (lo == hi still holds one cell)' },
  { id: 'mid', code: '\t\tmid := (lo + hi) / 2', role: 'midpoint of the live window' },
  { id: 'switch', code: '\t\tswitch {', role: 'compare the middle value against the target' },
  { id: 'hit', code: '\t\tcase nums[mid] == target:\n\t\t\treturn mid', role: 'exact match → return the index' },
  { id: 'right', code: '\t\tcase nums[mid] < target:\n\t\t\tlo = mid + 1', role: 'mid too small → discard the left half, search right' },
  { id: 'left', code: '\t\tdefault:\n\t\t\thi = mid - 1', role: 'mid too big → discard the right half, search left' },
  { id: 'endswitch', code: '\t\t}', role: 'close the comparison' },
  { id: 'endloop', code: '\t}', role: 'close the loop once the window is empty' },
  { id: 'absent', code: '\treturn -1\n}', role: 'lo passed hi with no match → target is absent' },
];

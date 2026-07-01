import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'precondition',
    prompt: 'What must be true about the array before binary search works?',
    choices: [
      { label: 'It must be sorted (monotonic) on the key you compare', correct: true },
      { label: 'It must contain no duplicates' },
      { label: 'Its length must be a power of two' },
      { label: 'It must be stored as a linked list' },
    ],
    explain:
      'Binary search relies on a monotonic order: once mid is too small (or too big) you can discard a whole half. On an unsorted array that inference is invalid, so sorting is a hard precondition.',
  },
  {
    id: 'mid',
    prompt: 'How is mid computed each step?',
    choices: [
      { label: 'mid = lo + (hi - lo) / 2 — the midpoint of the live window, overflow-safe', correct: true },
      { label: 'mid = (lo + hi) * 2' },
      { label: 'mid = a random index in [lo, hi]' },
      { label: 'mid = hi - lo' },
    ],
    explain:
      'mid is the middle of the current [lo, hi] window. Writing it as lo + (hi - lo) / 2 is equivalent to (lo + hi) / 2 but avoids integer overflow when lo + hi exceeds the int range.',
  },
  {
    id: 'discard',
    prompt: 'When values[mid] < target, which half is discarded and why?',
    choices: [
      { label: 'The left half — everything ≤ mid is too small, so set lo = mid + 1', correct: true },
      { label: 'The right half — set hi = mid - 1' },
      { label: 'Neither; you restart from index 0' },
      { label: 'Both halves; you check mid again' },
    ],
    explain:
      'Sorted order means every element at or left of mid is ≤ values[mid] < target, so none can equal the target. They are pruned by moving lo to mid + 1.',
  },
  {
    id: 'loop',
    prompt: 'What is the loop condition, and why that exact form?',
    choices: [
      { label: 'while lo <= hi — when lo == hi the window still holds one cell to check', correct: true },
      { label: 'while lo < hi — stop as soon as they meet' },
      { label: 'while mid != target' },
      { label: 'while lo != 0' },
    ],
    explain:
      'lo <= hi keeps a single-element window [lo, lo] alive so that last candidate is compared. Using lo < hi would skip it and miss targets that sit there.',
  },
  {
    id: 'absent',
    prompt: 'What does the function return when the target is not present?',
    choices: [
      { label: '-1, after lo passes hi and the window is empty', correct: true },
      { label: 'The index where the target would be inserted' },
      { label: '0, the first index' },
      { label: 'It throws / panics' },
    ],
    explain:
      'If no mid ever equals the target, the pointers eventually cross (lo > hi), the loop exits, and the function returns the sentinel -1 to signal "absent".',
  },
  {
    id: 'complexity',
    prompt: 'Why is binary search O(log n)?',
    choices: [
      { label: 'Each comparison halves the remaining window, so it takes ~log2(n) steps', correct: true },
      { label: 'It scans every element once, so it is O(n)' },
      { label: 'It sorts the array first, so it is O(n log n)' },
      { label: 'It compares all pairs, so it is O(n²)' },
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

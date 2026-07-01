import type { WorkedCase } from '../_shared/practice';
import type { QueensInput } from './index';

/** Board sizes that admit at least one non-attacking placement. */
export const goodCases: WorkedCase<QueensInput>[] = [
  {
    id: 'n1',
    title: 'Trivial board (n = 1)',
    input: { n: 1 },
    inputLabel: 'n = 1',
    returns: 'solution',
    tone: 'ok',
    question: 'One queen on a 1×1 board — is that a valid solution?',
    answer:
      'Yes. A single queen attacks nobody, so row 0 is filled immediately and recursion hits the base case row === n with zero backtracking.',
  },
  {
    id: 'n4',
    title: 'First solvable size (n = 4)',
    input: { n: 4 },
    inputLabel: 'n = 4',
    returns: 'solution',
    tone: 'ok',
    question: 'Four queens on a 4×4 board — does a safe arrangement exist?',
    answer:
      'Yes, two of them. The search tries column 0 in row 0, gets stuck, backtracks, and lands on columns (1, 3, 0, 2): no two queens share a row, column, or diagonal.',
  },
  {
    id: 'n6',
    title: 'Heavier search (n = 6)',
    input: { n: 6 },
    inputLabel: 'n = 6',
    returns: 'solution',
    tone: 'ok',
    question: 'Does a 6×6 board have a solution, and why does it take more work?',
    answer:
      'Yes. n = 6 has 4 solutions, but the tree is deeper and the algorithm backtracks many times before the first valid board emerges — watch the backtrack counter climb in the Inspector.',
  },
];

/** Board sizes with no valid placement — the search exhausts every branch. */
export const badCases: WorkedCase<QueensInput>[] = [
  {
    id: 'n2',
    title: 'Too cramped (n = 2)',
    input: { n: 2 },
    inputLabel: 'n = 2',
    returns: 'no solution',
    tone: 'bad',
    question: 'Can two queens avoid attacking each other on a 2×2 board?',
    answer:
      'No. Whatever cell the first queen takes, every remaining cell is on its row, column, or diagonal. Every branch dead-ends, so place(0) returns false.',
  },
  {
    id: 'n3',
    title: 'Still impossible (n = 3)',
    input: { n: 3 },
    inputLabel: 'n = 3',
    returns: 'no solution',
    tone: 'bad',
    question: 'Three queens on a 3×3 board?',
    answer:
      'No solution either — only n = 1 and n ≥ 4 are solvable. The search visits all three columns of row 0 and backtracks out of each, confirming impossibility by exhaustion.',
  },
];

import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which algorithmic pattern does `leftMostColumnWithOne` use?',
      choices: [
        {
          label: 'Top-right corner walk: start at `(0 — n-1)` and move left on 1, down',
          correct: true,
        },
        {
          label: 'Binary search on each row — independently',
        },
        {
          label: 'BFS from every cell containing — 1',
        },
        {
          label: 'Column-by-column linear scan — right',
        },
      ],
      explain:
        'The code initialises `r=0, c=n-1` and at each step either decrements `c` (found a 1 — try to go further left) or increments `r` (found a 0 — move to the next row). This exploits the row-sorted property to navigate in O(m+n) total steps.',
    },
    {
      id: 'move-left',
      prompt:
        'When `bm.Get(r, c) == 1`, the code sets `res = c` and then decrements `c`. Why decrement `c` instead of moving to the next row?',
      choices: [
        {
          label: 'To check whether a 1 — exists even further left, potentially',
          correct: true,
        },
        {
          label: 'To avoid revisiting — column on later rows',
        },
        {
          label: 'Because the matrix is Recording — res = c captures a',
        },
        {
          label: 'To skip columns already confirmed — to contain 0s',
        },
      ],
      explain:
        'Recording `res = c` captures a candidate answer, but since we want the *leftmost* column, we continue searching to the left. If no 1 is found in columns `< c`, then `res` remains the best answer. Moving down instead would risk missing a 1 to the left on the current or later rows.',
    },
    {
      id: 'complexity',
      prompt: 'Why is the time complexity O(m+n) rather than O(m·n)?',
      choices: [
        {
          label: 'Each step moves either left — (`c--`) or down (`r++`), so the total',
          correct: true,
        },
        {
          label: 'Binary search is applied per row — giving O(m log n)',
        },
        {
          label: 'The grid is guaranteed — be square so m = n and O(m+n) = O(n)',
        },
        {
          label: 'The algorithm skips entire rows — that are all-zero',
        },
      ],
      explain:
        '`c` can only decrease (from `n-1` to 0, at most `n` decrements) and `r` can only increase (from 0 to `m-1`, at most `m` increments). Together these two counters give a hard cap of `m+n` iterations regardless of grid content.',
    },
    {
      id: 'not-found',
      prompt: 'What does the function return when no column contains a 1?',
      choices: [
        {
          label: '-1, because `res` is initialised — to -1 and is never updated',
          correct: true,
        },
        {
          label: '0, which is the leftmost — valid column index',
        },
        {
          label: '`n` (one past — column)',
        },
        {
          label: 'It panics when `r` reaches — `m`',
        },
      ],
      explain:
        '`res := -1` is the sentinel. The loop only updates `res` when `bm.Get(r, c) == 1`. If the matrix is all-zero, the else branch always fires (`r++`) until `r == m`, the loop exits, and `-1` is returned.',
    },
    {
      id: 'invariant',
      prompt:
        'What invariant is maintained that makes the top-right walk correct even when `res` is updated mid-traversal?',
      choices: [
        {
          label: 'Every column to the right — of the current `c` has already been',
          correct: true,
        },
        {
          label: 'Every row above `r` contains — no 1s at all',
        },
        {
          label: 'The walk always processes rows — in the order they were given',
        },
        {
          label: '`res` always stores — row index where a 1 was seen',
        },
      ],
      explain:
        "We only move left when we find a 1, so any column we move past on the right is either a 1 we've already recorded or a 0. The current `c` is always a new candidate for the leftmost-1 column, and columns to the right can no longer be leftmost.",
    },
  ],
};

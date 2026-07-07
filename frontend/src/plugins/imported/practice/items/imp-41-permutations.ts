import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt: 'Which technique does `btPerm` use to generate all permutations of an integer array?',
      choices: [
        {
          label: 'In-place swap-backtracking: swap — position, recurse, swap back',
          correct: true,
        },
        {
          label: 'Build a new path slice — at each level and track a `used`',
        },
        {
          label: 'Iterative next-permutation — a[idx] with a[i] to',
        },
        {
          label: 'BFS expanding one prefix — a time using a queue of partial',
        },
      ],
      explain:
        '`btPerm` swaps `a[idx]` with `a[i]` to fix a choice at position `idx`, recurses on `idx+1`, then swaps back — all mutations happen on the same slice in place. No auxiliary `used` array or queue is involved.',
    },
    {
      id: 'base-case',
      prompt: 'What does `btPerm` do when `idx == len(a)`?',
      choices: [
        {
          label: 'Copies the current slice — a new row and appends it to `res`',
          correct: true,
        },
        {
          label: 'Appends the slice directly — copy) to `res`',
        },
        {
          label: 'Returns without adding anything — the caller aggregates results',
        },
        {
          label: 'Swaps the last two elements — to finalize the permutation, then',
        },
      ],
      explain:
        'The slice `a` is shared and mutated throughout the recursion. Without `copy(row, a)`, all entries in `res` would point to the same underlying array and end up identical after backtracking. The copy captures the current arrangement.',
    },
    {
      id: 'loop-range',
      prompt:
        'The inner loop in `btPerm` is `for i := idx; i < len(a); i++`. Why does it start at `idx` rather than `0`?',
      choices: [
        {
          label: 'Elements before `idx` — positions 0',
          correct: true,
        },
        {
          label: 'Starting at 0 would revisit — already-committed swaps and produce',
        },
        {
          label: 'The first `idx` elements — sorted and need not be permuted',
        },
        {
          label: 'Go slice bounds require `i — >= idx` to avoid an out-of-range panic',
        },
      ],
      explain:
        'In swap-backtracking, positions `0..idx-1` are already settled for this branch. The loop `i := idx..len(a)-1` tries each remaining element in turn as the candidate for position `idx`, without disturbing the committed prefix.',
    },
    {
      id: 'undo-step',
      prompt:
        'After the recursive call `btPerm(a, idx+1, res)`, the code immediately performs `a[idx], a[i] = a[i], a[idx]` again. What is the purpose?',
      choices: [
        {
          label: 'Restore the slice — state before the swap so the next',
          correct: true,
        },
        {
          label: 'Sort the remaining suffix — enable pruning on the next call',
        },
        {
          label: 'Swap in the next candidate — early to avoid a redundant swap at',
        },
        {
          label: 'Reverse the slice — permutations are generated in',
        },
      ],
      explain:
        'This is the backtrack step. Because all iterations share the same slice, the swap must be undone before trying the next candidate `i+1`. Skipping it would leave the slice in a corrupted state for subsequent loop iterations.',
    },
    {
      id: 'complexity',
      prompt:
        'The time complexity is `O(n · n!)`. Where does the factor `n` come from beyond the `n!` permutations?',
      choices: [
        {
          label: 'Each permutation requires — There are n',
          correct: true,
        },
        {
          label: 'The swap loop at each recursion — There are n',
        },
        {
          label: 'The initial `copy(nums — a)` in `permArray` costs `O(n)`',
        },
        {
          label: 'Building the string key — memoization takes `O(n)` per call',
        },
      ],
      explain:
        'There are `n!` leaves in the recursion tree, and at each leaf the code executes `copy(row, a)` which is `O(n)`. The leaf-copy work dominates, giving `O(n · n!)` overall. (There is no memoization in this code.)',
    },
    {
      id: 'input-copy',
      prompt:
        '`permArray` copies the input `a` into a local `nums` slice before calling `btPerm`. Why?',
      choices: [
        {
          label: "To avoid mutating the caller's — original slice, since `btPerm` swaps",
          correct: true,
        },
        {
          label: 'To sort the slice — generating permutations for',
        },
        {
          label: 'To convert the slice — a value type so Go passes it by copy',
        },
        {
          label: 'To pre-allocate capacity equal — `n!` and avoid repeated allocations',
        },
      ],
      explain:
        "`btPerm` swaps elements of the slice it receives. If it operated directly on `a`, the caller would find their original array scrambled after the call. The defensive copy in `permArray` preserves the caller's data.",
    },
  ],
};

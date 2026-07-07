import type { PracticeBundle } from '../../../_shared/pluginKit';

export const bundle: PracticeBundle = {
  quiz: [
    {
      id: 'category',
      prompt:
        'Compared to a plain combination-sum with reuse, what two extra mechanisms does `combinationSumK` add?',
      choices: [
        {
          label: 'Sorting the array upfront — skipping duplicate siblings in the',
          correct: true,
        },
        {
          label: 'A visited boolean array — a BFS queue',
        },
        {
          label: 'A memo map to cache — (idx, target) pairs',
        },
        {
          label: 'Sorting and trimming the result — set after all recursion completes',
        },
      ],
      explain:
        'Sorting enables both the early-exit pruning (`target >= a[i]`) and the duplicate-sibling skip (`a[i] == a[i-1]`). Without sorting, neither optimization is possible.',
    },
    {
      id: 'duplicate-skip',
      prompt:
        'The condition `if i > idx && a[i] == a[i-1] { continue }` prevents duplicates. Why is the guard `i > idx` necessary?',
      choices: [
        {
          label: 'Without it, the first occurrence — of a duplicate value at this level',
          correct: true,
        },
        {
          label: 'It prevents the loop index — from going negative',
        },
        {
          label: 'It ensures at least one — element is always added to path',
        },
        {
          label: 'It guards against an out-of-bounds — access on `a[i-1]`',
        },
      ],
      explain:
        "The skip should only discard a value that has already been tried as the first pick at this level. `i > idx` means we've already used `a[idx]` as the starting pick once; a repeated value at `i` would produce a duplicate branch. At `i == idx`, the value is new territory and must not be skipped.",
    },
    {
      id: 'pruning',
      prompt:
        'The loop condition is `i < len(a) && target >= a[i]`. What does the `target >= a[i]` guard achieve?',
      choices: [
        {
          label: 'It prunes branches — next element already exceeds the',
          correct: true,
        },
        {
          label: 'It ensures elements are chosen — in non-decreasing order',
        },
        {
          label: 'It replaces the `target < — 0` base case, making the negative',
        },
        {
          label: 'It prevents integer overflow — subtracting `a[i]` from target',
        },
      ],
      explain:
        'Because the array is sorted, once `a[i] > target` every subsequent element is also too large. The guard short-circuits the loop early. The `target < 0` check is still present but is logically unreachable, since the loop only recurses when `target >= a[i]` keeps the next target non-negative.',
    },
    {
      id: 'no-reuse',
      prompt:
        'Each recursive call passes `i+1` as the new index. What would go wrong if `i` were passed instead?',
      choices: [
        {
          label: 'The same element could be reused — allowing combinations that',
          correct: true,
        },
        {
          label: 'The recursion would immediately — Passing i lets the next call',
        },
        {
          label: 'The duplicate-skip condition — Passing i lets the next call',
        },
        {
          label: 'Elements would be chosen — reverse order',
        },
      ],
      explain:
        'Passing `i` lets the next call pick `a[i]` again, effectively treating each value as infinitely available. `i+1` ensures each input position is used at most once per combination.',
    },
    {
      id: 'complexity',
      prompt:
        'Time complexity is O(m · 2^n) where m = average result length. What is the dominant source of the 2^n factor?',
      choices: [
        {
          label: 'In the worst case (all elements — large target) the',
          correct: true,
        },
        {
          label: 'Sorting the input takes O(2^n) — Each element can independently',
        },
        {
          label: 'The duplicate-skip check runs 2^n — times per element',
        },
        {
          label: 'The `copy` inside the base — case is O(2^n)',
        },
      ],
      explain:
        "Each element can independently be included or excluded from a combination, giving an upper bound of 2^n branches. Pruning and duplicate skipping reduce average-case work but don't change the worst-case exponent.",
    },
    {
      id: 'sort-requirement',
      prompt: 'What would break if the input array were NOT sorted before calling `btCombSum`?',
      choices: [
        {
          label: 'Both the early-exit pruning — the duplicate-sibling skip would',
          correct: true,
        },
        {
          label: 'Only performance would suffer; — would be unaffected',
        },
        {
          label: 'The `target < 0` base — case would never trigger',
        },
        {
          label: 'The result would contain extra — copies of correct combinations',
        },
      ],
      explain:
        'The pruning `target >= a[i]` assumes elements are non-decreasing — unsorted data would prune valid paths or miss pruning invalid ones. The duplicate check `a[i] == a[i-1]` also depends on equal values being adjacent; without sorting, duplicates might not be adjacent at all.',
    },
  ],
};

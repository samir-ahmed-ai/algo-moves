import type { LessonDef } from './types';

export const binarySearchLessons: LessonDef[] = [
  {
    id: 'binary-search-monotonic-predicate',
    title: 'Binary search is a predicate, not an array',
    summary: 'Any question that flips from no to yes exactly once can be binary searched.',
    estimatedMinutes: 6,
    tags: ['binary-search', 'predicate', 'mental-model'],
    blocks: [
      {
        kind: 'prose',
        text: 'Most people learn binary search as "find a number in a sorted array." That is the smallest, least interesting case. The real idea: if you can ask a **yes/no question** whose answer flips from _no_ to _yes_ exactly once as you scan an ordered domain, you can find that flip point in `O(log n)` questions.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The predicate, not the array',
      },
      {
        kind: 'prose',
        text: 'Call the question `pred(x)`. The one requirement is **monotonicity**: once `pred` becomes true it stays true. So the domain looks like `false false false | true true true`, and your whole job is to find the boundary — the **first** `x` where `pred(x)` is true.',
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'The only precondition',
        text: 'Binary search needs a monotonic predicate, not a sorted array. Sortedness is just the most common way to hand you monotonicity for free.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: '// firstTrue returns the smallest x in [lo, hi) with pred(x) true,\n// or hi if pred is never true. pred must be monotonic.\nfunc firstTrue(lo, hi int, pred func(int) bool) int {\n\tfor lo < hi {\n\t\tmid := lo + (hi-lo)/2\n\t\tif pred(mid) {\n\t\t\thi = mid // mid might be the answer — keep it\n\t\t} else {\n\t\t\tlo = mid + 1 // mid is too small — discard it\n\t\t}\n\t}\n\treturn lo\n}',
        caption: 'One routine finds the boundary of any monotonic predicate',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Classic search is just one predicate',
      },
      {
        kind: 'prose',
        text: 'Finding a target in a sorted slice is `firstTrue` with the predicate `a[i] >= target`. The boundary it returns is the first element not smaller than the target; a single equality check confirms a hit.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'i := firstTrue(0, len(a), func(i int) bool { return a[i] >= target })\nif i < len(a) && a[i] == target {\n\treturn i // found\n}\nreturn -1 // not present',
        caption: 'Ordinary search expressed through the predicate',
      },
      {
        kind: 'keyPoints',
        points: [
          'Binary search finds the boundary of a monotonic predicate `false...false|true...true`.',
          'The predicate is the abstraction; a sorted array is just one predicate, `a[i] >= target`.',
          'Write the boundary finder once; every problem becomes "what is my `pred`?".',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'binary-search',
        note: 'Before coding, name the predicate that flips exactly once across the array.',
      },
    ],
  },
  {
    id: 'binary-search-boundaries-without-off-by-one',
    title: 'Boundaries without off-by-one',
    summary: 'One loop invariant kills every off-by-one: the answer always lives in [lo, hi).',
    estimatedMinutes: 7,
    tags: ['binary-search', 'invariants', 'off-by-one'],
    blocks: [
      {
        kind: 'prose',
        text: 'Binary search is four lines that everyone gets wrong. Infinite loops, missed elements, index-out-of-range — all of them come from guessing at `+1`s instead of committing to an **invariant** and letting it dictate every line.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Pick a half-open interval and hold it',
      },
      {
        kind: 'prose',
        text: 'Use `[lo, hi)` — `lo` included, `hi` excluded. Start with `lo, hi := 0, len(a)`. The invariant you protect on every iteration: _the answer is somewhere in `[lo, hi)`_. When `lo == hi` the window is empty, the loop ends, and `lo` **is** the answer.',
      },
      {
        kind: 'list',
        items: [
          '**`mid := lo + (hi-lo)/2`** — biased low, so `lo <= mid < hi`; never overflows.',
          "**Answer can't be `mid`?** move `lo = mid + 1` (skip `mid`, it's now excluded).",
          '**Answer could be `mid`?** move `hi = mid` (keep `mid`, `hi` is excluded anyway).',
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        code: "func lowerBound(a []int, target int) int {\n\tlo, hi := 0, len(a) // invariant: answer is in [lo, hi)\n\tfor lo < hi {\n\t\tmid := lo + (hi-lo)/2 // lo <= mid < hi, no overflow\n\t\tif a[mid] < target {\n\t\t\tlo = mid + 1 // a[mid] can't be it — drop it\n\t\t} else {\n\t\t\thi = mid // a[mid] might be it — keep it\n\t\t}\n\t}\n\treturn lo // lo == hi: first index with a[i] >= target\n}",
        caption: 'Lower bound: first index with a[i] >= target',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'The two bugs this prevents',
        text: 'Writing `hi = mid - 1` in the keep branch can discard the answer. Writing `lo = mid` in the discard branch loops forever when `hi - lo == 1`. The asymmetry `mid + 1` vs `mid` is forced by the half-open interval — it is not a choice.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Why it always terminates',
      },
      {
        kind: 'prose',
        text: 'Each iteration strictly shrinks `hi - lo`: the `lo = mid + 1` branch raises `lo` past `mid`, and the `hi = mid` branch lowers `hi` to `mid < hi`. A strictly decreasing non-negative integer must reach zero, so the loop cannot spin. Convince yourself once with the `hi - lo == 1` case, where `mid == lo`, and you will never write the infinite-loop variant again.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Commit to `[lo, hi)` and state the invariant "answer is in `[lo, hi)`" out loud.',
          '`mid = lo + (hi-lo)/2` is biased low and overflow-safe; pair it with `lo = mid+1` / `hi = mid`.',
          'Termination is guaranteed because `hi - lo` strictly decreases every pass.',
          'When the loop exits, `lo == hi` and `lo` is the boundary — no post-loop fixups.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'binary-search',
        note: 'Implement it with the half-open interval and check the empty and single-element cases.',
      },
    ],
  },
  {
    id: 'binary-search-on-the-answer',
    title: 'Binary search on the answer',
    summary:
      'When you can check an answer faster than you can find it, search the answer space itself.',
    estimatedMinutes: 7,
    tags: ['binary-search', 'optimization', 'predicate'],
    blocks: [
      {
        kind: 'prose',
        text: 'Some problems give you no array to search — they ask for the **smallest (or largest) value** that satisfies a constraint. If checking a candidate answer is easy but computing it directly is hard, binary search the answer space instead of the input.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The recipe',
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Bound',
            caption:
              'Find `lo` and `hi` that surely bracket the answer (a value too small, a value big enough).',
          },
          {
            title: 'Feasibility',
            caption:
              'Write `feasible(x)`: a boolean that is true when `x` satisfies the constraint.',
          },
          {
            title: 'Monotonicity',
            caption:
              'Argue that once `feasible(x)` is true, `feasible(x+1)` is also true — the flip happens once.',
          },
          {
            title: 'Search',
            caption: 'Run the boundary finder to get the first (or last) feasible `x`.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Monotonicity is the whole game',
        text: 'If a bigger answer is never harder to satisfy than a smaller one, the domain is `false...false|true...true` and binary search applies. Prove that flip is one-directional before you trust the result.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: '// minSpeed: smallest s such that all piles finish within h hours.\nfunc minSpeed(piles []int, h int) int {\n\tfeasible := func(s int) bool {\n\t\thours := 0\n\t\tfor _, p := range piles {\n\t\t\thours += (p + s - 1) / s // ceil(p / s)\n\t\t}\n\t\treturn hours <= h\n\t}\n\tlo, hi := 1, 0\n\tfor _, p := range piles {\n\t\tif p > hi {\n\t\t\thi = p // eating the biggest pile at speed=max takes 1 hour\n\t\t}\n\t}\n\tfor lo < hi { // find first feasible speed in [lo, hi)\n\t\tmid := lo + (hi-lo)/2\n\t\tif feasible(mid) {\n\t\t\thi = mid\n\t\t} else {\n\t\t\tlo = mid + 1\n\t\t}\n\t}\n\treturn lo\n}',
        caption: 'Smallest eating speed that clears every pile within h hours',
      },
      {
        kind: 'prose',
        text: '`feasible` is monotonic because a faster speed can only reduce the hours needed: once a speed finishes in time, every larger speed does too. That single fact is what licenses the search — the loop is the same boundary finder from the other lessons, applied to speeds rather than indices.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Search the answer when checking a candidate is cheaper than computing the optimum.',
          'Recipe: bound the range, write `feasible(x)`, prove it flips once, find the boundary.',
          'The reusable core never changes — only `feasible` and the `[lo, hi)` bounds are new.',
          'Replaces a linear scan over the answer range (`O(range)` candidates) with about `log2(range)` feasibility checks — a few dozen even for a billion-wide range.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'binary-search',
        note: 'Warm up on the array version, then re-read this to see it as searching an answer space.',
      },
    ],
  },
];

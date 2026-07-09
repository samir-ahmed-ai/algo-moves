import type { LessonDef } from './types';

export const arraysLessons: LessonDef[] = [
  {
    id: 'arrays-two-pointer-sorted',
    title: 'Two pointers on sorted data',
    summary: 'When the array is sorted, one pass from both ends beats checking every pair.',
    estimatedMinutes: 6,
    tags: ['arrays', 'two-pointers', 'sorted'],
    blocks: [
      {
        kind: 'prose',
        text: 'Checking every pair to find two numbers that meet a condition is _O(n²)_. But if the array is **sorted**, you can throw away whole ranges of pairs at once and finish in a single _O(n)_ sweep.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Converge from both ends',
      },
      {
        kind: 'prose',
        text: 'Put one pointer at the start and one at the end, then read the sum at the two ends. It tells you which pointer to move: too small means you need a bigger value, so raise the low end; too big means the opposite, so lower the high end. Every move permanently rules out a pair that can never work.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func twoSum(nums []int, target int) (int, int) {\n\ti, j := 0, len(nums)-1\n\tfor i < j {\n\t\tsum := nums[i] + nums[j]\n\t\tswitch {\n\t\tcase sum == target:\n\t\t\treturn i, j\n\t\tcase sum < target:\n\t\t\ti++ // need a bigger sum: raise the low end\n\t\tdefault:\n\t\t\tj-- // need a smaller sum: lower the high end\n\t\t}\n\t}\n\treturn -1, -1\n}',
        caption: 'Two-sum on a sorted array',
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Why sorting is the whole trick',
        text: 'Sortedness makes the sum **monotonic** as each pointer moves. That is what lets a single comparison discard an entire block of pairs — without it, moving a pointer tells you nothing.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Two families of two-pointer',
      },
      {
        kind: 'list',
        items: [
          '**Converging** — pointers start at opposite ends and move toward each other. Needs sorted (or otherwise ordered) data: pair sums, palindrome checks, container-with-most-water.',
          '**Same-direction** — a slow and a fast pointer both move forward. Great for in-place work on _unsorted_ data: dedupe, partition, remove-in-place, cycle detection.',
        ],
      },
      {
        kind: 'keyPoints',
        points: [
          'Sorted input turns an _O(n²)_ pair search into an _O(n)_ two-pointer sweep.',
          'Each pointer move discards a range of pairs because the sum is monotonic.',
          'Opposite ends → converging; slow/fast in one direction → in-place scanning.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'two-sum-sorted',
        note: 'Reach for the converging template before peeking at the solution.',
      },
    ],
  },
  {
    id: 'arrays-sliding-window-invariant',
    title: 'Sliding windows: grow, shrink, hold the invariant',
    summary: 'Keep the window valid by expanding on the right and contracting on the left.',
    estimatedMinutes: 8,
    tags: ['arrays', 'sliding-window', 'invariant'],
    blocks: [
      {
        kind: 'prose',
        text: 'A sliding window is a contiguous range `[left, right]` that slides across the array. The whole technique is a single discipline: define a property the window must satisfy, then move the ends so it always does.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The invariant',
      },
      {
        kind: 'prose',
        text: 'Pick the property _P_ your window must hold — "at most k zeros", "no repeated character", "sum below the limit". _P_ is the **invariant**. Every iteration you restore it before recording an answer, so the window is never in an illegal state when you measure it.',
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Expand',
            caption: 'Advance right by one, pulling the new element into the window.',
          },
          {
            title: 'Restore',
            caption:
              'While the invariant is broken, advance left, dropping elements until P holds again.',
          },
          {
            title: 'Record',
            caption: 'The window is now valid — update your answer from its current bounds.',
          },
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func longestOnes(nums []int, k int) int {\n\tbest, left, zeros := 0, 0, 0\n\tfor right, x := range nums {\n\t\tif x == 0 {\n\t\t\tzeros++\n\t\t}\n\t\tfor zeros > k { // invariant broken: too many zeros inside\n\t\t\tif nums[left] == 0 {\n\t\t\t\tzeros--\n\t\t\t}\n\t\t\tleft++\n\t\t}\n\t\tif right-left+1 > best {\n\t\t\tbest = right - left + 1\n\t\t}\n\t}\n\treturn best\n}',
        caption: 'Longest subarray with at most k zeros',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Which direction do you shrink?',
        text: 'The shrink condition decides the problem you are solving. Shrink _while invalid_ to find the **longest** valid window; shrink _while still valid_ to find the **shortest** one. Getting this backwards is the classic sliding-window bug.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The two shapes',
      },
      {
        kind: 'list',
        items: [
          '**Longest / largest** — grow greedily, shrink only when _P_ breaks, measure after restoring.',
          '**Shortest / smallest** — grow until _P_ first holds, then shrink as far as it still holds, measuring each step.',
        ],
      },
      {
        kind: 'keyPoints',
        points: [
          'A window is a range `[left, right]` plus an invariant it must satisfy.',
          'right always advances; left only advances to restore the invariant — so each index enters and leaves at most once, giving _O(n)_.',
          'Shrink-while-invalid finds the longest window; shrink-while-valid finds the shortest.',
        ],
      },
    ],
  },
  {
    id: 'arrays-fixed-window',
    title: 'Fixed-size windows: slide the running total',
    summary: 'Never re-sum a window — add what enters, subtract what leaves.',
    estimatedMinutes: 5,
    tags: ['arrays', 'sliding-window', 'fixed-window'],
    blocks: [
      {
        kind: 'prose',
        text: 'Some windows never change size: you scan every contiguous block of exactly `k` elements. Recomputing each block from scratch is _O(nk)_ — but almost all of the work repeats, and you can reuse it.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Keep a running total',
      },
      {
        kind: 'prose',
        text: 'Consecutive windows overlap in all but two positions. When the window slides one step, exactly one element enters on the right and one leaves on the left. Maintain a running aggregate and patch it with those two changes instead of re-reading the whole block.',
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Seed',
            caption: 'Aggregate the first k elements once to prime the window.',
          },
          {
            title: 'Slide',
            caption: 'Add the entering element and subtract the leaving one: nums[i] - nums[i-k].',
          },
          {
            title: 'Track',
            caption: 'Compare the fresh total against your best after each slide.',
          },
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func maxSum(nums []int, k int) int {\n\tsum := 0\n\tfor i := 0; i < k; i++ { // seed the first window\n\t\tsum += nums[i]\n\t}\n\tbest := sum\n\tfor i := k; i < len(nums); i++ {\n\t\tsum += nums[i] - nums[i-k] // add the entering value, drop the leaving one\n\t\tif sum > best {\n\t\t\tbest = sum\n\t\t}\n\t}\n\treturn best\n}',
        caption: 'Max sum of any k-length window',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Mind the edges',
        text: 'The pattern assumes `len(nums) >= k`; guard that first. The single add-and-subtract line is the entire optimization — it turns _O(nk)_ into _O(n)_.',
      },
      {
        kind: 'keyPoints',
        points: [
          'A fixed window slides by one: one element in, one out — so patch the aggregate, do not rebuild it.',
          'Seed the first k elements, then update with nums[i] - nums[i-k] each step.',
          'Running total collapses _O(nk)_ into a single _O(n)_ pass.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'max-subarray-sum-k',
        note: 'Nail the seed-then-slide rhythm here before tackling variable windows.',
      },
    ],
  },
];

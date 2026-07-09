import type { LessonDef } from './types';

export const heapsLessons: LessonDef[] = [
  {
    id: 'heaps-invariant-sift',
    title: 'The heap invariant & sift-up/sift-down',
    summary: 'A heap is just an array that keeps its smallest value on top.',
    estimatedMinutes: 7,
    tags: ['heaps', 'binary-heap', 'sift'],
    blocks: [
      {
        kind: 'prose',
        text: 'A **binary heap** is a complete binary tree flattened into an array. It never sorts its elements — it maintains one weak promise, the _heap invariant_, and that promise is exactly enough to read the min (or max) in O(1) and update it in O(log n).',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The invariant',
      },
      {
        kind: 'prose',
        text: 'In a **min-heap**, every parent is `<=` both of its children. Nothing is said about siblings or cousins — only the parent/child edge matters. Because the tree is _complete_ (filled left-to-right), you never store pointers; the array index does the work.',
      },
      {
        kind: 'list',
        items: [
          'Node `i` sits at `data[i]`.',
          'Its parent is `(i-1)/2`.',
          'Its children are `2*i+1` and `2*i+2`.',
        ],
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Weak by design',
        text: "The root is the global minimum, but index 1 is not _necessarily_ the second smallest — the runner-up is always one of the root's two children, yet nothing pins it to index 1 rather than index 2. A heap is not a sorted array; it is the cheapest structure that keeps the extreme element reachable.",
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Sift-up: restore after a push',
      },
      {
        kind: 'prose',
        text: 'Append the new value as the last leaf, then bubble it up while it is smaller than its parent. It travels at most the height of the tree, so a push costs O(log n).',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'type MinHeap struct{ data []int }\n\nfunc (h *MinHeap) Push(x int) {\n\th.data = append(h.data, x) // add at the end...\n\ti := len(h.data) - 1\n\tfor i > 0 { // ...then sift it up\n\t\tparent := (i - 1) / 2\n\t\tif h.data[parent] <= h.data[i] {\n\t\t\tbreak\n\t\t}\n\t\th.data[parent], h.data[i] = h.data[i], h.data[parent]\n\t\ti = parent\n\t}\n}',
        caption: 'Push + sift-up on a min-heap',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Sift-down: restore after a pop',
      },
      {
        kind: 'prose',
        text: 'To remove the min, save the root, move the last leaf into its place, then push that value down — always swapping toward the _smaller_ child until both children are `>=` it. Picking the smaller child is what preserves the invariant.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func (h *MinHeap) Pop() int {\n\ttop := h.data[0]\n\tn := len(h.data) - 1\n\th.data[0] = h.data[n] // move the last leaf to the root...\n\th.data = h.data[:n]\n\ti := 0\n\tfor { // ...then sift it down\n\t\tl, r, small := 2*i+1, 2*i+2, i\n\t\tif l < n && h.data[l] < h.data[small] {\n\t\t\tsmall = l\n\t\t}\n\t\tif r < n && h.data[r] < h.data[small] {\n\t\t\tsmall = r\n\t\t}\n\t\tif small == i {\n\t\t\tbreak\n\t\t}\n\t\th.data[i], h.data[small] = h.data[small], h.data[i]\n\t\ti = small\n\t}\n\treturn top\n}',
        caption: 'Pop + sift-down on a min-heap',
      },
      {
        kind: 'keyPoints',
        points: [
          'A heap is a complete tree stored in an array — indices replace pointers.',
          'The only rule: parent `<=` children (min-heap). Siblings are unordered.',
          'Push = append + sift-up; Pop = swap-root-with-last + sift-down. Both O(log n).',
          'Peek at the min is O(1) — it is always `data[0]`.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'heap-operations',
        note: 'Trace push and pop by hand, watching each sift restore the invariant one swap at a time.',
      },
    ],
  },
  {
    id: 'heaps-priority-queue-top-k',
    title: 'Top-K with a priority queue',
    summary: "A size-K heap turns 'the K largest' into a single linear pass.",
    estimatedMinutes: 7,
    tags: ['heaps', 'priority-queue', 'top-k'],
    blocks: [
      {
        kind: 'prose',
        text: "You rarely hand-roll a heap in an interview — you reach for Go's `container/heap`. It gives you the sift logic for free; you only supply ordering and how to add/remove the backing slice.",
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The container/heap adapter',
      },
      {
        kind: 'prose',
        text: 'Implement `sort.Interface` (`Len`, `Less`, `Swap`) plus `Push`/`Pop` that mutate the slice. `Less` decides the flavor: `<` gives a min-heap, `>` gives a max-heap.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'import "container/heap"\n\n// IntHeap is a min-heap of ints implementing heap.Interface.\ntype IntHeap []int\n\nfunc (h IntHeap) Len() int           { return len(h) }\nfunc (h IntHeap) Less(i, j int) bool { return h[i] < h[j] }\nfunc (h IntHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }\n\nfunc (h *IntHeap) Push(x any) { *h = append(*h, x.(int)) }\n\nfunc (h *IntHeap) Pop() any {\n\told := *h\n\tn := len(old)\n\tx := old[n-1]\n\t*h = old[:n-1]\n\treturn x\n}',
        caption: 'A reusable min-heap of ints',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Call the package, not the method',
        text: 'Always use `heap.Push(h, x)` and `heap.Pop(h)` — the free functions run the sift. Calling `h.Push` / `h.Pop` directly skips it and quietly corrupts the invariant.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Top-K with a bounded heap',
      },
      {
        kind: 'prose',
        text: 'To find the K _largest_ values, keep a **min-heap of size K**. Its top is the smallest of your current champions, so any new value only needs to beat that one number to earn a spot — and evict the loser.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: '// topK returns the k largest values (heap order, not sorted).\nfunc topK(nums []int, k int) []int {\n\th := &IntHeap{}\n\tfor _, x := range nums {\n\t\theap.Push(h, x)\n\t\tif h.Len() > k {\n\t\t\theap.Pop(h) // drop the current smallest\n\t\t}\n\t}\n\treturn *h\n}',
        caption: 'K largest in one pass — O(n log k) time, O(k) space',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Which heap for which K?',
        text: 'K _largest_ → min-heap of size K (evict the smallest). K _smallest_ → max-heap of size K (evict the largest). It feels backwards until you say it out loud: the top is the element on the chopping block.',
      },
      {
        kind: 'keyPoints',
        points: [
          '`container/heap` gives you sift-up/down; you supply `Less` and slice mutation.',
          'K largest ⇒ min-heap capped at K; the root is the eviction candidate.',
          'Bounded heap ⇒ O(n log k) time and O(k) space — cheaper than sorting all n.',
          'Sorting is O(n log n); the heap wins whenever k is small relative to n.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'heap-operations',
        note: 'The push/pop you drill here are the exact primitives topK leans on.',
      },
    ],
  },
  {
    id: 'heaps-streaming-median',
    title: 'Streaming median with two heaps',
    summary: 'Split the stream into two heaps and the median lives at their tops.',
    estimatedMinutes: 7,
    tags: ['heaps', 'two-heaps', 'streaming-median'],
    blocks: [
      {
        kind: 'prose',
        text: 'You get numbers one at a time and must report the running **median** after each. Re-sorting every time is O(n log n) per query. The two-heap trick makes each insert O(log n) and each median O(1).',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Two heaps, balanced',
      },
      {
        kind: 'prose',
        text: 'Cut the sorted stream in the middle. The lower half lives in a **max-heap** (`lo`) so its top is the largest of the small numbers; the upper half lives in a **min-heap** (`hi`) so its top is the smallest of the big numbers. The median sits right at that seam.',
      },
      {
        kind: 'list',
        items: [
          "`lo` = max-heap of the smaller half — its top is the seam's low side.",
          "`hi` = min-heap of the larger half — its top is the seam's high side.",
          'Keep the sizes within one: `len(lo) == len(hi)` or `len(lo) == len(hi)+1`.',
        ],
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Insert',
            caption: 'Push the new value into lo (the low half).',
          },
          {
            title: 'Shuttle',
            caption:
              "Pop lo's max and push it to hi — this guarantees every element of lo <= every element of hi.",
          },
          {
            title: 'Rebalance',
            caption: "If hi is now larger than lo, move hi's min back to lo so lo never trails.",
          },
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        code: '// lo stores the smaller half NEGATED, so a min-heap acts as a max-heap;\n// hi stores the larger half as-is.\ntype MedianFinder struct{ lo, hi *IntHeap }\n\nfunc NewMedianFinder() *MedianFinder {\n\treturn &MedianFinder{lo: &IntHeap{}, hi: &IntHeap{}}\n}\n\nfunc (m *MedianFinder) Add(x int) {\n\theap.Push(m.lo, -x)                    // tentatively into the low half\n\theap.Push(m.hi, -heap.Pop(m.lo).(int)) // shuttle its max up to hi\n\tif m.hi.Len() > m.lo.Len() {           // keep lo >= hi in size\n\t\theap.Push(m.lo, -heap.Pop(m.hi).(int))\n\t}\n}\n\nfunc (m *MedianFinder) Median() float64 {\n\tif m.lo.Len() > m.hi.Len() {\n\t\treturn float64(-(*m.lo)[0]) // odd count: lo holds the middle\n\t}\n\treturn float64((*m.hi)[0]-(*m.lo)[0]) / 2 // even: average the two tops\n}',
        caption: 'MedianFinder — reuses the IntHeap adapter from the top-K lesson',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Always push-then-rebalance',
        text: 'Never insert straight into hi based on a comparison — the push/shuttle/rebalance order keeps the invariant correct even for the very first element, when one heap is still empty.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Median of a stream = a max-heap of the low half + a min-heap of the high half.',
          'Keep sizes within one; the median is one top (odd) or the average of both tops (even).',
          'Store the low half negated so a single min-heap type serves as both heaps.',
          'Insert O(log n), query O(1) — versus O(n log n) to re-sort each time.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'heap-operations',
        note: 'Every Add here is two pushes and a pop — master the single-heap operations first.',
      },
    ],
  },
];

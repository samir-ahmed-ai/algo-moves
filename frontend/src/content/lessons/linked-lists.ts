import type { LessonDef } from './types';

export const linkedListsLessons: LessonDef[] = [
  {
    id: 'linked-lists-save-next-first',
    title: 'Rewire without losing the tail',
    summary: "Before you overwrite a node's Next, save it — or everything behind it vanishes.",
    estimatedMinutes: 6,
    tags: ['linked-lists', 'pointers', 'reversal'],
    blocks: [
      {
        kind: 'prose',
        text: "A singly linked list is a one-way chain: every node holds a value and a single `Next` pointer to its successor. That one-directionality is the whole game. The instant you overwrite a node's `Next`, the node it *used* to point at becomes unreachable — unless you stashed that pointer somewhere first.",
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Watch the tail disappear',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'type ListNode struct {\n\tVal  int\n\tNext *ListNode\n}\n\n// BUG: overwrites Next before stashing it.\nfunc reverseBroken(head *ListNode) *ListNode {\n\tvar prev *ListNode\n\tfor head != nil {\n\t\thead.Next = prev // orphans the rest of the list\n\t\tprev = head\n\t\thead = head.Next // reads the pointer we just overwrote — follows prev, not the successor\n\t}\n\treturn prev\n}',
        caption: 'The bug: rewire before saving',
      },
      {
        kind: 'prose',
        text: 'On the first pass `prev` is still `nil`, so `head.Next = prev` sets `head.Next` to `nil` — and then `head = head.Next` reads that just-overwritten pointer and jumps straight to `nil`, ending the loop after a single step. Node 0 now points at `nil` and every node behind it is orphaned, unreachable forever because nothing else references them.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The fix: save next first',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func reverse(head *ListNode) *ListNode {\n\tvar prev *ListNode\n\tcurr := head\n\tfor curr != nil {\n\t\tnext := curr.Next // 1. save the successor\n\t\tcurr.Next = prev  // 2. rewire this node backward\n\t\tprev = curr       // 3. advance prev\n\t\tcurr = next       // 4. advance curr via the saved pointer\n\t}\n\treturn prev\n}',
        caption: 'Three pointers, correct order',
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Save',
            caption: 'Stash `curr.Next` in a local `next` before touching anything.',
          },
          {
            title: 'Rewire',
            caption: 'Point `curr.Next` at `prev` — the reversal itself.',
          },
          {
            title: 'Advance prev',
            caption: '`prev = curr`: the node we just finished becomes the new back of the list.',
          },
          {
            title: 'Advance curr',
            caption: '`curr = next`: hop forward using the pointer we saved in step 1.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Order is everything',
        text: 'Steps 1 and 2 must not swap. Rewire before you save and the saved pointer already points the wrong way — the tail is gone, and no later code brings it back.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Overwriting `Next` destroys the only reference to the rest of the list — save it first.',
          '`prev`, `curr`, `next`: three pointers reverse a list in one pass, O(n) time and O(1) space.',
          'The pattern generalizes: any in-place rewiring (swap pairs, partition, merge) saves the next hop before cutting the current link.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'reverse-linked-list',
        note: 'The canonical drill — implement it iteratively with three pointers before peeking at the solution.',
      },
    ],
  },
  {
    id: 'linked-lists-cycle-detection',
    title: 'Fast and slow: detecting a cycle',
    summary:
      "Two pointers at different speeds must collide if the list loops — Floyd's tortoise and hare.",
    estimatedMinutes: 7,
    tags: ['linked-lists', 'two-pointers', 'cycle'],
    blocks: [
      {
        kind: 'prose',
        text: "Reaching `nil` is how you know a list ends. But a list whose tail points back into itself never reaches `nil` — follow `Next` forever and you just spin. How do you detect that loop without a hash set of every node you've seen?",
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Tortoise and hare',
      },
      {
        kind: 'prose',
        text: 'Run two pointers: `slow` advances one node per step, `fast` advances two. If the list has no cycle, `fast` falls off the end and hits `nil`. If it *does* cycle, `fast` re-enters the loop and closes on `slow` from behind until they land on the same node.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func hasCycle(head *ListNode) bool {\n\tslow, fast := head, head\n\tfor fast != nil && fast.Next != nil {\n\t\tslow = slow.Next\n\t\tfast = fast.Next.Next\n\t\tif slow == fast {\n\t\t\treturn true\n\t\t}\n\t}\n\treturn false\n}',
        caption: "Floyd's cycle detection",
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Guard both fast and fast.Next',
        text: '`fast.Next.Next` dereferences two links, so both `fast` and `fast.Next` must be non-nil first — otherwise you panic on the last node of a finite list.',
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Why they must meet',
        text: 'Once both pointers are inside the loop, every step closes the gap between them by exactly one node. A shrinking, non-negative distance has to reach zero — so they collide, guaranteed, before the slow pointer completes even one full lap of the loop.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Fast/slow detects a cycle in O(n) time and O(1) space — no set of visited nodes required.',
          'Loop while `fast != nil && fast.Next != nil`; `slow == fast` means a cycle exists.',
          'Reaching `nil` means no cycle — a finite list always lets the fast pointer run off the end.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'linked-list-cycle',
        note: 'Return true/false first; the same two-pointer setup later extends to finding where the cycle begins.',
      },
    ],
  },
  {
    id: 'linked-lists-find-middle',
    title: 'Fast and slow: finding the middle',
    summary: 'When fast reaches the end, slow sits at the midpoint — one pass, no length count.',
    estimatedMinutes: 6,
    tags: ['linked-lists', 'two-pointers', 'midpoint'],
    blocks: [
      {
        kind: 'prose',
        text: 'The obvious way to find the middle is two passes: count the length, then walk halfway in. The same fast/slow trick does it in a single pass — when `fast` (two steps at a time) reaches the end, `slow` (one step) has travelled exactly half as far.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'One pass to the middle',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func middleNode(head *ListNode) *ListNode {\n\tslow, fast := head, head\n\tfor fast != nil && fast.Next != nil {\n\t\tslow = slow.Next\n\t\tfast = fast.Next.Next\n\t}\n\treturn slow\n}',
        caption: 'Middle node in a single pass',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Which middle?',
        text: 'Odd length: `slow` lands on the exact center. Even length: it lands on the **second** of the two middle nodes, because `fast` overshoots. Tighten the loop to `fast.Next != nil && fast.Next.Next != nil` to stop one step earlier and get the first middle instead (guard against an empty list first, since it dereferences `fast.Next`).',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Splitting a list in half',
      },
      {
        kind: 'prose',
        text: 'To cut a list into halves — for merge sort, or a palindrome check — you want the *tail of the first half* so you can sever the link there. Stopping one step earlier gives you exactly that node.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func firstHalfTail(head *ListNode) *ListNode {\n\tif head == nil || head.Next == nil {\n\t\treturn head\n\t}\n\tslow, fast := head, head\n\tfor fast.Next != nil && fast.Next.Next != nil {\n\t\tslow = slow.Next\n\t\tfast = fast.Next.Next\n\t}\n\treturn slow\n}',
        caption: 'First-half tail (the split point)',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Sever cleanly',
        text: 'Given the first-half tail, split with `second := tail.Next; tail.Next = nil`. Now you hold two independent lists you can recurse on or compare.',
      },
      {
        kind: 'keyPoints',
        points: [
          'When fast (2x) reaches the end, slow (1x) sits at the midpoint — one pass, no length count.',
          'Even length has two middles: the standard loop returns the second, a one-step-earlier loop returns the first.',
          'The first-half tail is the split point — cut its `Next` to divide a list for merge sort or a palindrome check.',
        ],
      },
    ],
  },
];

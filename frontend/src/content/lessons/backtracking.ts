import type { LessonDef } from './types';

export const backtrackingLessons: LessonDef[] = [
  {
    id: 'backtracking-choose-explore-unchoose',
    title: 'Choose, explore, un-choose',
    summary: 'The three-move skeleton behind every backtracking solution.',
    estimatedMinutes: 6,
    tags: ['backtracking', 'recursion', 'enumeration'],
    blocks: [
      {
        kind: 'prose',
        text: 'Backtracking builds a solution one decision at a time. At each step you **choose** a candidate, **explore** the rest of the problem on top of that choice, then **un-choose** it so the next candidate starts from a clean slate. Learn those three moves and every backtracking problem starts to look the same.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The skeleton',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func subsets(nums []int) [][]int {\n\tvar res [][]int\n\tvar path []int\n\tvar dfs func(start int)\n\tdfs = func(start int) {\n\t\tres = append(res, append([]int{}, path...)) // record this node\n\t\tfor i := start; i < len(nums); i++ {\n\t\t\tpath = append(path, nums[i]) // choose\n\t\t\tdfs(i + 1)                   // explore\n\t\t\tpath = path[:len(path)-1]    // un-choose\n\t\t}\n\t}\n\tdfs(0)\n\treturn res\n}',
        caption: 'Subsets: every node of the recursion is itself a subset',
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Choose',
            caption: 'Append the next candidate to the current path.',
          },
          {
            title: 'Explore',
            caption: 'Recurse to make the remaining decisions on top of that choice.',
          },
          {
            title: 'Un-choose',
            caption: 'Pop the candidate so the next loop iteration starts clean.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'The un-choose is what people forget',
        text: 'Mutating shared state without undoing it leaks a choice into every sibling branch. Each `choose` needs a matching `un-choose` on the way back up — the two bracket the recursive call.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Why undo instead of copy?',
      },
      {
        kind: 'prose',
        text: 'You could pass a fresh copy of the path into every recursive call and skip the un-choose. But that allocates at every node of the tree. Mutating one shared slice and undoing the last step keeps extra space at O(depth) — you copy only when you record a finished solution.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Backtracking = choose a candidate, explore deeper, then un-choose.',
          'The un-choose restores state so sibling branches start clean.',
          'One shared, mutated path plus undo is O(depth) space, not O(nodes).',
          'Snapshot the path only when you record a completed solution.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'subsets',
        note: 'Every node of the recursion tree is a subset — snapshot the path at each node.',
      },
    ],
  },
  {
    id: 'backtracking-recursion-tree',
    title: 'The recursion tree is the search space',
    summary:
      'Read your backtracking as a tree: nodes are partial solutions, leaves are candidates.',
    estimatedMinutes: 6,
    tags: ['backtracking', 'recursion', 'complexity'],
    blocks: [
      {
        kind: 'prose',
        text: 'Every backtracking function traces out a tree. The root is the empty solution, each edge is one decision, each node is a partial solution, and the leaves are complete candidates. You are not writing a loop — you are walking a tree, and the tree _is_ your search space.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Reading the tree',
      },
      {
        kind: 'list',
        items: [
          '**Depth** — how many decisions you have made so far; equals the recursion depth.',
          '**Branching factor** — how many candidates a node can choose from.',
          '**Leaves** — complete assignments; where you record or test a solution.',
          '**A root-to-leaf path** — one full candidate, built one edge at a time.',
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        code: '// Each level decides one element: take it or skip it.\n// The recursion tree is a binary tree of depth n, so it has\n// 2^n leaves, exactly the number of subsets.\nfunc countSubsets(n int) int {\n\tvar walk func(i int) int\n\twalk = func(i int) int {\n\t\tif i == n {\n\t\t\treturn 1 // a leaf: one complete subset\n\t\t}\n\t\treturn walk(i+1) + walk(i+1) // skip branch + take branch\n\t}\n\treturn walk(0)\n}',
        caption: 'The include/exclude tree for subsets has exactly 2^n leaves',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Complexity falls out of the shape',
      },
      {
        kind: 'prose',
        text: 'Run time is roughly the number of nodes you visit, and the number of leaves is the size of the search space. A depth-n binary tree has 2^n leaves — that is exactly why naive subset and subset-sum search is exponential. Pruning earns its keep by deleting whole subtrees before you ever walk them.',
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Draw the tree first',
        text: 'To reason about any backtracking algorithm, sketch its recursion tree. Branching-factor ^ depth ≈ number of leaves ≈ size of the search space ≈ the cost of a full search.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Backtracking explores a tree: nodes are partial solutions, leaves are candidates.',
          'Depth = decisions made; branching factor = choices per step.',
          'Leaf count ≈ search-space size ≈ the cost of an exhaustive search.',
          'Cutting one subtree removes all of its leaves at once.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'subsets',
        note: 'The include/exclude tree has 2^n leaves — one per subset.',
      },
    ],
  },
  {
    id: 'backtracking-pruning',
    title: 'Pruning dead branches early',
    summary: 'Kill a subtree the moment a constraint breaks — before you build the rest of it.',
    estimatedMinutes: 7,
    tags: ['backtracking', 'pruning', 'constraints'],
    blocks: [
      {
        kind: 'prose',
        text: 'A correct-but-slow backtracker builds every candidate and only tests it at the leaf. Pruning moves the test up: check constraints _as_ you build, so a violated constraint kills the entire subtree instead of enumerating it. Same choose / explore / un-choose skeleton — you just refuse to explore doomed branches.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Test before you recurse',
      },
      {
        kind: 'prose',
        text: 'Move the feasibility check from the leaf onto each edge. If placing a candidate already breaks a constraint, `continue` past it — you skip every one of the (branching ^ remaining) leaves that lived under it.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: '// Place one queen per row. Reject a column the moment it conflicts,\n// so the whole subtree of later rows is never explored.\nfunc solveNQueens(n int) int {\n\tcols := make([]bool, n)\n\tdiag1 := make([]bool, 2*n) // r + c\n\tdiag2 := make([]bool, 2*n) // r - c + n\n\tcount := 0\n\tvar place func(r int)\n\tplace = func(r int) {\n\t\tif r == n {\n\t\t\tcount++ // a full, valid placement (a leaf)\n\t\t\treturn\n\t\t}\n\t\tfor c := 0; c < n; c++ {\n\t\t\tif cols[c] || diag1[r+c] || diag2[r-c+n] {\n\t\t\t\tcontinue // prune: this square is attacked\n\t\t\t}\n\t\t\tcols[c], diag1[r+c], diag2[r-c+n] = true, true, true // choose\n\t\t\tplace(r + 1)                                         // explore\n\t\t\tcols[c], diag1[r+c], diag2[r-c+n] = false, false, false // un-choose\n\t\t}\n\t}\n\tplace(0)\n\treturn count\n}',
        caption: 'N-Queens: reject an attacked square, skipping its whole subtree',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Prune high in the tree',
        text: 'The cheaper and more selective a check, the earlier you should apply it. Cutting a branch near the root removes exponentially more work than cutting one near the leaves.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Two kinds of pruning',
      },
      {
        kind: 'list',
        items: [
          '**Feasibility pruning** — the partial solution already breaks a hard constraint; abandon it (N-Queens columns and diagonals).',
          '**Bound pruning** — the best possible completion of this branch still cannot beat a solution you already have; abandon it (branch and bound).',
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Keep the check O(1)',
        text: 'Prune on state you maintain incrementally. Re-scanning the whole board at every node to ask "is this safe?" can cost more than the branches you save — keep column and diagonal markers instead, flipped on choose and un-choose.',
      },
      {
        kind: 'keyPoints',
        points: [
          'Pruning = reject a candidate before recursing, not after.',
          'One cut near the root deletes an entire exponential subtree.',
          'Feasibility pruning enforces hard constraints; bound pruning drops hopeless branches.',
          'Maintain incremental state so each constraint check stays O(1).',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'n-queens',
        note: 'Prune with column and both-diagonal markers so every safety check is O(1).',
      },
    ],
  },
];

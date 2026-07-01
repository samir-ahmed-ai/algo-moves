/**
 * Reusable pattern cards (#64), keyed by tag id. Each problem surfaces the cards
 * for its tags in the Pattern panel, folding in real-world uses (#69) and an
 * interview communication tip (#70). Add a card here and any problem tagged with
 * its id picks it up automatically.
 */
export interface PatternCard {
  id: string;
  title: string;
  /** The core intuition — the one idea that makes the pattern click. */
  idea: string;
  whenToUse: string;
  complexity: string;
  /** Where this shows up in real systems (#69). */
  realWorld: string;
  /** How to communicate it in an interview (#70). */
  interviewTip: string;
  /** The classic mistake to avoid (#67). */
  pitfall?: string;
  /** Brute force vs this approach (#68). */
  tradeoff?: string;
}

export const PATTERNS: Record<string, PatternCard> = {
  bfs: {
    id: 'bfs',
    title: 'Breadth-first search',
    idea: 'Explore in rings: a FIFO queue visits everything at distance d before distance d+1, so the first time you reach a node is via a shortest (fewest-edges) path.',
    whenToUse: 'Shortest path in an unweighted graph/grid, level-order processing, or any "nearest first" sweep.',
    complexity: 'O(V + E) time, O(V) space for the queue + visited set.',
    realWorld: 'Web crawlers by link-depth, social "degrees of separation", flood fill, GPS on unweighted maps.',
    interviewTip: 'Say "BFS gives shortest paths in unweighted graphs because the queue processes nodes in non-decreasing distance order." Mention the visited set to avoid reprocessing.',
  },
  dfs: {
    id: 'dfs',
    title: 'Depth-first search',
    idea: 'Go as deep as possible, then backtrack. A stack (often the call stack) remembers where to resume.',
    whenToUse: 'Connectivity, cycle detection, topological order, exhausting all paths, tree/grid traversal.',
    complexity: 'O(V + E) time, O(V) space (recursion/stack depth).',
    realWorld: 'Dependency resolution, maze solving, expression-tree evaluation, garbage-collection mark phase.',
    interviewTip: 'State whether you recurse or use an explicit stack, and how you mark visited (colours: white/grey/black) — grey = on the current path = back edge = cycle.',
  },
  '2-coloring': {
    id: '2-coloring',
    title: '2-colouring / bipartite check',
    idea: 'Walk the graph painting each node the opposite colour of its parent; a same-colour edge means it can\'t be split into two independent sets.',
    whenToUse: 'Bipartite testing, conflict-free scheduling, "can these be split into two groups" problems.',
    complexity: 'O(V + E) time, O(V) space.',
    realWorld: 'Matching jobs to machines, detecting scheduling conflicts, register interference checks.',
    interviewTip: 'Note that a graph is bipartite iff it has no odd-length cycle — the colour clash is exactly that odd cycle closing.',
  },
  'binary-search': {
    id: 'binary-search',
    title: 'Binary search',
    idea: 'Halve a sorted search space each step by comparing the middle and discarding the side that cannot contain the answer.',
    whenToUse: 'Sorted arrays, or any monotonic predicate ("binary search on the answer").',
    complexity: 'O(log n) time, O(1) space.',
    realWorld: 'Database B-tree lookups, version bisection (git bisect), rate-limit/threshold tuning.',
    interviewTip: 'Guard the loop invariant: state exactly what [lo, hi] means and whether it is inclusive. Off-by-one bugs live in mid and the lo/hi updates.',
    pitfall: 'Computing mid as (lo+hi)/2 can overflow in fixed-width languages — use lo + (hi-lo)/2. And mismatching lo<=hi vs lo<hi loops infinitely or skips the last element.',
    tradeoff: 'Brute force is a linear O(n) scan. Binary search needs the data sorted first (O(n log n) once), then every query is O(log n).',
  },
  'two-pointers': {
    id: 'two-pointers',
    title: 'Two pointers',
    idea: 'Two indices move toward or with each other so each element is touched O(1) times, collapsing an O(n²) scan to O(n).',
    whenToUse: 'Sorted-array pair/triplet sums, partitioning, in-place dedup, fast/slow cycle detection.',
    complexity: 'O(n) time, O(1) space.',
    realWorld: 'Merge steps, streaming dedup, read/write heads compacting a buffer.',
    interviewTip: 'Justify why moving a pointer never skips a valid answer (the monotonicity argument) — that\'s the crux interviewers probe.',
    pitfall: 'Two pointers needs the array sorted (or some monotonic property). Applying it to unsorted data silently returns wrong answers.',
    tradeoff: 'Brute force checks all O(n²) pairs. Two pointers exploits sortedness to touch each element once → O(n) time, O(1) space.',
  },
  'sliding-window': {
    id: 'sliding-window',
    title: 'Sliding window',
    idea: 'Maintain a contiguous window and a running summary; expand the right edge and shrink the left to keep the window valid, instead of recomputing each subarray.',
    whenToUse: 'Longest/shortest/optimal contiguous subarray or substring under a constraint.',
    complexity: 'O(n) time (each index enters and leaves once), O(k) space.',
    realWorld: 'Rate limiting over a time window, moving averages, network throughput sampling.',
    interviewTip: 'Distinguish fixed-size (slide by one) from variable-size (grow/shrink to maintain validity). State the invariant the window preserves.',
    pitfall: 'Forgetting to shrink from the left when the window becomes invalid — or recomputing the window summary from scratch each step, which silently restores the O(n·k) cost.',
    tradeoff: 'Brute force re-scans every subarray: O(n·k) or O(n²). The window reuses the previous computation, dropping it to O(n).',
  },
  sorting: {
    id: 'sorting',
    title: 'Sorting',
    idea: 'Impose order so later steps can assume it (binary search, two pointers, greedy). Comparison sorts bottom out at O(n log n).',
    whenToUse: 'As a preprocessing step, or when the problem is really "what order".',
    complexity: 'O(n log n) comparison sorts; O(n+k) for counting/radix on bounded keys.',
    realWorld: 'Leaderboards, query planners, deduplication, almost every "top-k" pipeline.',
    interviewTip: 'Mention stability and in-place vs extra-space trade-offs; know that quicksort is in-place avg O(n log n) but O(n²) worst, mergesort is stable O(n log n) with O(n) space.',
  },
  dp: {
    id: 'dp',
    title: 'Dynamic programming',
    idea: 'Break into overlapping subproblems with optimal substructure; solve each once and reuse (memoize / fill a table) instead of re-deriving.',
    whenToUse: 'Counting paths, optimal value over choices, edit/alignment, knapsack-style constraints.',
    complexity: 'Usually O(states × transitions) time and O(states) space (often reducible by rolling rows).',
    realWorld: 'Diff/merge tools, spell-check, sequence alignment in bioinformatics, resource allocation.',
    interviewTip: 'Lead with the recurrence and base cases, then say "bottom-up fills the table in dependency order." Call out the rolling-array space optimization.',
    pitfall: 'Wrong base cases or filling the table in an order where a cell\'s dependencies aren\'t ready yet. Also: applying DP without confirming overlapping subproblems (else it\'s just recursion).',
    tradeoff: 'Naive recursion recomputes subproblems exponentially. DP memoizes each once: exponential → polynomial, trading time for O(states) memory.',
  },
  greedy: {
    id: 'greedy',
    title: 'Greedy',
    idea: 'Make the locally optimal choice at each step and never reconsider — correct only when a local optimum provably extends to a global one.',
    whenToUse: 'Interval scheduling, Huffman coding, MST, "exchange argument" problems.',
    complexity: 'Usually dominated by an initial sort: O(n log n).',
    realWorld: 'CPU/job scheduling, network packet routing, file compression, change-making in real currencies.',
    interviewTip: 'You must justify greed with an exchange argument ("swapping to the greedy choice never makes it worse"). Without that proof, interviewers assume it\'s wrong.',
    pitfall: 'Assuming greedy is correct without proof — many problems look greedy but need DP (e.g. coin change with arbitrary denominations). Sorting by the wrong key is the other classic miss.',
    tradeoff: 'Greedy is one pass after sorting (O(n log n)) vs DP\'s O(n·W) table — far cheaper, but only valid when a local optimum provably extends to global.',
  },
  backtracking: {
    id: 'backtracking',
    title: 'Backtracking',
    idea: 'Build a candidate incrementally; the moment it can\'t lead to a solution, undo the last choice and try the next — pruning whole branches.',
    whenToUse: 'Permutations/combinations/subsets, constraint placement (N-Queens, Sudoku), path enumeration.',
    complexity: 'Exponential in the worst case; pruning is what makes it tractable.',
    realWorld: 'Constraint solvers, regex engines, puzzle solvers, configuration search.',
    interviewTip: 'Describe the choose → explore → un-choose skeleton and your pruning condition. The pruning is the interesting part, not the recursion.',
    pitfall: 'Forgetting to undo the choice on the way back (mutating shared state), or pushing a reference to a mutable partial instead of a copy when recording a solution.',
    tradeoff: 'Generating all candidates is exponential regardless; pruning dead branches early is what makes backtracking beat naive brute-force enumeration in practice.',
  },
  'union-find': {
    id: 'union-find',
    title: 'Union-Find (DSU)',
    idea: 'Track disjoint sets by parent pointers; union merges roots, find follows pointers to a root. Path compression + union by rank make it nearly O(1).',
    whenToUse: 'Connectivity queries, Kruskal\'s MST, grouping/clustering, cycle detection in undirected graphs.',
    complexity: 'Near O(α(n)) per op — effectively constant.',
    realWorld: 'Network connectivity, image segmentation, "are these accounts the same person" merges.',
    interviewTip: 'Mention both optimizations together: path compression flattens trees, union by rank/size keeps them shallow.',
  },
  dijkstra: {
    id: 'dijkstra',
    title: "Dijkstra's shortest path",
    idea: 'Greedily settle the closest unsettled node, then relax its edges. A min-priority-queue always hands you the next-closest node.',
    whenToUse: 'Single-source shortest paths with non-negative weights.',
    complexity: 'O((V + E) log V) with a binary heap.',
    realWorld: 'GPS routing, network latency routing (OSPF), game pathfinding (with A* as a heuristic extension).',
    interviewTip: 'Stress the non-negative-weights requirement (use Bellman-Ford for negatives) and that a node is final once popped from the heap.',
  },
  'topological-sort': {
    id: 'topological-sort',
    title: 'Topological sort',
    idea: 'Order a DAG so every edge points forward. Kahn\'s algorithm repeatedly outputs an in-degree-0 node; leftover nodes reveal a cycle.',
    whenToUse: 'Build/dependency ordering, course prerequisites, task scheduling.',
    complexity: 'O(V + E) time, O(V) space.',
    realWorld: 'Build systems (make/bazel), spreadsheet recalculation, package managers.',
    interviewTip: 'Say a valid order exists iff the graph is a DAG; if fewer than V nodes come out, the remainder form a cycle.',
  },
  'cycle-detection': {
    id: 'cycle-detection',
    title: 'Cycle detection',
    idea: 'In a directed graph, a back edge to a node still on the recursion stack (grey) is a cycle. In a list, fast/slow pointers meet iff there\'s a loop.',
    whenToUse: 'Deadlock detection, schedule validation, linked-list loops.',
    complexity: 'O(V + E) graph; O(n) time / O(1) space for Floyd on a list.',
    realWorld: 'Detecting circular dependencies, deadlocks in lock graphs, corrupted linked structures.',
    interviewTip: 'For lists, Floyd\'s tortoise-and-hare uses O(1) space — contrast it with a hash set of seen nodes (O(n) space).',
  },
};

export function patternsForTags(tags: string[]): PatternCard[] {
  const seen = new Set<string>();
  const out: PatternCard[] = [];
  for (const t of tags) {
    const card = PATTERNS[t];
    if (card && !seen.has(card.id)) {
      seen.add(card.id);
      out.push(card);
    }
  }
  return out;
}

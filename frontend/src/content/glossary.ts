/**
 * Glossary of terms (#65) surfaced in the Glossary panel. `tags` link a term to
 * the patterns/structures it relates to so the panel can highlight the ones
 * relevant to the current problem.
 */
export interface GlossaryTerm {
  term: string;
  def: string;
  tags?: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Invariant',
    def: 'A condition the algorithm keeps true at every step; the proof of correctness usually shows the invariant holds, then what it implies when the loop ends.',
  },
  {
    term: 'Amortized cost',
    def: 'Average cost per operation over a worst-case sequence — e.g. dynamic-array push is O(1) amortized despite occasional O(n) resizes.',
  },
  {
    term: 'In-degree',
    def: 'The number of edges pointing INTO a node in a directed graph. A node with in-degree 0 has no remaining prerequisites.',
    tags: ['topological-sort', 'graph'],
  },
  {
    term: 'Back edge',
    def: 'In a DFS, an edge to an ancestor still on the recursion stack (a grey node). A back edge in a directed graph proves a cycle.',
    tags: ['dfs', 'cycle-detection'],
  },
  {
    term: 'Bipartite',
    def: 'A graph whose nodes split into two sets with every edge crossing between them. Equivalent to "no odd-length cycle".',
    tags: ['2-coloring', 'graph'],
  },
  {
    term: 'Pivot',
    def: 'The element a partition step arranges others around (quicksort) — smaller to the left, larger to the right.',
    tags: ['sorting'],
  },
  {
    term: 'Partition',
    def: 'Rearranging a range so a pivot lands in its final sorted position with smaller/larger elements on each side.',
    tags: ['sorting'],
  },
  {
    term: 'Heap property',
    def: 'Every parent is ≤ (min-heap) or ≥ (max-heap) its children, so the extreme element is always at the root.',
    tags: ['heap', 'priority-queue'],
  },
  {
    term: 'Sift up / sift down',
    def: 'Restoring the heap property after an insert (bubble a value up) or an extract (push the new root down past its smaller child).',
    tags: ['heap'],
  },
  {
    term: 'Memoization',
    def: 'Caching subproblem results so each is computed once — top-down dynamic programming.',
    tags: ['dp'],
  },
  {
    term: 'Optimal substructure',
    def: 'A problem whose optimal solution is built from optimal solutions of its subproblems — the precondition for DP and greedy.',
    tags: ['dp', 'greedy'],
  },
  {
    term: 'Relaxation',
    def: 'Trying to improve a tentative distance via an edge: if dist[u] + w(u,v) < dist[v], update dist[v]. The core of shortest-path algorithms.',
    tags: ['dijkstra', 'shortest-path'],
  },
  {
    term: 'Spanning tree',
    def: 'A subset of edges connecting all nodes with no cycle. A minimum spanning tree minimizes total edge weight.',
    tags: ['mst', 'union-find'],
  },
  {
    term: 'DAG',
    def: 'Directed acyclic graph — a directed graph with no cycles. Exactly the graphs that have a topological ordering.',
    tags: ['topological-sort'],
  },
  {
    term: 'Two pointers',
    def: 'A technique using two indices that move through data in coordination, turning many O(n²) scans into O(n).',
    tags: ['two-pointers'],
  },
  {
    term: 'Sliding window',
    def: 'A contiguous range that expands and contracts over a sequence while maintaining a running summary.',
    tags: ['sliding-window'],
  },
  {
    term: 'Prefix tree (trie)',
    def: 'A tree where each path from the root spells a string; shared prefixes share nodes, making prefix queries fast.',
    tags: ['trie', 'tree'],
  },
  {
    term: 'FIFO / LIFO',
    def: 'Queue order (first-in-first-out) vs stack order (last-in-first-out) — BFS uses a queue, DFS a stack.',
    tags: ['queue', 'stack'],
  },
];

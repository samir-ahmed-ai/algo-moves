import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'category',
    prompt: 'What data structure powers this algorithm?',
    choices: [
      { label: 'A disjoint-set (union-find) tracking which nodes are connected', correct: true },
      { label: 'A min-heap of edges keyed by weight' },
      { label: 'An adjacency matrix scanned every step' },
      { label: 'A hash map from node to its full component list' },
    ],
    explain:
      "Kruskal sorts edges by weight, but the connectivity test — \"are these two endpoints already joined?\" — is answered by a disjoint-set forest, which is what union-find is.",
  },
  {
    id: 'find-returns',
    prompt: 'What does find(x) return?',
    choices: [
      { label: 'The representative root of the set that x belongs to', correct: true },
      { label: 'The direct parent stored in parent[x]' },
      { label: 'The number of nodes in x’s set' },
      { label: 'True if x has been visited' },
    ],
    explain:
      'find follows parent pointers up to the node that is its own parent — the canonical representative. Two nodes are in the same set exactly when their roots are equal.',
  },
  {
    id: 'union-does',
    prompt: 'What does union(a, b) actually do?',
    choices: [
      { label: 'Finds both roots and, if different, points one root at the other', correct: true },
      { label: 'Sets parent[a] = b unconditionally' },
      { label: 'Merges the two adjacency lists' },
      { label: 'Deletes one of the two nodes' },
    ],
    explain:
      'Only the roots are linked, not the original nodes. If the roots are already equal the sets are merged already, so union does nothing.',
  },
  {
    id: 'cycle-detect',
    prompt: 'How does Kruskal detect that an edge (u, v) would create a cycle?',
    choices: [
      { label: 'find(u) == find(v) — both endpoints already share a root before union', correct: true },
      { label: 'The edge weight is larger than every edge in the MST so far' },
      { label: 'The MST already has n edges' },
      { label: 'u and v are adjacent in the original graph' },
    ],
    explain:
      'If two endpoints are already in the same set, a path between them exists, so adding the edge closes a cycle. union returns false (or is skipped) in that case.',
  },
  {
    id: 'optimisations',
    prompt: 'What do path compression and union by rank buy you?',
    choices: [
      { label: 'They keep the trees nearly flat so find stays fast', correct: true },
      { label: 'They sort the edges faster' },
      { label: 'They remove the need to store edge weights' },
      { label: 'They make union O(log E) but find O(1)' },
    ],
    explain:
      'Compression re-points nodes toward the root during find; union by rank attaches the shorter tree under the taller one. Together they bound tree height, keeping operations near-constant.',
  },
  {
    id: 'complexity',
    prompt: 'With both optimisations, what is the amortized cost of find / union?',
    choices: [
      { label: 'O(α(n)) — inverse Ackermann, effectively constant', correct: true },
      { label: 'O(log n) per operation' },
      { label: 'O(n) per operation' },
      { label: 'O(1) in the strict (non-amortized) sense' },
    ],
    explain:
      'Path compression plus union by rank gives an amortized bound of the inverse Ackermann function α(n), which is ≤ 4 for any input you will ever run — so it behaves as constant. Sorting the edges, O(E log E), still dominates Kruskal overall.',
  },
];

/** Ordered decomposition of the Go solution for the Code Studio reassemble drill. */
export const codePieces: CodePiece[] = [
  { id: 'dsu-type', code: 'type DSU struct {\n\tparent []int\n\trank   []int\n}', role: 'disjoint-set state: each node’s parent and a rank (tree-height hint)' },
  { id: 'new-sig', code: 'func newDSU(n int) *DSU {', role: 'constructor — every node starts in its own singleton set' },
  { id: 'new-body', code: '\tp := make([]int, n)\n\tfor i := range p {\n\t\tp[i] = i\n\t}\n\treturn &DSU{parent: p, rank: make([]int, n)}', role: 'parent[i] = i means i is its own root; ranks start at 0' },
  { id: 'find-sig', code: '}\n\nfunc (d *DSU) find(x int) int {', role: 'find: return the representative root of x’s set' },
  { id: 'find-loop', code: '\tfor d.parent[x] != x {\n\t\td.parent[x] = d.parent[d.parent[x]] // path compression\n\t\tx = d.parent[x]\n\t}\n\treturn x', role: 'walk to the root, halving the path so future finds are faster' },
  { id: 'union-sig', code: '}\n\nfunc (d *DSU) union(a, b int) bool {', role: 'union: merge two sets, or report a cycle' },
  { id: 'union-roots', code: '\tra, rb := d.find(a), d.find(b)\n\tif ra == rb {\n\t\treturn false // same set → would form a cycle\n\t}', role: 'equal roots ⇒ already connected ⇒ adding this edge makes a cycle' },
  { id: 'union-rank', code: '\tif d.rank[ra] < d.rank[rb] {\n\t\tra, rb = rb, ra\n\t}\n\td.parent[rb] = ra\n\tif d.rank[ra] == d.rank[rb] {\n\t\td.rank[ra]++\n\t}\n\treturn true', role: 'union by rank: hang the shorter tree under the taller root' },
  { id: 'kruskal-sig', code: '}\n\n// edges: each {u, v, w}\nfunc kruskal(n int, edges [][3]int) (mst [][3]int, total int) {', role: 'Kruskal driver over a disjoint-set' },
  { id: 'kruskal-sort', code: '\tsort.Slice(edges, func(i, j int) bool { return edges[i][2] < edges[j][2] })\n\tdsu := newDSU(n)', role: 'sort edges by weight ascending; start with n disjoint sets' },
  { id: 'kruskal-loop', code: '\tfor _, e := range edges {\n\t\tif len(mst) == n-1 {\n\t\t\tbreak\n\t\t}', role: 'consider edges cheapest-first; stop once the tree has n-1 edges' },
  { id: 'kruskal-take', code: '\t\tif dsu.union(e[0], e[1]) {\n\t\t\tmst = append(mst, e)\n\t\t\ttotal += e[2]\n\t\t}\n\t}\n\treturn mst, total', role: 'union succeeded ⇒ no cycle ⇒ keep the edge and add its weight' },
];

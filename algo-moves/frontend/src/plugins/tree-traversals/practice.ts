import type { QuizQuestion } from '../../core/types';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'orders',
    prompt: 'What distinguishes pre-order, in-order, and post-order traversals?',
    choices: [
      { label: 'Visit timing — node vs subtrees', correct: true },
      { label: 'Skip a subtree — none skip', },
      { label: 'Recursion vs loop — both can iterate', },
      { label: 'Draw direction — unrelated', },
    ],
    explain:
      'All three recurse left then right; they differ only in WHERE the node is emitted: pre = node before subtrees, in = node between them, post = node after both.',
  },
  {
    id: 'inorder-bst',
    prompt: 'Which traversal of a binary SEARCH tree yields the keys in sorted order?',
    choices: [
      { label: 'In-order — left, node, right', correct: true },
      { label: 'Pre-order — node before children', },
      { label: 'Post-order — node after children', },
      { label: 'Level-order — BFS by depth', },
    ],
    explain:
      'In a BST every left descendant is smaller and every right descendant larger, so visiting left, then node, then right emits keys in ascending order.',
  },
  {
    id: 'levelorder',
    prompt: 'How is level-order traversal implemented?',
    choices: [
      { label: 'BFS queue — dequeue, emit, enqueue kids', correct: true },
      { label: 'DFS stack — depth-first order', },
      { label: 'Sort values — loses structure', },
      { label: 'Deepest leaf first not level-order — DFS post-order is not BFS' },
    ],
    explain:
      'Level-order is breadth-first: a FIFO queue holds the current frontier, so nodes come out depth by depth, left to right.',
  },
  {
    id: 'postorder-use',
    prompt: 'Which order is the natural fit for freeing a tree or computing subtree sums?',
    choices: [
      { label: 'Post-order — children done first', correct: true },
      { label: 'Pre-order — parent before children', },
      { label: 'In-order — between children', },
      { label: 'Level-order — by depth layers', },
    ],
    explain:
      'Post-order guarantees both subtrees are done before the node, so child results (sizes, sums, frees) are ready when the parent is handled.',
  },
  {
    id: 'iterative',
    prompt: 'How can a recursive DFS traversal be rewritten iteratively?',
    choices: [
      { label: 'Explicit stack — mimics call stack', correct: true },
      { label: 'Queue — gives BFS instead', },
      { label: 'Impossible — recursion required', },
      { label: 'Sort nodes — wrong approach', },
    ],
    explain:
      'Recursion uses the call stack implicitly; an explicit LIFO stack reproduces the same depth-first order. (A queue instead would give BFS / level-order.)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities of these traversals on n nodes?',
    choices: [
      { label: 'O(n) time — O(h) DFS, O(w) BFS', correct: true },
      { label: 'O(n log n) — O(1) space', },
      { label: 'O(n²) — quadratic work', },
      { label: 'O(log n) — too fast', },
    ],
    explain:
      'Every node is visited once → O(n) time. DFS recursion depth is the tree height h; the BFS queue holds at most one level, the max width w.',
  },
];

/** Ordered decomposition of the Go solution for the Code Studio reassemble drill. */
export const codePieces: CodePiece[] = [
  { id: 'node', code: 'type Node struct{ Val int; Left, Right *Node }', role: 'node type — value plus left/right child pointers' },
  { id: 'inorder-sig', code: 'func inorder(n *Node, out *[]int) {', role: 'in-order DFS: append values to out via pointer' },
  { id: 'inorder-base', code: '\tif n == nil {\n\t\treturn\n\t}', role: 'base case — a nil child ends this branch' },
  { id: 'inorder-left', code: '\tinorder(n.Left, out)', role: 'recurse the LEFT subtree first' },
  { id: 'inorder-node', code: '\t*out = append(*out, n.Val)', role: 'visit the node BETWEEN its subtrees → sorted for a BST' },
  { id: 'inorder-right', code: '\tinorder(n.Right, out)\n}', role: 'then recurse the RIGHT subtree' },
  { id: 'level-sig', code: 'func levelOrder(root *Node) []int {', role: 'level-order BFS entry point' },
  { id: 'level-init', code: '\tout := []int{}\n\tif root == nil {\n\t\treturn out\n\t}', role: 'empty tree → empty output' },
  { id: 'level-queue', code: '\tq := []*Node{root}', role: 'seed the FIFO queue with the root' },
  { id: 'level-loop', code: '\tfor len(q) > 0 {\n\t\tn := q[0]\n\t\tq = q[1:]\n\t\tout = append(out, n.Val)', role: 'dequeue the front node and emit its value' },
  { id: 'level-children', code: '\t\tif n.Left != nil {\n\t\t\tq = append(q, n.Left)\n\t\t}\n\t\tif n.Right != nil {\n\t\t\tq = append(q, n.Right)\n\t\t}\n\t}', role: 'enqueue children left-to-right for the next level' },
  { id: 'level-return', code: '\treturn out\n}', role: 'return the breadth-first visit sequence' },
];

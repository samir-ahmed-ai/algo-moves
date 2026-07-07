import type { WorkedCase } from '../_shared/practice';
import type { TreeInput } from './index';

/** One small balanced BST shown under every traversal order so the visit sequence is easy to contrast. */
const tree: (number | null)[] = [4, 2, 6, 1, 3, 5, 7];

export const goodCases: WorkedCase<TreeInput>[] = [
  {
    id: 'preorder',
    title: 'Pre-order DFS (node → left → right)',
    input: { tree, order: 'preorder' },
    inputLabel: 'tree [4,2,6,1,3,5,7] · order = preorder',
    returns: '4 2 1 3 6 5 7',
    tone: 'ok',
    question: 'Why does the root 4 come out first in pre-order?',
    answer:
      'Pre-order visits the node before either subtree: append the node, then recurse left, then recurse right. So you see 4, then its whole left subtree (2, 1, 3), then its right subtree (6, 5, 7). Pre-order mirrors the structure top-down — handy for copying or serializing a tree.',
  },
  {
    id: 'inorder',
    title: 'In-order DFS (left → node → right)',
    input: { tree, order: 'inorder' },
    inputLabel: 'tree [4,2,6,1,3,5,7] · order = inorder',
    returns: '1 2 3 4 5 6 7',
    tone: 'ok',
    question: 'Why is the output perfectly sorted here?',
    answer:
      'In-order visits the left subtree first, then the node, then the right subtree. On a binary SEARCH tree every left descendant is smaller and every right descendant is larger, so left-node-right emits keys in ascending order — 1 2 3 4 5 6 7.',
  },
  {
    id: 'postorder',
    title: 'Post-order DFS (left → right → node)',
    input: { tree, order: 'postorder' },
    inputLabel: 'tree [4,2,6,1,3,5,7] · order = postorder',
    returns: '1 3 2 5 7 6 4',
    tone: 'ok',
    question: 'Why does the root 4 come out last in post-order?',
    answer:
      'Post-order visits both subtrees before the node: recurse left, recurse right, then append the node. A parent is always emitted after all of its children, so the root 4 is last. This bottom-up order is what you want for deleting a tree or computing subtree sums/heights.',
  },
  {
    id: 'levelorder',
    title: 'Level-order BFS (breadth first)',
    input: { tree, order: 'levelorder' },
    inputLabel: 'tree [4,2,6,1,3,5,7] · order = levelorder',
    returns: '4 2 6 1 3 5 7',
    tone: 'ok',
    question: 'How does level-order differ from the DFS orders?',
    answer:
      'Level-order is BFS: a queue holds the frontier, you dequeue a node, append it, then enqueue its children. Nodes come out depth by depth, left to right — 4 (level 0), then 2 6 (level 1), then 1 3 5 7 (level 2) — rather than diving down one branch at a time.',
  },
];

export const badCases: WorkedCase<TreeInput>[] = [
  {
    id: 'inorder-not-sorted',
    title: 'In-order on a non-BST',
    input: { tree: [4, 2, 6, 1, 5, 3, 7], order: 'inorder' },
    inputLabel: 'tree [4,2,6,1,5,3,7] · order = inorder',
    returns: '1 2 4 5 3 6 7 (not sorted)',
    tone: 'bad',
    question: 'Why is the output not ascending here?',
    answer:
      'In-order is sorted only when the tree is a binary search tree. Node 5 in the left subtree breaks the BST property, so left-node-right no longer emits keys in order.',
  },
];

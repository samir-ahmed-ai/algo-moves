import type { LessonDef } from './types';

export const treesLessons: LessonDef[] = [
  {
    id: 'trees-recursion-subtree',
    title: 'Recursion on trees: a subtree is a smaller tree',
    summary: 'Every tree problem is the same problem, one node smaller.',
    estimatedMinutes: 6,
    tags: ['trees', 'recursion', 'dfs'],
    blocks: [
      {
        kind: 'prose',
        text: 'Trees are the place where recursion finally feels obvious. The reason is structural: a binary tree is either **empty**, or a node holding a value and two children — and each child is _itself_ a tree. The left subtree is a smaller tree. The right subtree is a smaller tree. So a function that answers a question about a tree can answer it by asking the same question about its two subtrees.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The whole shape in one sentence',
      },
      {
        kind: 'prose',
        text: 'Nearly every tree function follows one skeleton: handle the empty tree, recurse into the two children, then combine their answers with the current node.',
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'The base case is the empty tree',
        text: '`root == nil` is not an edge case you bolt on later — it is the bottom of the recursion. Get its return value right (0, nil, true, an empty slice) and the rest of the function usually writes itself.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Three slots to fill',
      },
      {
        kind: 'list',
        ordered: true,
        items: [
          '**Base case** — what is the answer for an empty tree?',
          '**Recurse** — call yourself on `root.Left` and `root.Right`.',
          '**Combine** — fold the two child answers together with `root.Val`.',
        ],
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'type TreeNode struct {\n\tVal   int\n\tLeft  *TreeNode\n\tRight *TreeNode\n}\n\nfunc maxDepth(root *TreeNode) int {\n\tif root == nil {\n\t\treturn 0 // base case: an empty tree has depth 0\n\t}\n\tl := maxDepth(root.Left)  // smaller tree\n\tr := maxDepth(root.Right) // smaller tree\n\tif l > r {\n\t\treturn l + 1\n\t}\n\treturn r + 1 // combine: deeper child + this node\n}',
        caption: 'Max depth: base case 0, combine with max + 1',
      },
      {
        kind: 'callout',
        tone: 'warn',
        title: 'Take the leap of faith',
        text: 'Trust that the recursive call already returns the correct answer for the subtree. Your only job is the combine step. If you find yourself reaching past `root.Left` into `root.Left.Left`, you are fighting the recursion instead of using it.',
      },
      {
        kind: 'keyPoints',
        points: [
          'A tree is empty, or a node whose two children are themselves trees.',
          'Fill three slots: base case, recurse on both children, combine.',
          'The empty-tree return value anchors the whole recursion.',
          'Assume the recursive call is correct on the subtree — only combine.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'tree-traversals',
        note: "Every traversal here is this same skeleton with the 'combine' step moved around.",
      },
    ],
  },
  {
    id: 'trees-four-traversals',
    title: 'The four traversals and when to use each',
    summary: 'Pre, in, and post order are one walk; level order is a different beast.',
    estimatedMinutes: 7,
    tags: ['trees', 'traversal', 'dfs', 'bfs'],
    blocks: [
      {
        kind: 'prose',
        text: 'There are four canonical ways to visit every node of a tree. Three of them — **preorder**, **inorder**, **postorder** — are the _exact same_ depth-first walk. The only thing that changes is the single moment you record the node relative to recursing into its children.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Three DFS orders, one walk',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func inorder(root *TreeNode, out *[]int) {\n\tif root == nil {\n\t\treturn\n\t}\n\t// *out = append(*out, root.Val) // <- here = PREORDER (node, left, right)\n\tinorder(root.Left, out)\n\t*out = append(*out, root.Val) // <- here = INORDER (left, node, right)\n\tinorder(root.Right, out)\n\t// *out = append(*out, root.Val) // <- here = POSTORDER (left, right, node)\n}',
        caption:
          'Move the append line to switch order: before = preorder, between = inorder, after = postorder',
      },
      {
        kind: 'list',
        items: [
          '**Preorder** (node → left → right) — you see a parent _before_ its children. Use it to copy or serialize a tree, or to build one top-down.',
          '**Inorder** (left → node → right) — on a **binary search tree** this emits values in **sorted order**. The go-to for anything BST-shaped.',
          "**Postorder** (left → right → node) — children finish _before_ the parent. Use it for bottom-up answers (height, subtree sums, deleting/freeing a tree) where a node needs its children's results first.",
        ],
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Two reflexes worth memorizing',
        text: "Inorder of a BST is sorted. Postorder is the shape of every bottom-up computation — if a node's answer depends on its subtrees' answers, you are doing postorder whether you name it or not.",
      },
      {
        kind: 'heading',
        level: 2,
        text: 'Level order: go wide, not deep',
      },
      {
        kind: 'prose',
        text: 'The fourth traversal is **breadth-first**: visit all nodes at depth 0, then depth 1, then depth 2. It is not the DFS walk at all — it needs a **queue**, and it processes the tree in rings. Reach for it when the answer is about levels: the shortest path to a leaf, a right-side view, or grouping nodes by depth.',
      },
      {
        kind: 'code',
        lang: 'go',
        code: 'func levelOrder(root *TreeNode) [][]int {\n\tvar res [][]int\n\tif root == nil {\n\t\treturn res\n\t}\n\tq := []*TreeNode{root}\n\tfor len(q) > 0 {\n\t\tvar level []int\n\t\tnext := q\n\t\tq = nil\n\t\tfor _, n := range next {\n\t\t\tlevel = append(level, n.Val)\n\t\t\tif n.Left != nil {\n\t\t\t\tq = append(q, n.Left)\n\t\t\t}\n\t\t\tif n.Right != nil {\n\t\t\t\tq = append(q, n.Right)\n\t\t\t}\n\t\t}\n\t\tres = append(res, level)\n\t}\n\treturn res\n}',
        caption: 'Level order, grouped one slice per level',
      },
      {
        kind: 'callout',
        tone: 'note',
        title: 'Rule of thumb',
        text: 'Sorted output from a BST → inorder. Bottom-up (height, sums, delete) → postorder. Copy/serialize top-down → preorder. Anything about depth or shortest path → level order (BFS queue).',
      },
      {
        kind: 'keyPoints',
        points: [
          'Pre/in/post order are one DFS walk — only the visit moment moves.',
          'Inorder of a BST yields sorted values.',
          'Postorder = children before parent = every bottom-up computation.',
          'Level order is BFS with a queue: use it for depth and shortest-path questions.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'tree-traversals',
        note: 'Implement all four here — notice how little code separates the three DFS orders.',
      },
    ],
  },
  {
    id: 'trees-trie-tree-of-characters',
    title: 'A trie is a tree of characters',
    summary: 'Store words by their letters along the path, and prefix search becomes a walk.',
    estimatedMinutes: 7,
    tags: ['trees', 'trie', 'strings'],
    blocks: [
      {
        kind: 'prose',
        text: 'A **trie** (prefix tree) is not a new data structure so much as a tree with a clever labeling: each edge is a character, and the path from the root down to a node _spells a prefix_. Words that share a prefix share a path. That single idea is what makes a trie fast at questions like "do any stored words start with `app`?"',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'The node is itself a tree',
      },
      {
        kind: 'code',
        lang: 'go',
        code: "type Trie struct {\n\tchildren [26]*Trie // children['a'-'a'] ... children['z'-'a']\n\tisWord   bool      // true if a word ends exactly here\n}\n\nfunc Constructor() Trie {\n\treturn Trie{}\n}",
        caption: 'One child slot per lowercase letter, plus an end-of-word flag',
      },
      {
        kind: 'prose',
        text: 'Look at the type: every entry in `children` is another `*Trie`. So a child is a smaller trie — the same _a subtree is a smaller tree_ idea from recursion, now with 26 possible children instead of 2. To descend one character is to move from a tree to one of its subtrees.',
      },
      {
        kind: 'heading',
        level: 2,
        text: 'One walk: insert, search, and prefix',
      },
      {
        kind: 'code',
        lang: 'go',
        code: "func (t *Trie) Insert(word string) {\n\tnode := t\n\tfor i := 0; i < len(word); i++ {\n\t\tc := word[i] - 'a'\n\t\tif node.children[c] == nil {\n\t\t\tnode.children[c] = &Trie{}\n\t\t}\n\t\tnode = node.children[c]\n\t}\n\tnode.isWord = true\n}\n\n// walk follows s and returns the node it lands on, or nil if the path breaks.\nfunc (t *Trie) walk(s string) *Trie {\n\tnode := t\n\tfor i := 0; i < len(s); i++ {\n\t\tc := s[i] - 'a'\n\t\tif node.children[c] == nil {\n\t\t\treturn nil\n\t\t}\n\t\tnode = node.children[c]\n\t}\n\treturn node\n}\n\nfunc (t *Trie) Search(word string) bool {\n\tnode := t.walk(word)\n\treturn node != nil && node.isWord\n}\n\nfunc (t *Trie) StartsWith(prefix string) bool {\n\treturn t.walk(prefix) != nil\n}",
        caption: 'Insert creates missing nodes; walk just follows them',
      },
      {
        kind: 'list',
        items: [
          '**Search** and **StartsWith** run the _identical_ walk down the tree.',
          'The only difference: search also checks `isWord` — did a word end exactly here, or did we just pass through?',
          'Insert is the same walk, except it creates a child whenever the path is missing.',
        ],
      },
      {
        kind: 'callout',
        tone: 'remember',
        title: 'Why bother versus a hash set',
        text: 'A hash set answers "is this exact word stored?" in O(len). A trie answers that _and_ "does any word start with this prefix?" in O(len) — independent of how many words you stored. Prefix queries are the whole reason a trie exists.',
      },
      {
        kind: 'keyPoints',
        points: [
          'A trie is a tree whose edges are characters; a root-to-node path spells a prefix.',
          'Each child is itself a smaller trie — the recursion mindset transfers directly.',
          'Insert, search, and prefix-check are the same downward walk.',
          '`isWord` is what separates a real word from a prefix passed through en route.',
        ],
      },
      {
        kind: 'problemRef',
        itemId: 'trie',
        note: 'Build insert / search / startsWith here — they are three views of one walk.',
      },
    ],
  },
];

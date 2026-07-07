import type { DesignDiagramSpec } from './types';

export const designDiagrams: Record<string, DesignDiagramSpec> = {
  /* ─────────────────────────────────────────────────────────────
   * Amount of New Area Painted Each Day
   * ───────────────────────────────────────────────────────────── */
  'prep-design-amount-of-new-area-painted-each-day': {
    title: 'Amount of New Area Painted Each Day',
    pages: [
      {
        tab: 'Structure',
        caption: 'A jump array lets us skip already-painted cells; answer[] collects daily totals.',
        nodes: [
          { id: 'paint', col: 0, row: 0, kind: 'io', label: 'Day paint [start,end)' },
          {
            id: 'next',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'next[x]',
            lines: ['next free cell ≥ x'],
          },
          {
            id: 'ans',
            col: 2,
            row: 0,
            kind: 'store',
            label: 'answer[day]',
            lines: ['new cells painted'],
          },
        ],
        edges: [
          { from: 'paint', to: 'next', label: 'walk & compress' },
          { from: 'next', to: 'ans', label: 'count new' },
        ],
      },
      {
        tab: 'Operations',
        caption: 'Walk from start to end via jumps; on each new cell increment count and compress.',
        nodes: [
          { id: 'in', col: 0, row: 0, kind: 'io', label: '[start, end)' },
          { id: 'walk', col: 1, row: 0, kind: 'op', label: 'x = start', lines: ['while x < end'] },
          {
            id: 'hit',
            col: 2,
            row: 0,
            kind: 'note',
            label: 'x already painted?',
            lines: ['next[x] > x'],
          },
          {
            id: 'jump',
            col: 2,
            row: 1,
            kind: 'op',
            label: 'x = next[x]',
            lines: ['skip filled block'],
          },
          { id: 'new', col: 1, row: 1, kind: 'op', label: 'count++', lines: ['next[x] = x+1'] },
        ],
        edges: [
          { from: 'in', to: 'walk' },
          { from: 'walk', to: 'hit' },
          { from: 'hit', to: 'jump', label: 'yes' },
          { from: 'hit', to: 'new', label: 'no' },
          { from: 'jump', to: 'walk', dashed: true },
          { from: 'new', to: 'walk', dashed: true },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Path compression makes the amortized cost per cell nearly constant.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Time',
            lines: ['O(n · α(range))', 'amortized per day'],
          },
          {
            id: 's',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'Space',
            lines: ['O(range)', 'next[] array'],
          },
          {
            id: 'c',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: 'Key insight',
            lines: ['union-find compression', 'avoids re-visiting cells'],
          },
        ],
        edges: [],
        legend: ['α ≈ inverse Ackermann — effectively O(1)'],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Design In-Memory File System
   * ───────────────────────────────────────────────────────────── */
  'prep-design-design-in-memory-file-system': {
    title: 'In-Memory File System',
    pages: [
      {
        tab: 'Structure',
        caption: 'A trie of FsNodes maps each path segment to a child node.',
        nodes: [
          {
            id: 'root',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'root /',
            lines: ['children: map[string]FsNode'],
          },
          {
            id: 'dir',
            col: 0,
            row: 1,
            kind: 'store',
            label: 'dir node',
            lines: ['isFile=false', 'children: map'],
          },
          {
            id: 'file',
            col: 1,
            row: 1,
            kind: 'store',
            label: 'file node',
            lines: ['isFile=true', 'content: string'],
          },
        ],
        edges: [
          { from: 'root', to: 'dir', label: "children['a']" },
          { from: 'root', to: 'file', label: "children['b.txt']" },
        ],
      },
      {
        tab: 'Operations',
        caption: 'ensureDir creates missing nodes on write; find walks read-only.',
        nodes: [
          { id: 'mk', col: 0, row: 0, kind: 'op', label: 'mkdir(path)' },
          { id: 'add', col: 1, row: 0, kind: 'op', label: 'addContent(path, c)' },
          { id: 'ls', col: 0, row: 1, kind: 'op', label: 'ls(path)' },
          { id: 'rd', col: 1, row: 1, kind: 'op', label: 'readContent(path)' },
          {
            id: 'ed',
            col: 0,
            row: 2,
            kind: 'store',
            label: 'ensureDir()',
            lines: ['create missing nodes'],
          },
          {
            id: 'fn',
            col: 1,
            row: 2,
            kind: 'store',
            label: 'find()',
            lines: ['walk, return null if miss'],
          },
        ],
        edges: [
          { from: 'mk', to: 'ed' },
          { from: 'add', to: 'ed' },
          { from: 'ls', to: 'fn' },
          { from: 'rd', to: 'fn' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'All ops are linear in the path depth, not total number of files.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'mkdir / addContent',
            lines: ['O(depth)'],
          },
          {
            id: 'r',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'ls / readContent',
            lines: ['O(depth + k)', 'k = children count'],
          },
          {
            id: 's',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: 'Space',
            lines: ['O(total chars in all paths)'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Design Parking System
   * ───────────────────────────────────────────────────────────── */
  'prep-design-design-parking-system': {
    title: 'Parking System',
    pages: [
      {
        tab: 'Structure',
        caption: 'One counter per car size holds remaining spaces.',
        nodes: [
          {
            id: 'slots',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'slots[3]',
            lines: ['big, medium, small', 'remaining counts'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'addCar checks and decrements the right counter.',
        nodes: [
          { id: 'in', col: 0, row: 0, kind: 'io', label: 'addCar(carType)' },
          {
            id: 'chk',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'slots[type] > 0?',
            lines: ['check available'],
          },
          {
            id: 'dec',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'slots[type]--',
            lines: ['park the car'],
          },
          { id: 'ret', col: 0, row: 1, kind: 'note', label: 'return bool' },
        ],
        edges: [
          { from: 'in', to: 'chk' },
          { from: 'chk', to: 'dec', label: 'yes' },
          { from: 'chk', to: 'ret', label: 'no → false' },
          { from: 'dec', to: 'ret', label: 'true' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Constant time and space — just three integers.',
        nodes: [
          { id: 't', col: 0, row: 0, kind: 'note', label: 'Time', lines: ['O(1)'] },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(1) — 3 ints'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Design Tic-Tac-Toe
   * ───────────────────────────────────────────────────────────── */
  'prep-design-design-tic-tac-toe': {
    title: 'Tic-Tac-Toe',
    pages: [
      {
        tab: 'Structure',
        caption: 'Signed sums for each line — no need to store the whole board.',
        nodes: [
          { id: 'rows', col: 0, row: 0, kind: 'store', label: 'rows[n]', lines: ['sum per row'] },
          { id: 'cols', col: 1, row: 0, kind: 'store', label: 'cols[n]', lines: ['sum per col'] },
          { id: 'diag', col: 0, row: 1, kind: 'store', label: 'diag', lines: ['main diagonal'] },
          {
            id: 'anti',
            col: 1,
            row: 1,
            kind: 'store',
            label: 'antiDiag',
            lines: ['anti-diagonal'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'Player 1 adds +1, player 2 adds -1; |sum|=n means that player won.',
        nodes: [
          {
            id: 'mv',
            col: 0,
            row: 0,
            kind: 'op',
            label: 'move(r,c,player)',
            lines: ['delta = +1 or -1'],
          },
          { id: 'upd', col: 1, row: 0, kind: 'op', label: 'update 4 sums' },
          {
            id: 'chk',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: '|sum| == n?',
            lines: ['that player wins'],
          },
        ],
        edges: [
          { from: 'mv', to: 'upd' },
          { from: 'upd', to: 'chk' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Each move is O(1) regardless of board size.',
        nodes: [
          { id: 't', col: 0, row: 0, kind: 'note', label: 'Time', lines: ['O(1) per move'] },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(n) — 2n+2 sums'] },
          {
            id: 'c',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: 'vs naive',
            lines: ['O(n²) board → O(n) sums', 'same win-check cost'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Detect Squares
   * ───────────────────────────────────────────────────────────── */
  'prep-design-detect-squares': {
    title: 'Detect Squares',
    pages: [
      {
        tab: 'Structure',
        caption: 'A frequency map + a deduplicated point list power both operations.',
        nodes: [
          { id: 'cnt', col: 0, row: 0, kind: 'store', label: 'cnt: (x,y)→freq' },
          {
            id: 'pts',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'points list',
            lines: ['all added points'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'For count, pick a diagonal point then verify the two perpendicular corners.',
        nodes: [
          { id: 'add', col: 0, row: 0, kind: 'op', label: 'add(point)' },
          { id: 'cnt2', col: 1, row: 0, kind: 'op', label: 'count(point)' },
          {
            id: 'upd',
            col: 0,
            row: 1,
            kind: 'op',
            label: 'cnt[p]++',
            lines: ['push to list if new'],
          },
          {
            id: 'loop',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'for diagonal p2',
            lines: ['same x or y'],
          },
          { id: 'mul', col: 1, row: 2, kind: 'note', label: 'cnt[p2]·cnt[c1]·cnt[c2]' },
        ],
        edges: [
          { from: 'add', to: 'upd' },
          { from: 'cnt2', to: 'loop' },
          { from: 'loop', to: 'mul' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'count() is O(n) per call where n is the number of distinct points added.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'add', lines: ['O(1)'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'count', lines: ['O(n) — iterate pts'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(n) map + list'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Dictionary and Spell
   * ───────────────────────────────────────────────────────────── */
  'prep-design-dictionary-and-spell': {
    title: 'Dictionary + Spell Suggest',
    pages: [
      {
        tab: 'Structure',
        caption:
          'A trie stores every inserted word; each TrieNode marks whether a word ends there.',
        nodes: [
          {
            id: 'root',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'Trie root',
            lines: ['children[26], isEnd'],
          },
          { id: 'n1', col: 0, row: 1, kind: 'store', label: 'node "a"' },
          { id: 'n2', col: 1, row: 1, kind: 'store', label: 'node "b"' },
          { id: 'n3', col: 0, row: 2, kind: 'store', label: 'node "ap"', lines: ['isEnd=true'] },
        ],
        edges: [
          { from: 'root', to: 'n1', label: "'a'" },
          { from: 'root', to: 'n2', label: "'b'" },
          { from: 'n1', to: 'n3', label: "'p'" },
        ],
      },
      {
        tab: 'Operations',
        caption: 'Walk the prefix to anchor; then DFS to collect all words below.',
        nodes: [
          { id: 'ins', col: 0, row: 0, kind: 'op', label: 'insert(word)' },
          { id: 'srch', col: 1, row: 0, kind: 'op', label: 'search(word)', lines: ['exact match'] },
          { id: 'sug', col: 2, row: 0, kind: 'op', label: 'suggest(prefix)' },
          { id: 'walk', col: 0.5, row: 1, kind: 'op', label: 'walk chars' },
          { id: 'dfs', col: 2, row: 1, kind: 'op', label: 'DFS from node' },
          { id: 'res', col: 2, row: 2, kind: 'store', label: 'results list' },
        ],
        edges: [
          { from: 'ins', to: 'walk' },
          { from: 'srch', to: 'walk' },
          { from: 'sug', to: 'walk' },
          { from: 'walk', to: 'dfs', label: 'prefix node' },
          { from: 'dfs', to: 'res' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Insert and exact search are O(L); suggest is O(L + S) where S = size of output.',
        nodes: [
          {
            id: 't1',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'insert / search',
            lines: ['O(L) — word length'],
          },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'suggest', lines: ['O(L + S)'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(total chars)'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Dot Product of Two Sparse Vectors
   * ───────────────────────────────────────────────────────────── */
  'prep-design-dot-product-of-two-sparse-vectors': {
    title: 'Dot Product of Sparse Vectors',
    pages: [
      {
        tab: 'Structure',
        caption: 'Store only non-zero (index, value) pairs instead of the full dense array.',
        nodes: [
          {
            id: 'va',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'A: [(idx,val)]',
            lines: ['sorted by idx'],
          },
          {
            id: 'vb',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'B: [(idx,val)]',
            lines: ['sorted by idx'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'Two pointers advance past mismatched indices, multiply only when they match.',
        nodes: [
          { id: 'tp', col: 0.5, row: 0, kind: 'op', label: 'i=0, j=0' },
          { id: 'cmp', col: 0.5, row: 1, kind: 'op', label: 'A[i].idx vs B[j].idx' },
          {
            id: 'mul',
            col: 1,
            row: 2,
            kind: 'op',
            label: 'sum += A.val·B.val',
            lines: ['i++ and j++'],
          },
          { id: 'ski', col: 0, row: 2, kind: 'op', label: 'advance smaller idx' },
        ],
        edges: [
          { from: 'tp', to: 'cmp' },
          { from: 'cmp', to: 'mul', label: 'equal' },
          { from: 'cmp', to: 'ski', label: 'differ' },
          { from: 'mul', to: 'cmp', dashed: true },
          { from: 'ski', to: 'cmp', dashed: true },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Dot product runs in O(L+R) where L, R are non-zero counts — much less than N.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Time',
            lines: ['O(L+R) two-pointer', 'or O(L·log R) with map+bsearch'],
          },
          {
            id: 's',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'Space',
            lines: ['O(L+R)', 'vs O(N) dense'],
          },
        ],
        edges: [],
        legend: ['Best when L, R << N'],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Exclusive Time of Functions
   * ───────────────────────────────────────────────────────────── */
  'prep-design-exclusive-time-of-functions': {
    title: 'Exclusive Time of Functions',
    pages: [
      {
        tab: 'Structure',
        caption:
          'A call stack tracks the running function; result array accumulates exclusive time.',
        nodes: [
          { id: 'log', col: 0, row: 0, kind: 'io', label: "logs: 'id:start|end:ts'" },
          {
            id: 'stack',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'stack',
            lines: ['top = active fn'],
          },
          {
            id: 'res',
            col: 2,
            row: 0,
            kind: 'store',
            label: 'res[n]',
            lines: ['exclusive time/fn'],
          },
          {
            id: 'prev',
            col: 1,
            row: 1,
            kind: 'store',
            label: 'prevTime',
            lines: ['timestamp of last event'],
          },
        ],
        edges: [
          { from: 'log', to: 'stack', label: 'push/pop' },
          { from: 'stack', to: 'res', label: 'Δt' },
          { from: 'stack', to: 'prev', bidir: true },
        ],
      },
      {
        tab: 'Operations',
        caption: 'On start: charge Δt to the caller, push. On end: charge Δt+1 to self, pop.',
        nodes: [
          { id: 'ev', col: 0, row: 0, kind: 'io', label: 'next log event' },
          { id: 'typ', col: 1, row: 0, kind: 'op', label: 'start or end?' },
          {
            id: 'st',
            col: 0,
            row: 1,
            kind: 'op',
            label: 'start',
            lines: ['res[top] += ts-prev', 'push id'],
          },
          {
            id: 'en',
            col: 2,
            row: 1,
            kind: 'op',
            label: 'end',
            lines: ['res[top] += ts-prev+1', 'pop; prev=ts+1'],
          },
        ],
        edges: [
          { from: 'ev', to: 'typ' },
          { from: 'typ', to: 'st', label: 'start' },
          { from: 'typ', to: 'en', label: 'end' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Each log line is processed once — linear in the log size.',
        nodes: [
          { id: 't', col: 0, row: 0, kind: 'note', label: 'Time', lines: ['O(n log lines)'] },
          {
            id: 's',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'Space',
            lines: ['O(n fns + depth)', 'stack depth = call depth'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Expression Tree
   * ───────────────────────────────────────────────────────────── */
  'prep-design-design-an-expression-tree-with-evaluate-function': {
    title: 'Expression Tree',
    pages: [
      {
        tab: 'Structure',
        caption: 'Each node is either a leaf number or an operator node with two children.',
        nodes: [
          {
            id: 'op',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'op node "+"',
            lines: ['left, right children'],
          },
          { id: 'l', col: 0, row: 1, kind: 'store', label: 'leaf "3"', lines: ['no children'] },
          { id: 'r', col: 1, row: 1, kind: 'store', label: 'leaf "4"', lines: ['no children'] },
        ],
        edges: [
          { from: 'op', to: 'l', label: 'left' },
          { from: 'op', to: 'r', label: 'right' },
        ],
      },
      {
        tab: 'Operations',
        caption: 'Build with a postfix stack; evaluate recursively post-order.',
        nodes: [
          { id: 'tok', col: 0, row: 0, kind: 'io', label: 'postfix tokens' },
          { id: 'stk', col: 1, row: 0, kind: 'store', label: 'node stack' },
          {
            id: 'bld',
            col: 0,
            row: 1,
            kind: 'op',
            label: 'build()',
            lines: ['num→push', 'op→pop 2, link'],
          },
          {
            id: 'ev',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'evaluate()',
            lines: ['leaf→return val', 'op→l.eval ⊕ r.eval'],
          },
        ],
        edges: [
          { from: 'tok', to: 'bld' },
          { from: 'bld', to: 'stk', bidir: true },
          { from: 'stk', to: 'ev', label: 'root node' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Both build and evaluate are linear in the number of tokens.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Time',
            lines: ['O(n) build + O(n) eval'],
          },
          {
            id: 's',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'Space',
            lines: ['O(n) tree + O(depth) stack'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Find Median from Data Stream
   * ───────────────────────────────────────────────────────────── */
  'prep-design-find-median-from-data-stream': {
    title: 'Median from Data Stream',
    pages: [
      {
        tab: 'Structure',
        caption: 'Lo max-heap holds the lower half; hi min-heap holds the upper half.',
        nodes: [
          {
            id: 'lo',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'lo: max-heap',
            lines: ['lower half', 'top = largest small'],
          },
          {
            id: 'hi',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'hi: min-heap',
            lines: ['upper half', 'top = smallest large'],
          },
        ],
        edges: [{ from: 'lo', to: 'hi', label: '|lo|-|hi| ≤ 1', bidir: true }],
        legend: ['Invariant: all lo ≤ all hi'],
      },
      {
        tab: 'Operations',
        caption: 'After adding, rebalance so sizes differ by at most 1.',
        nodes: [
          { id: 'add', col: 0, row: 0, kind: 'op', label: 'addNum(x)' },
          { id: 'plo', col: 0, row: 1, kind: 'op', label: 'push lo', lines: ['lo.push(x)'] },
          {
            id: 'bal',
            col: 0,
            row: 2,
            kind: 'op',
            label: 'rebalance',
            lines: ['move tops if |Δ|>1'],
          },
          { id: 'med', col: 1, row: 0, kind: 'op', label: 'findMedian()' },
          {
            id: 'top',
            col: 1,
            row: 1,
            kind: 'note',
            label: 'even→avg tops',
            lines: ['odd→larger heap top'],
          },
        ],
        edges: [
          { from: 'add', to: 'plo' },
          { from: 'plo', to: 'bal' },
          { from: 'med', to: 'top' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Adding costs O(log n); median is O(1) after heaps are balanced.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'addNum', lines: ['O(log n)'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'findMedian', lines: ['O(1)'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(n)'] },
        ],
        edges: [],
        legend: ['add O(log n) · median O(1)'],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Find Servers That Handled Most Requests
   * ───────────────────────────────────────────────────────────── */
  'prep-design-find-servers-that-handled-most-number-of-requests': {
    title: 'Servers Handling Most Requests',
    pages: [
      {
        tab: 'Structure',
        caption: 'A sorted free-set picks the next server; a min-heap frees busy ones by end time.',
        nodes: [
          {
            id: 'free',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'free: sorted set',
            lines: ['server ids available'],
          },
          {
            id: 'busy',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'busy: min-heap',
            lines: ['(endTime, serverId)'],
          },
          {
            id: 'load',
            col: 2,
            row: 0,
            kind: 'store',
            label: 'load[n]',
            lines: ['requests handled'],
          },
        ],
        edges: [{ from: 'busy', to: 'free', label: 'release on end' }],
      },
      {
        tab: 'Operations',
        caption: 'Release expired servers, then assign the k-th available one (wrap around).',
        nodes: [
          { id: 'req', col: 0, row: 0, kind: 'io', label: 'request(i, arrival, load)' },
          {
            id: 'rel',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'release expired',
            lines: ['pop busy where end≤arrival'],
          },
          {
            id: 'pick',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'pick server',
            lines: ['first free ≥ i%n', 'or wrap to smallest'],
          },
          {
            id: 'push',
            col: 1,
            row: 2,
            kind: 'op',
            label: 'push to busy',
            lines: ['(arrival+load, id)'],
          },
        ],
        edges: [
          { from: 'req', to: 'rel' },
          { from: 'rel', to: 'pick' },
          { from: 'pick', to: 'push' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Each request touches at most O(log n) heap/set operations.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Per request',
            lines: ['O(log n) — heap + sorted set'],
          },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(n) — n servers'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Guess the Word
   * ───────────────────────────────────────────────────────────── */
  'prep-design-guess-the-word': {
    title: 'Guess the Word',
    pages: [
      {
        tab: 'Structure',
        caption: 'The candidate list shrinks each round based on match feedback.',
        nodes: [
          {
            id: 'cand',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'candidates list',
            lines: ['all plausible words'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'Guess a word, get match count, keep only words that share the same count.',
        nodes: [
          { id: 'pick', col: 0, row: 0, kind: 'op', label: 'pick(candidates)' },
          { id: 'guess', col: 1, row: 0, kind: 'op', label: 'guess(word)' },
          {
            id: 'master',
            col: 2,
            row: 0,
            kind: 'io',
            label: 'Master API',
            lines: ['returns match count'],
          },
          {
            id: 'filter',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'filter candidates',
            lines: ['keep same match count'],
          },
        ],
        edges: [
          { from: 'pick', to: 'guess' },
          { from: 'guess', to: 'master' },
          { from: 'master', to: 'filter', label: 'score' },
          { from: 'filter', to: 'pick', dashed: true, label: 'repeat' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Minimax strategy finds the secret in at most O(log n) guesses on average.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Guesses',
            lines: ['O(log n) avg (minimax)', 'O(n) worst naive'],
          },
          {
            id: 's',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'Filter cost',
            lines: ['O(n·L) per round', 'L = word length'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Insert Delete GetRandom O(1)
   * ───────────────────────────────────────────────────────────── */
  'prep-design-insert-delete-getrandom-o1': {
    title: 'Insert Delete GetRandom O(1)',
    pages: [
      {
        tab: 'Structure',
        caption: 'An array gives O(1) random access; a hash map gives O(1) index lookup.',
        nodes: [
          {
            id: 'vals',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'vals: []int',
            lines: ['dense — random index'],
          },
          {
            id: 'idx',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'idx: val→index',
            lines: ['O(1) locate'],
          },
        ],
        edges: [{ from: 'vals', to: 'idx', bidir: true }],
      },
      {
        tab: 'Operations',
        caption: 'Remove swaps the target with the last element then pops — keeps array dense.',
        nodes: [
          {
            id: 'ins',
            col: 0,
            row: 0,
            kind: 'op',
            label: 'insert(val)',
            lines: ['append; idx[val]=len-1'],
          },
          {
            id: 'rem',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'remove(val)',
            lines: ['swap with last, pop'],
          },
          {
            id: 'get',
            col: 2,
            row: 0,
            kind: 'op',
            label: 'getRandom()',
            lines: ['rand(0, len-1)'],
          },
          {
            id: 'fix',
            col: 1,
            row: 1,
            kind: 'note',
            label: 'fix swapped idx',
            lines: ['idx[last]=removed pos'],
          },
        ],
        edges: [{ from: 'rem', to: 'fix' }],
      },
      {
        tab: 'Complexity',
        caption: 'All three operations run in O(1) expected time.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'insert', lines: ['O(1) amortized'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'remove', lines: ['O(1)'] },
          { id: 't3', col: 2, row: 0, kind: 'note', label: 'getRandom', lines: ['O(1)'] },
          { id: 's', col: 1, row: 1, kind: 'note', label: 'Space', lines: ['O(n)'] },
        ],
        edges: [],
        legend: ['Key: swap-with-last preserves density'],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Load Balancer
   * ───────────────────────────────────────────────────────────── */
  'prep-design-load-balancer': {
    title: 'Round-Robin Load Balancer',
    pages: [
      {
        tab: 'Structure',
        caption: 'A ring of server addresses plus an integer cursor.',
        nodes: [
          {
            id: 'ring',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'servers[n]',
            lines: ['s0, s1, s2, …'],
          },
          {
            id: 'ptr',
            col: 0.5,
            row: 1,
            kind: 'store',
            label: 'ptr int',
            lines: ['current index'],
          },
        ],
        edges: [{ from: 'ring', to: 'ptr', dashed: true }],
      },
      {
        tab: 'Operations',
        caption: 'Each pick advances the cursor modulo n, wrapping back to 0.',
        nodes: [
          { id: 'req', col: 0, row: 0, kind: 'io', label: 'incoming request' },
          {
            id: 'pick',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'next()',
            lines: ['srv = servers[ptr]', 'ptr = (ptr+1) % n'],
          },
          { id: 'srv', col: 2, row: 0, kind: 'io', label: 'server sₖ' },
        ],
        edges: [
          { from: 'req', to: 'pick' },
          { from: 'pick', to: 'srv', label: 'route' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'O(1) per request; no state beyond the counter.',
        nodes: [
          { id: 't', col: 0, row: 0, kind: 'note', label: 'Time', lines: ['O(1) per pick'] },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(n) servers list'] },
          {
            id: 'v',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: 'Variant: weighted RR',
            lines: ['repeat server n_i times', 'or virtual ring'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Log Analyzer
   * ───────────────────────────────────────────────────────────── */
  'prep-design-log-analyzer': {
    title: 'Log Analyzer',
    pages: [
      {
        tab: 'Structure',
        caption: 'Raw lines → parsed fields → per-key aggregate maps.',
        nodes: [
          { id: 'raw', col: 0, row: 0, kind: 'io', label: 'raw log lines' },
          {
            id: 'agg',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'agg map',
            lines: ['key → stats bucket'],
          },
          { id: 'idx', col: 2, row: 0, kind: 'store', label: 'time index', lines: ['ts → events'] },
        ],
        edges: [
          { from: 'raw', to: 'agg', label: 'parse + accumulate' },
          { from: 'raw', to: 'idx' },
        ],
      },
      {
        tab: 'Operations',
        caption: 'Ingest parses each line; query scans the aggregate map with optional filters.',
        nodes: [
          { id: 'in', col: 0, row: 0, kind: 'op', label: 'ingest(line)' },
          {
            id: 'parse',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'parse fields',
            lines: ['ts, level, msg, …'],
          },
          { id: 'store', col: 2, row: 0, kind: 'op', label: 'store in agg' },
          { id: 'qry', col: 0, row: 1, kind: 'op', label: 'query(range, filter)' },
          {
            id: 'scan',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'scan + filter',
            lines: ['apply predicate'],
          },
          { id: 'res', col: 2, row: 1, kind: 'io', label: 'result rows' },
        ],
        edges: [
          { from: 'in', to: 'parse' },
          { from: 'parse', to: 'store' },
          { from: 'qry', to: 'scan' },
          { from: 'scan', to: 'res' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Ingest is O(1) amortized; query is O(n) in the worst case.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'ingest', lines: ['O(1) per line'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'query', lines: ['O(n) scan'] },
          {
            id: 's',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: 'Space',
            lines: ['O(n total log events)'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Logger Rate Limiter
   * ───────────────────────────────────────────────────────────── */
  'prep-design-logger-rate-limiter': {
    title: 'Logger Rate Limiter',
    pages: [
      {
        tab: 'Structure',
        caption: 'A map tracks the next timestamp at which each message may print.',
        nodes: [
          {
            id: 'map',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'next: msg → ts',
            lines: ['earliest allowed print'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'Print only when current time has reached the stored threshold; then advance it.',
        nodes: [
          { id: 'in', col: 0, row: 0, kind: 'io', label: 'shouldPrint(ts, msg)' },
          { id: 'chk', col: 1, row: 0, kind: 'op', label: 'ts ≥ next[msg]?' },
          { id: 'upd', col: 1, row: 1, kind: 'op', label: 'next[msg] = ts+10' },
          { id: 'yes', col: 2, row: 0, kind: 'note', label: '→ true (print)' },
          { id: 'no', col: 0, row: 1, kind: 'note', label: '→ false (suppress)' },
        ],
        edges: [
          { from: 'in', to: 'chk' },
          { from: 'chk', to: 'yes', label: 'yes' },
          { from: 'chk', to: 'no', label: 'no' },
          { from: 'yes', to: 'upd' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'O(1) per call; map grows to the number of distinct messages seen.',
        nodes: [
          { id: 't', col: 0, row: 0, kind: 'note', label: 'Time', lines: ['O(1)'] },
          {
            id: 's',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'Space',
            lines: ['O(distinct messages)'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * LRU Cache
   * ───────────────────────────────────────────────────────────── */
  'prep-design-lru-cache': {
    title: 'LRU Cache',
    pages: [
      {
        tab: 'Structure',
        caption: 'A hash map locates nodes in O(1); a doubly linked list orders by recency.',
        nodes: [
          {
            id: 'map',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'map: key→node',
            lines: ['O(1) lookup'],
          },
          {
            id: 'head',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'head (MRU)',
            lines: ['most recently used'],
          },
          {
            id: 'tail',
            col: 2,
            row: 0,
            kind: 'store',
            label: 'tail (LRU)',
            lines: ['eviction target'],
          },
          {
            id: 'node',
            col: 1,
            row: 1,
            kind: 'store',
            label: 'DLL node',
            lines: ['key, val, prev, next'],
          },
        ],
        edges: [
          { from: 'map', to: 'node', label: 'points to' },
          { from: 'head', to: 'node', bidir: true },
          { from: 'node', to: 'tail', bidir: true },
        ],
      },
      {
        tab: 'Operations',
        caption: 'get moves the node to head; put inserts at head and evicts tail when full.',
        nodes: [
          {
            id: 'get',
            col: 0,
            row: 0,
            kind: 'op',
            label: 'get(key)',
            lines: ['map lookup', 'move to head'],
          },
          { id: 'put', col: 1, row: 0, kind: 'op', label: 'put(k,v)', lines: ['insert at head'] },
          {
            id: 'ev',
            col: 1,
            row: 1,
            kind: 'note',
            label: 'if full: evict tail',
            lines: ['delete map[tail.key]'],
          },
        ],
        edges: [{ from: 'put', to: 'ev', label: 'capacity?' }],
      },
      {
        tab: 'Complexity',
        caption: 'Both get and put run in O(1) due to the dual-index structure.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'get', lines: ['O(1)'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'put', lines: ['O(1)'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(capacity)'] },
        ],
        edges: [],
        legend: ['get / put O(1)'],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Meeting Rooms III
   * ───────────────────────────────────────────────────────────── */
  'prep-design-meeting-rooms-iii': {
    title: 'Meeting Rooms III',
    pages: [
      {
        tab: 'Structure',
        caption: 'A free min-heap holds room numbers; a busy min-heap holds (endTime, room).',
        nodes: [
          {
            id: 'free',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'free: min-heap',
            lines: ['room numbers'],
          },
          {
            id: 'busy',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'busy: min-heap',
            lines: ['(endTime, roomNum)'],
          },
          {
            id: 'cnt',
            col: 2,
            row: 0,
            kind: 'store',
            label: 'count[n]',
            lines: ['meetings per room'],
          },
        ],
        edges: [{ from: 'busy', to: 'free', label: 'on end' }],
      },
      {
        tab: 'Operations',
        caption:
          'Sort meetings by start; release expired rooms, then assign the lowest-numbered free one.',
        nodes: [
          { id: 'sort', col: 0, row: 0, kind: 'op', label: 'sort meetings by start' },
          {
            id: 'rel',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'release ended rooms',
            lines: ['while busy.top.end ≤ start'],
          },
          {
            id: 'ass',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'assign room',
            lines: ['if free: lowest id', 'else: delay to busy.top.end'],
          },
        ],
        edges: [
          { from: 'sort', to: 'rel' },
          { from: 'rel', to: 'ass' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Sorting dominates; each meeting does O(log n) heap work.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Time',
            lines: ['O(m log m) sort', 'O(m log n) heaps'],
          },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(n) heaps + count'] },
        ],
        edges: [],
        legend: ['m = meetings, n = rooms'],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * My Calendar I
   * ───────────────────────────────────────────────────────────── */
  'prep-design-my-calendar-i': {
    title: 'My Calendar I',
    pages: [
      {
        tab: 'Structure',
        caption: 'Sorted disjoint intervals; a BST-based map gives O(log n) neighbor lookup.',
        nodes: [
          {
            id: 'bst',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'intervals: start→end',
            lines: ['sorted by start', 'all disjoint'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'Book only if no stored interval overlaps [start, end).',
        nodes: [
          { id: 'bk', col: 0, row: 0, kind: 'io', label: 'book(start, end)' },
          {
            id: 'fnd',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'find predecessor/successor',
            lines: ['floorKey / ceilingKey'],
          },
          {
            id: 'chk',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'overlap?',
            lines: ['prev.end > start', 'or next.start < end'],
          },
          { id: 'ins', col: 2, row: 0, kind: 'op', label: 'insert [start,end)' },
          { id: 'no', col: 0, row: 1, kind: 'note', label: '→ false' },
        ],
        edges: [
          { from: 'bk', to: 'fnd' },
          { from: 'fnd', to: 'chk' },
          { from: 'chk', to: 'ins', label: 'no overlap' },
          { from: 'chk', to: 'no', label: 'overlap' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'O(log n) per booking with a tree map; O(n) with a plain list.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'BST approach', lines: ['O(log n)'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'List approach', lines: ['O(n)'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(n)'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Phone Directory
   * ───────────────────────────────────────────────────────────── */
  'prep-design-phone-directory': {
    title: 'Phone Directory Autocomplete',
    pages: [
      {
        tab: 'Structure',
        caption: 'A trie stores contact names; each leaf marks a complete name.',
        nodes: [
          { id: 'root', col: 0.5, row: 0, kind: 'store', label: 'Trie root' },
          { id: 'a', col: 0, row: 1, kind: 'store', label: '"a…"' },
          { id: 'b', col: 1, row: 1, kind: 'store', label: '"b…"' },
          { id: 'al', col: 0, row: 2, kind: 'store', label: '"al…"', lines: ['isEnd=true'] },
        ],
        edges: [
          { from: 'root', to: 'a', label: "'a'" },
          { from: 'root', to: 'b', label: "'b'" },
          { from: 'a', to: 'al' },
        ],
      },
      {
        tab: 'Operations',
        caption: 'Walk the prefix then DFS from that node to collect all matching names.',
        nodes: [
          { id: 'in', col: 0, row: 0, kind: 'io', label: 'search(prefix)' },
          {
            id: 'walk',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'walk chars',
            lines: ['return null if missing'],
          },
          { id: 'dfs', col: 1, row: 1, kind: 'op', label: 'DFS collect names' },
          { id: 'out', col: 1, row: 2, kind: 'io', label: '[]string results' },
        ],
        edges: [
          { from: 'in', to: 'walk' },
          { from: 'walk', to: 'dfs', label: 'prefix node' },
          { from: 'dfs', to: 'out' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Search runs in O(L + S) where L is the prefix length and S is total output size.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'insert', lines: ['O(L)'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'suggest', lines: ['O(L + S)'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(total chars)'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Random Pick Index
   * ───────────────────────────────────────────────────────────── */
  'prep-design-random-pick-index': {
    title: 'Random Pick Index',
    pages: [
      {
        tab: 'Structure',
        caption: 'A map from value to all its indices enables uniform random selection.',
        nodes: [
          {
            id: 'map',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'val → []index',
            lines: ['precomputed at build'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'Return a uniformly random index from the list for the target value.',
        nodes: [
          { id: 'in', col: 0, row: 0, kind: 'io', label: 'pick(target)' },
          {
            id: 'get',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'map[target]',
            lines: ['fetch index list'],
          },
          { id: 'rnd', col: 1, row: 1, kind: 'op', label: 'rand(0, len-1)' },
          { id: 'out', col: 1, row: 2, kind: 'io', label: 'random index' },
        ],
        edges: [
          { from: 'in', to: 'get' },
          { from: 'get', to: 'rnd' },
          { from: 'rnd', to: 'out' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Reservoir sampling avoids storing the full index list — O(n) space to O(1).',
        nodes: [
          {
            id: 't1',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Map approach',
            lines: ['O(n) space', 'O(1) pick'],
          },
          {
            id: 't2',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'Reservoir',
            lines: ['O(1) space', 'O(n) pick'],
          },
        ],
        edges: [],
        legend: ['Pick approach based on call frequency vs memory'],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Random Pick with Weight
   * ───────────────────────────────────────────────────────────── */
  'prep-design-random-pick-with-weight': {
    title: 'Random Pick with Weight',
    pages: [
      {
        tab: 'Structure',
        caption: 'Prefix sums turn weighted sampling into a binary search problem.',
        nodes: [
          { id: 'w', col: 0, row: 0, kind: 'store', label: 'w[]: weights', lines: ['[1, 3, 2]'] },
          {
            id: 'prefix',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'prefix[]: cumulative',
            lines: ['[1, 4, 6]'],
          },
        ],
        edges: [{ from: 'w', to: 'prefix', label: 'build' }],
      },
      {
        tab: 'Operations',
        caption: 'Pick a random point in [1, total] then binary-search for its bucket.',
        nodes: [
          { id: 'rnd', col: 0, row: 0, kind: 'op', label: 'r = rand(1, total)' },
          {
            id: 'bs',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'bsearch prefix ≥ r',
            lines: ['lower bound'],
          },
          { id: 'ret', col: 2, row: 0, kind: 'io', label: 'index found' },
        ],
        edges: [
          { from: 'rnd', to: 'bs' },
          { from: 'bs', to: 'ret' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Build once in O(n); each pick is O(log n).',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'build', lines: ['O(n)'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'pick', lines: ['O(log n) bsearch'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(n) prefix array'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Range Module
   * ───────────────────────────────────────────────────────────── */
  'prep-design-range-module': {
    title: 'Range Module',
    pages: [
      {
        tab: 'Structure',
        caption: 'A sorted map of disjoint intervals: start → end.',
        nodes: [
          {
            id: 'map',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'intervals: start→end',
            lines: ['sorted, disjoint'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption:
          'Add merges overlapping intervals; remove splits or trims them; query checks containment.',
        nodes: [
          { id: 'add', col: 0, row: 0, kind: 'op', label: 'addRange', lines: ['merge overlaps'] },
          { id: 'rem', col: 1, row: 0, kind: 'op', label: 'removeRange', lines: ['split / trim'] },
          {
            id: 'qry',
            col: 2,
            row: 0,
            kind: 'op',
            label: 'queryRange',
            lines: ['check containment'],
          },
          { id: 'map2', col: 1, row: 1, kind: 'store', label: 'interval map' },
        ],
        edges: [
          { from: 'add', to: 'map2' },
          { from: 'rem', to: 'map2' },
          { from: 'qry', to: 'map2' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'Each operation is O(k log n) where k is the number of affected intervals.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Time',
            lines: ['O(k log n) per op', 'k = affected intervals'],
          },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(n) intervals'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Read N Characters Given Read4 II
   * ───────────────────────────────────────────────────────────── */
  'prep-design-read-n-characters-given-read4-ii-call-multiple-times': {
    title: 'Read N Chars Given Read4 II',
    pages: [
      {
        tab: 'Structure',
        caption: 'An internal 4-byte buffer carries leftover characters between calls.',
        nodes: [
          {
            id: 'buf4',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'buf4[4]',
            lines: ['internal 4-byte buffer'],
          },
          {
            id: 'ptr',
            col: 0,
            row: 1,
            kind: 'store',
            label: 'bufPtr',
            lines: ['read position in buf4'],
          },
          {
            id: 'cnt',
            col: 1,
            row: 1,
            kind: 'store',
            label: 'bufCnt',
            lines: ['valid bytes in buf4'],
          },
        ],
        edges: [
          { from: 'buf4', to: 'ptr' },
          { from: 'buf4', to: 'cnt' },
        ],
      },
      {
        tab: 'Operations',
        caption:
          'Drain the internal buffer first; then call read4 to refill until n bytes are read.',
        nodes: [
          { id: 'in', col: 0, row: 0, kind: 'io', label: 'read(buf, n)' },
          {
            id: 'drain',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'drain buf4',
            lines: ['copy leftover to buf'],
          },
          {
            id: 'rf',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'read4 → buf4',
            lines: ['refill if needed'],
          },
          { id: 'out', col: 1, row: 2, kind: 'io', label: 'bytes written' },
        ],
        edges: [
          { from: 'in', to: 'drain' },
          { from: 'drain', to: 'rf', label: 'still need more' },
          { from: 'rf', to: 'drain', dashed: true },
          { from: 'drain', to: 'out' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'O(n) per call; the buffer avoids an extra read4 system call on each invocation.',
        nodes: [
          { id: 't', col: 0, row: 0, kind: 'note', label: 'Time', lines: ['O(n)'] },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(1) — just buf4'] },
          {
            id: 'k',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: 'Key',
            lines: ['state persists between calls', 'via bufPtr / bufCnt'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * RLE Iterator
   * ───────────────────────────────────────────────────────────── */
  'prep-design-rle-iterator': {
    title: 'RLE Iterator',
    pages: [
      {
        tab: 'Structure',
        caption: 'An index cursor walks the (count, value) pair array in-place.',
        nodes: [
          {
            id: 'enc',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'encoding[]',
            lines: ['[c0,v0, c1,v1, …]'],
          },
          {
            id: 'idx',
            col: 0.5,
            row: 1,
            kind: 'store',
            label: 'i: int',
            lines: ['current pair index'],
          },
        ],
        edges: [{ from: 'enc', to: 'idx', dashed: true }],
      },
      {
        tab: 'Operations',
        caption: 'next(n) consumes n elements across pairs, advancing the cursor.',
        nodes: [
          { id: 'in', col: 0, row: 0, kind: 'io', label: 'next(n)' },
          { id: 'chk', col: 1, row: 0, kind: 'op', label: 'enc[i] ≥ n?', lines: ['current count'] },
          {
            id: 'sub',
            col: 2,
            row: 0,
            kind: 'op',
            label: 'enc[i] -= n',
            lines: ['return enc[i+1]'],
          },
          {
            id: 'adv',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'n -= enc[i]; i+=2',
            lines: ['advance pair'],
          },
        ],
        edges: [
          { from: 'in', to: 'chk' },
          { from: 'chk', to: 'sub', label: 'yes' },
          { from: 'chk', to: 'adv', label: 'no' },
          { from: 'adv', to: 'chk', dashed: true },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'next(n) is O(k) where k is the number of pairs consumed per call.',
        nodes: [
          {
            id: 't',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'Time',
            lines: ['O(k) per next', 'amortized O(n) total'],
          },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(1) extra'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Sequentially Ordinal Rank Tracker
   * ───────────────────────────────────────────────────────────── */
  'prep-design-sequentially-ordinal-rank-tracker': {
    title: 'Sequentially Ordinal Rank Tracker',
    pages: [
      {
        tab: 'Structure',
        caption: 'A max-heap of unqueried best places; a min-heap tracks the queried side.',
        nodes: [
          {
            id: 'max',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'max-heap',
            lines: ['unqueried best places'],
          },
          {
            id: 'min',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'min-heap',
            lines: ['already returned'],
          },
        ],
        edges: [{ from: 'max', to: 'min', label: 'get() moves top' }],
        legend: ['Invariant: all max ≥ all min'],
      },
      {
        tab: 'Operations',
        caption: 'add rebalances across both heaps; get pops the max-heap top.',
        nodes: [
          {
            id: 'add',
            col: 0,
            row: 0,
            kind: 'op',
            label: 'add(name, score)',
            lines: ['push to max-heap'],
          },
          {
            id: 'bal',
            col: 0,
            row: 1,
            kind: 'op',
            label: 'rebalance',
            lines: ['keep top of min < top of max'],
          },
          { id: 'get', col: 1, row: 0, kind: 'op', label: 'get()', lines: ['pop max → push min'] },
        ],
        edges: [{ from: 'add', to: 'bal' }],
      },
      {
        tab: 'Complexity',
        caption: 'Both add and get are O(log n).',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'add', lines: ['O(log n)'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'get', lines: ['O(log n)'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(n)'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Snapshot Array
   * ───────────────────────────────────────────────────────────── */
  'prep-design-snapshot-array': {
    title: 'Snapshot Array',
    pages: [
      {
        tab: 'Structure',
        caption: 'Each index stores a sorted list of (snapId, value) pairs — only on change.',
        nodes: [
          {
            id: 'hist',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'data[i]',
            lines: ['[(snapId, val), …]', 'sorted by snapId'],
          },
          {
            id: 'snap',
            col: 1,
            row: 0,
            kind: 'store',
            label: 'snapId counter',
            lines: ['increments on snap()'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'set appends a new entry; get binary-searches for the latest entry ≤ snapId.',
        nodes: [
          {
            id: 'set',
            col: 0,
            row: 0,
            kind: 'op',
            label: 'set(i, val)',
            lines: ['append (snapId, val)'],
          },
          { id: 'sp', col: 1, row: 0, kind: 'op', label: 'snap()', lines: ['return snapId++'] },
          {
            id: 'get',
            col: 2,
            row: 0,
            kind: 'op',
            label: 'get(i, snapId)',
            lines: ['bsearch ≤ snapId'],
          },
          { id: 'ret', col: 2, row: 1, kind: 'io', label: 'value at snap' },
        ],
        edges: [{ from: 'get', to: 'ret' }],
      },
      {
        tab: 'Complexity',
        caption: 'set and snap are O(1); get is O(log s) where s is the number of snapshots.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'set / snap', lines: ['O(1)'] },
          { id: 't2', col: 1, row: 0, kind: 'note', label: 'get', lines: ['O(log s)'] },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(total writes)'] },
        ],
        edges: [],
        legend: ['Copy-on-write: only changed indices grow'],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Stock Price Fluctuation
   * ───────────────────────────────────────────────────────────── */
  'prep-design-stock-price-fluctuation': {
    title: 'Stock Price Fluctuation',
    pages: [
      {
        tab: 'Structure',
        caption: 'A map is the source of truth; two heaps answer max/min with lazy deletion.',
        nodes: [
          {
            id: 'map',
            col: 0,
            row: 0,
            kind: 'store',
            label: 'ts → price',
            lines: ['source of truth'],
          },
          { id: 'max', col: 1, row: 0, kind: 'store', label: 'max-heap', lines: ['(price, ts)'] },
          { id: 'min', col: 2, row: 0, kind: 'store', label: 'min-heap', lines: ['(price, ts)'] },
          { id: 'cur', col: 0, row: 1, kind: 'store', label: 'maxTs', lines: ['latest timestamp'] },
        ],
        edges: [
          { from: 'map', to: 'max', dashed: true },
          { from: 'map', to: 'min', dashed: true },
        ],
      },
      {
        tab: 'Operations',
        caption: 'update writes to map; maximum/minimum pop stale tops using the map to validate.',
        nodes: [
          {
            id: 'upd',
            col: 0,
            row: 0,
            kind: 'op',
            label: 'update(ts, price)',
            lines: ['map[ts]=price, push heaps'],
          },
          { id: 'cur2', col: 1, row: 0, kind: 'op', label: 'current()', lines: ['map[maxTs]'] },
          {
            id: 'mx',
            col: 0,
            row: 1,
            kind: 'op',
            label: 'maximum()',
            lines: ['pop until map[ts]==price'],
          },
          { id: 'mn', col: 1, row: 1, kind: 'op', label: 'minimum()', lines: ['same lazy delete'] },
        ],
        edges: [],
      },
      {
        tab: 'Complexity',
        caption: 'update is O(log n); max/min are O(log n) amortized due to lazy deletion.',
        nodes: [
          { id: 't1', col: 0, row: 0, kind: 'note', label: 'update', lines: ['O(log n)'] },
          {
            id: 't2',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'max / min',
            lines: ['O(log n) amortized'],
          },
          { id: 's', col: 0.5, row: 1, kind: 'note', label: 'Space', lines: ['O(n)'] },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Tiny URL
   * ───────────────────────────────────────────────────────────── */
  'prep-design-tiny-url': {
    title: 'Tiny URL (Bijective Base62)',
    pages: [
      {
        tab: 'Structure',
        caption: 'Two maps (id↔url) plus an auto-incrementing id counter.',
        nodes: [
          { id: 'id2u', col: 0, row: 0, kind: 'store', label: 'id2url', lines: ['id → longUrl'] },
          { id: 'u2id', col: 1, row: 0, kind: 'store', label: 'url2id', lines: ['longUrl → id'] },
          {
            id: 'ctr',
            col: 2,
            row: 0,
            kind: 'store',
            label: 'counter',
            lines: ['auto-increment id'],
          },
        ],
        edges: [],
      },
      {
        tab: 'Operations',
        caption: 'encode converts id to base62; decode reverses to look up the long URL.',
        nodes: [
          { id: 'long', col: 0, row: 0, kind: 'io', label: 'longUrl' },
          {
            id: 'enc',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'encode()',
            lines: ['id++ → base62 str'],
          },
          { id: 'sh', col: 2, row: 0, kind: 'io', label: 'short code' },
          {
            id: 'dec',
            col: 1,
            row: 1,
            kind: 'op',
            label: 'decode()',
            lines: ['base62 → id → url'],
          },
        ],
        edges: [
          { from: 'long', to: 'enc' },
          { from: 'enc', to: 'sh' },
          { from: 'sh', to: 'dec' },
          { from: 'dec', to: 'long', label: 'resolve' },
        ],
      },
      {
        tab: 'Complexity',
        caption: 'O(L) per encode/decode where L is the URL length; no hash collisions.',
        nodes: [
          { id: 't', col: 0, row: 0, kind: 'note', label: 'Time', lines: ['O(L) encode/decode'] },
          { id: 's', col: 1, row: 0, kind: 'note', label: 'Space', lines: ['O(n·L) two maps'] },
          {
            id: 'k',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: 'Key',
            lines: ['base62: 0-9 A-Z a-z', 'bijective — no collisions'],
          },
        ],
        edges: [],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────
   * Version Control Snapshot
   * ───────────────────────────────────────────────────────────── */
  'prep-design-version-control-snapshot': {
    title: 'Version Control Snapshot',
    pages: [
      {
        tab: 'Structure',
        caption: 'Commits are stored as snapshots keyed by version id; copy-on-write shares data.',
        nodes: [
          {
            id: 'store',
            col: 0.5,
            row: 0,
            kind: 'store',
            label: 'versions: id→snapshot',
            lines: ['each commit = copy of state'],
          },
          {
            id: 'head',
            col: 0.5,
            row: 1,
            kind: 'store',
            label: 'HEAD pointer',
            lines: ['current version id'],
          },
        ],
        edges: [{ from: 'head', to: 'store' }],
      },
      {
        tab: 'Operations',
        caption: 'commit saves current state; checkout restores an old snapshot.',
        nodes: [
          {
            id: 'cm',
            col: 0,
            row: 0,
            kind: 'op',
            label: 'commit()',
            lines: ['copy state → versions[id++]'],
          },
          {
            id: 'co',
            col: 1,
            row: 0,
            kind: 'op',
            label: 'checkout(v)',
            lines: ['state = versions[v]'],
          },
          { id: 'st', col: 2, row: 0, kind: 'store', label: 'current state' },
        ],
        edges: [
          { from: 'cm', to: 'st', label: 'save' },
          { from: 'co', to: 'st', label: 'restore' },
        ],
      },
      {
        tab: 'Complexity',
        caption:
          'Naive copy is O(n) per commit; structural sharing reduces repeated writes to O(1).',
        nodes: [
          {
            id: 't1',
            col: 0,
            row: 0,
            kind: 'note',
            label: 'commit (naive)',
            lines: ['O(n) — full copy'],
          },
          {
            id: 't2',
            col: 1,
            row: 0,
            kind: 'note',
            label: 'commit (COW)',
            lines: ['O(1) — share unchanged'],
          },
          {
            id: 't3',
            col: 0.5,
            row: 1,
            kind: 'note',
            label: 'checkout',
            lines: ['O(1) — swap pointer'],
          },
        ],
        edges: [],
        legend: ['COW = copy-on-write structural sharing'],
      },
    ],
  },
};

export function getDesignDiagram(id: string): DesignDiagramSpec | undefined {
  return designDiagrams[id];
}

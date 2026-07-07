import type { DesignDiagramSpec } from './types';

/**
 * Static design-flow diagrams keyed by prep manifest id (`prep-design-*`).
 * Rendered by `DesignFlow` in place of the animated timeline for design-topic
 * problems. Coordinates are on a coarse column/row grid (see `DesignFlow`).
 */
export const designDiagrams: Record<string, DesignDiagramSpec> = {
  'prep-design-amount-of-new-area-painted-each-day': {
    title: 'Amount of New Area Painted Each Day',
    caption: 'Union-find / jump array skips already-painted cells so each cell is counted once.',
    nodes: [
      { id: 'q', col: 0, row: 0, kind: 'io', label: 'Day paints [start, end)' },
      { id: 'walk', col: 1, row: 0, kind: 'op', label: 'Walk s→e', lines: ['jump via next[x]'] },
      {
        id: 'next',
        col: 2,
        row: 0,
        kind: 'store',
        label: 'next[] jump array',
        lines: ['next[x] = next free'],
      },
      {
        id: 'ans',
        col: 1,
        row: 1,
        kind: 'store',
        label: 'answer[day]',
        lines: ['+= newly painted'],
      },
    ],
    edges: [
      { from: 'q', to: 'walk' },
      { from: 'walk', to: 'next', label: 'skip filled', bidir: true },
      { from: 'walk', to: 'ans', label: 'new area' },
    ],
    legend: ['O((n + range) α) amortized'],
  },

  'prep-design-design-in-memory-file-system': {
    title: 'In-Memory File System',
    caption: 'A trie of FsNodes; ensureDir creates dirs on write, find walks read-only.',
    nodes: [
      {
        id: 'api',
        col: 0,
        row: 0,
        w: 2,
        kind: 'op',
        label: 'mkdir / addContent / ls / readContent',
      },
      { id: 'root', col: 0.5, row: 1, kind: 'store', label: 'root /', lines: ['children: map'] },
      { id: 'dir', col: 0.5, row: 2, kind: 'store', label: 'dir a/', lines: ['isFile = false'] },
      {
        id: 'file',
        col: 0.5,
        row: 3,
        kind: 'store',
        label: 'file a/b.txt',
        lines: ['content: "hi"'],
      },
    ],
    edges: [
      { from: 'api', to: 'root', label: 'walk path' },
      { from: 'root', to: 'dir', label: "children['a']" },
      { from: 'dir', to: 'file' },
    ],
  },

  'prep-design-design-parking-system': {
    title: 'Parking System',
    caption: 'Keep one remaining-count per car size; addCar decrements if space left.',
    nodes: [
      { id: 'op', col: 0, row: 0, kind: 'op', label: 'addCar(carType)' },
      {
        id: 'slots',
        col: 1,
        row: 0,
        kind: 'store',
        label: 'slots[big, med, small]',
        lines: ['counts remaining'],
      },
      { id: 'note', col: 0.5, row: 1, w: 1, kind: 'note', label: 'return slots[type]-- > 0' },
    ],
    edges: [
      { from: 'op', to: 'slots', label: 'decrement' },
      { from: 'slots', to: 'note' },
    ],
  },

  'prep-design-design-tic-tac-toe': {
    title: 'Tic-Tac-Toe',
    caption: 'Signed running sums per line; a move wins when |sum| reaches n.',
    nodes: [
      { id: 'op', col: 0, row: 0.5, kind: 'op', label: 'move(r, c, player)', lines: ['+1 / -1'] },
      { id: 'rows', col: 1, row: 0, kind: 'store', label: 'rows[n]' },
      { id: 'cols', col: 2, row: 0, kind: 'store', label: 'cols[n]' },
      { id: 'diag', col: 1, row: 1, kind: 'store', label: 'diag' },
      { id: 'anti', col: 2, row: 1, kind: 'store', label: 'antiDiag' },
      { id: 'note', col: 1.5, row: 2, kind: 'note', label: '|sum| == n → win' },
    ],
    edges: [
      { from: 'op', to: 'rows' },
      { from: 'op', to: 'cols' },
      { from: 'op', to: 'diag' },
      { from: 'op', to: 'anti' },
      { from: 'op', to: 'note', label: 'check' },
    ],
    legend: ['O(1) per move'],
  },

  'prep-design-detect-squares': {
    title: 'Detect Squares',
    caption: 'Count point frequencies; for a query, pick a diagonal and multiply corner counts.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'add(point) / count(point)' },
      { id: 'cnt', col: 0, row: 1, kind: 'store', label: 'cnt: point → freq' },
      { id: 'pts', col: 1, row: 1, kind: 'store', label: 'points list' },
      { id: 'note', col: 0.5, row: 2, w: 1, kind: 'note', label: 'pick diagonal, multiply freqs' },
    ],
    edges: [
      { from: 'op', to: 'cnt' },
      { from: 'op', to: 'pts' },
      { from: 'cnt', to: 'note' },
      { from: 'pts', to: 'note' },
    ],
  },

  'prep-design-dictionary-and-spell': {
    title: 'Dictionary + Spell Suggest',
    caption: 'Store words in a trie; walk the prefix then DFS to collect suggestions.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'search(word) / suggest(prefix)' },
      {
        id: 'root',
        col: 0.5,
        row: 1,
        kind: 'store',
        label: 'Trie root',
        lines: ['children, isEnd'],
      },
      { id: 'node', col: 0.5, row: 2, kind: 'store', label: 'prefix node' },
      { id: 'note', col: 0.5, row: 3, kind: 'note', label: 'DFS → suggestions' },
    ],
    edges: [
      { from: 'op', to: 'root', label: 'walk chars' },
      { from: 'root', to: 'node' },
      { from: 'node', to: 'note' },
    ],
  },

  'prep-design-dot-product-of-two-sparse-vectors': {
    title: 'Dot Product of Two Sparse Vectors',
    caption: 'Store only non-zeros as (index, value); two pointers advance the smaller index.',
    nodes: [
      { id: 'a', col: 0, row: 0, kind: 'store', label: 'A: (idx, val)[]' },
      { id: 'b', col: 2, row: 0, kind: 'store', label: 'B: (idx, val)[]' },
      {
        id: 'op',
        col: 1,
        row: 1,
        kind: 'op',
        label: 'two pointers i, j',
        lines: ['advance smaller idx'],
      },
      { id: 'note', col: 1, row: 2, kind: 'note', label: 'sum A.val·B.val when idx match' },
    ],
    edges: [
      { from: 'a', to: 'op' },
      { from: 'b', to: 'op' },
      { from: 'op', to: 'note' },
    ],
  },

  'prep-design-exclusive-time-of-functions': {
    title: 'Exclusive Time of Functions',
    caption: 'A call stack tracks the running function; add elapsed time on each start/end log.',
    nodes: [
      { id: 'logs', col: 0, row: 0, w: 2, kind: 'io', label: "logs: 'id:start|end:ts'" },
      { id: 'proc', col: 0, row: 1, kind: 'op', label: 'process each log' },
      { id: 'note', col: 1, row: 1, kind: 'note', label: 'subtract child time' },
      {
        id: 'stack',
        col: 0,
        row: 2,
        kind: 'store',
        label: 'stack of fn ids',
        lines: ['top = running'],
      },
      { id: 'res', col: 1, row: 2, kind: 'store', label: 'res[id] += Δt' },
    ],
    edges: [
      { from: 'logs', to: 'proc' },
      { from: 'proc', to: 'stack', label: 'push / pop' },
      { from: 'proc', to: 'res' },
      { from: 'proc', to: 'note' },
    ],
  },

  'prep-design-design-an-expression-tree-with-evaluate-function': {
    title: 'Expression Tree',
    caption: 'Build the tree from postfix with a stack; evaluate() recurses over operands.',
    nodes: [
      { id: 'in', col: 0, row: 0, kind: 'io', label: 'postfix tokens' },
      {
        id: 'build',
        col: 1,
        row: 0,
        kind: 'op',
        label: 'build via stack',
        lines: ['num→push', 'op→pop 2'],
      },
      { id: 'stack', col: 2, row: 0, kind: 'store', label: 'node stack' },
      { id: 'tree', col: 1, row: 1, kind: 'store', label: 'ExprTree root' },
      { id: 'eval', col: 1, row: 2, kind: 'note', label: 'evaluate(): recurse l/r' },
    ],
    edges: [
      { from: 'in', to: 'build' },
      { from: 'build', to: 'stack', bidir: true },
      { from: 'build', to: 'tree', label: 'final node' },
      { from: 'tree', to: 'eval' },
    ],
  },

  'prep-design-find-median-from-data-stream': {
    title: 'Median from Data Stream',
    caption: 'Two heaps split the stream; the median comes from the heap tops.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'addNum(x) / findMedian()' },
      { id: 'lo', col: 0, row: 1, kind: 'store', label: 'lo: max-heap', lines: ['lower half'] },
      { id: 'hi', col: 1, row: 1, kind: 'store', label: 'hi: min-heap', lines: ['upper half'] },
      { id: 'note', col: 0.5, row: 2, w: 1, kind: 'note', label: 'median = top(s)' },
    ],
    edges: [
      { from: 'op', to: 'lo' },
      { from: 'op', to: 'hi' },
      { from: 'lo', to: 'hi', label: '|Δ| ≤ 1', bidir: true },
      { from: 'lo', to: 'note' },
    ],
    legend: ['add O(log n) · median O(1)'],
  },

  'prep-design-find-servers-that-handled-most-number-of-requests': {
    title: 'Servers Handling Most Requests',
    caption: 'A sorted free-set picks the next server; a min-heap frees busy ones by end time.',
    nodes: [
      { id: 'req', col: 0, row: 0, w: 2, kind: 'io', label: 'request(id, arrival, load)' },
      { id: 'free', col: 0, row: 1, kind: 'store', label: 'free: sorted ids' },
      {
        id: 'busy',
        col: 1,
        row: 1,
        kind: 'store',
        label: 'busy: min-heap',
        lines: ['(endTime, id)'],
      },
      { id: 'op', col: 0, row: 2, w: 2, kind: 'op', label: 'assign kth free; release expired' },
    ],
    edges: [
      { from: 'req', to: 'op' },
      { from: 'op', to: 'free', label: 'take / return', bidir: true },
      { from: 'op', to: 'busy', label: 'push / pop', bidir: true },
    ],
  },

  'prep-design-guess-the-word': {
    title: 'Guess the Word',
    caption: 'Guess a candidate, then keep only words with the same match score to the secret.',
    nodes: [
      { id: 'cand', col: 0, row: 0, kind: 'store', label: 'candidates' },
      { id: 'op', col: 1, row: 0, kind: 'op', label: 'guess(word)' },
      { id: 'api', col: 2, row: 0, kind: 'io', label: 'Master (secret)' },
      { id: 'note', col: 0.5, row: 1, w: 1, kind: 'note', label: 'keep same match count' },
    ],
    edges: [
      { from: 'cand', to: 'op' },
      { from: 'op', to: 'api', label: 'score', bidir: true },
      { from: 'op', to: 'note' },
      { from: 'note', to: 'cand', label: 'shrink' },
    ],
  },

  'prep-design-insert-delete-getrandom-o1': {
    title: 'Insert Delete GetRandom O(1)',
    caption: 'An array gives O(1) random; a map gives O(1) locate; remove swaps with the last.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'insert / remove / getRandom' },
      {
        id: 'vals',
        col: 0,
        row: 1,
        kind: 'store',
        label: 'vals: array',
        lines: ['rand → vals[i]'],
      },
      { id: 'idx', col: 1, row: 1, kind: 'store', label: 'idx: val → index' },
      { id: 'note', col: 0.5, row: 2, w: 1, kind: 'note', label: 'remove: swap w/ last, pop' },
    ],
    edges: [
      { from: 'op', to: 'vals' },
      { from: 'op', to: 'idx' },
      { from: 'vals', to: 'idx', bidir: true },
      { from: 'vals', to: 'note' },
    ],
  },

  'prep-design-load-balancer': {
    title: 'Round-Robin Load Balancer',
    caption: 'A cursor advances modulo server count so requests cycle across servers.',
    nodes: [
      { id: 'req', col: 0, row: 0, kind: 'io', label: 'incoming request' },
      { id: 'op', col: 1, row: 0, kind: 'op', label: 'pick next', lines: ['ptr = (ptr+1) % n'] },
      { id: 'ring', col: 2, row: 0, kind: 'store', label: 'servers [s0..s3]' },
    ],
    edges: [
      { from: 'req', to: 'op' },
      { from: 'op', to: 'ring', label: 'route' },
      { from: 'ring', to: 'op', label: 'cursor', dashed: true },
    ],
  },

  'prep-design-log-analyzer': {
    title: 'Log Analyzer',
    caption: 'Parse raw lines into fields, accumulate aggregates, then answer queries.',
    nodes: [
      { id: 'in', col: 0, row: 0, kind: 'io', label: 'raw log lines' },
      { id: 'parse', col: 1, row: 0, kind: 'op', label: 'parse fields' },
      { id: 'agg', col: 2, row: 0, kind: 'store', label: 'agg: key → stats' },
      { id: 'query', col: 1, row: 1, kind: 'op', label: 'query(range / filter)' },
    ],
    edges: [
      { from: 'in', to: 'parse' },
      { from: 'parse', to: 'agg', label: 'accumulate' },
      { from: 'agg', to: 'query' },
    ],
  },

  'prep-design-logger-rate-limiter': {
    title: 'Logger Rate Limiter',
    caption: 'Remember the next allowed timestamp per message; print only when time passes it.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'shouldPrint(ts, msg)' },
      { id: 'map', col: 0.5, row: 1, kind: 'store', label: 'msg → nextAllowedTs' },
      { id: 'note', col: 0.5, row: 2, kind: 'note', label: 'print iff ts ≥ next; next = ts+10' },
    ],
    edges: [
      { from: 'op', to: 'map', bidir: true },
      { from: 'map', to: 'note' },
    ],
  },

  'prep-design-lru-cache': {
    title: 'LRU Cache',
    caption: 'A hash map finds nodes in O(1); a doubly linked list orders by recency.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'get(k) / put(k, v)' },
      { id: 'map', col: 0, row: 1, kind: 'store', label: 'map: key → node' },
      {
        id: 'dll',
        col: 1,
        row: 1,
        kind: 'store',
        label: 'DLL head↔tail',
        lines: ['head=MRU, tail=LRU'],
      },
      { id: 'note', col: 0.5, row: 2, w: 1, kind: 'note', label: 'access → head; evict tail' },
    ],
    edges: [
      { from: 'op', to: 'map' },
      { from: 'map', to: 'dll', label: 'O(1) node', bidir: true },
      { from: 'dll', to: 'note' },
    ],
    legend: ['get / put O(1)'],
  },

  'prep-design-meeting-rooms-iii': {
    title: 'Meeting Rooms III',
    caption: 'A free-room heap assigns the lowest number; a busy heap frees rooms by end time.',
    nodes: [
      { id: 'in', col: 0, row: 0, w: 2, kind: 'io', label: 'meetings [start, end]' },
      { id: 'free', col: 0, row: 1, kind: 'store', label: 'free: min-heap room#' },
      { id: 'busy', col: 1, row: 1, kind: 'store', label: 'busy: (endT, room#)' },
      { id: 'op', col: 0, row: 2, w: 2, kind: 'op', label: 'assign earliest room; delay if none' },
    ],
    edges: [
      { from: 'in', to: 'op' },
      { from: 'op', to: 'free', bidir: true },
      { from: 'op', to: 'busy', bidir: true },
    ],
  },

  'prep-design-my-calendar-i': {
    title: 'My Calendar I',
    caption: 'Keep booked intervals sorted; reject a new booking that overlaps an existing one.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'book(start, end)' },
      {
        id: 'store',
        col: 0.5,
        row: 1,
        kind: 'store',
        label: 'sorted intervals',
        lines: ['BST / list'],
      },
      { id: 'note', col: 0.5, row: 2, kind: 'note', label: 'reject if overlaps' },
    ],
    edges: [
      { from: 'op', to: 'store', label: 'check + insert', bidir: true },
      { from: 'store', to: 'note' },
    ],
  },

  'prep-design-phone-directory': {
    title: 'Phone Directory Autocomplete',
    caption: 'Contacts live in a trie; walk the prefix then DFS to collect matching names.',
    nodes: [
      { id: 'op', col: 0, row: 0, kind: 'op', label: 'search(prefix)' },
      {
        id: 'trie',
        col: 1,
        row: 0,
        kind: 'store',
        label: 'Trie of contacts',
        lines: ['children, isName'],
      },
      { id: 'note', col: 1, row: 1, kind: 'note', label: 'DFS collect names' },
    ],
    edges: [
      { from: 'op', to: 'trie', label: 'walk prefix' },
      { from: 'trie', to: 'note' },
    ],
  },

  'prep-design-random-pick-index': {
    title: 'Random Pick Index',
    caption: 'Map each value to its indices (or reservoir-sample) and return a uniform pick.',
    nodes: [
      { id: 'op', col: 0, row: 0, kind: 'op', label: 'pick(target)' },
      { id: 'map', col: 1, row: 0, kind: 'store', label: 'value → [indices]' },
      { id: 'note', col: 0.5, row: 1, w: 1, kind: 'note', label: 'random index from list' },
      { id: 'alt', col: 1, row: 1, kind: 'note', label: 'or reservoir sampling' },
    ],
    edges: [
      { from: 'op', to: 'map' },
      { from: 'map', to: 'note' },
      { from: 'op', to: 'alt', dashed: true },
    ],
  },

  'prep-design-random-pick-with-weight': {
    title: 'Random Pick with Weight',
    caption: 'Precompute prefix sums; pick a random point and binary-search the bucket.',
    nodes: [
      { id: 'w', col: 0, row: 0, kind: 'store', label: 'w[]: weights' },
      { id: 'build', col: 1, row: 0, kind: 'op', label: 'build prefix sums' },
      { id: 'prefix', col: 2, row: 0, kind: 'store', label: 'prefix[]: cumulative' },
      {
        id: 'pick',
        col: 1,
        row: 1,
        kind: 'op',
        label: 'pickIndex()',
        lines: ['r = rand(0, total)'],
      },
      { id: 'note', col: 2, row: 1, kind: 'note', label: 'bsearch prefix ≥ r' },
    ],
    edges: [
      { from: 'w', to: 'build' },
      { from: 'build', to: 'prefix' },
      { from: 'pick', to: 'prefix', label: 'bsearch' },
      { from: 'pick', to: 'note' },
    ],
  },

  'prep-design-range-module': {
    title: 'Range Module',
    caption: 'Track disjoint sorted intervals; merge on add, split on remove, scan on query.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'addRange / removeRange / queryRange' },
      {
        id: 'store',
        col: 0.5,
        row: 1,
        kind: 'store',
        label: 'disjoint intervals',
        lines: ['start → end'],
      },
      { id: 'note', col: 0.5, row: 2, w: 1, kind: 'note', label: 'merge on add, split on remove' },
    ],
    edges: [
      { from: 'op', to: 'store', bidir: true },
      { from: 'store', to: 'note' },
    ],
  },

  'prep-design-read-n-characters-given-read4-ii-call-multiple-times': {
    title: 'Read N Chars Given Read4 II',
    caption: 'An internal 4-char buffer carries leftover characters between calls.',
    nodes: [
      { id: 'io', col: 0, row: 0, kind: 'io', label: 'read(buf, n)' },
      { id: 'op', col: 1, row: 0, kind: 'op', label: 'loop: refill via read4' },
      { id: 'buf', col: 2, row: 0, kind: 'store', label: 'buf4[4]', lines: ['bufPtr, bufCnt'] },
      { id: 'note', col: 1, row: 1, w: 2, kind: 'note', label: 'carry leftover between calls' },
    ],
    edges: [
      { from: 'io', to: 'op' },
      { from: 'op', to: 'buf', label: 'read4', bidir: true },
      { from: 'buf', to: 'note' },
    ],
  },

  'prep-design-rle-iterator': {
    title: 'RLE Iterator',
    caption: 'A cursor over [count, value] pairs consumes n, advancing when a run is exhausted.',
    nodes: [
      { id: 'store', col: 0, row: 0, w: 2, kind: 'store', label: 'encoding: [count, value] pairs' },
      { id: 'op', col: 0.5, row: 1, kind: 'op', label: 'next(n)' },
      { id: 'note', col: 0.5, row: 2, kind: 'note', label: 'consume n; advance when count = 0' },
    ],
    edges: [
      { from: 'store', to: 'op' },
      { from: 'op', to: 'store', label: 'cursor i', dashed: true },
      { from: 'op', to: 'note' },
    ],
  },

  'prep-design-sequentially-ordinal-rank-tracker': {
    title: 'Sequentially Ordinal Rank Tracker',
    caption: 'A max-heap of unqueried best places; each get() pops one into the queried side.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'add(name, score) / get()' },
      { id: 'max', col: 0, row: 1, kind: 'store', label: 'max-heap', lines: ['best, unqueried'] },
      { id: 'min', col: 1, row: 1, kind: 'store', label: 'min-heap', lines: ['already queried'] },
      { id: 'note', col: 0.5, row: 2, w: 1, kind: 'note', label: 'get(): pop best → queried' },
    ],
    edges: [
      { from: 'op', to: 'max' },
      { from: 'op', to: 'min' },
      { from: 'max', to: 'min', bidir: true },
      { from: 'max', to: 'note' },
    ],
  },

  'prep-design-snapshot-array': {
    title: 'Snapshot Array',
    caption: 'Each index stores (snapId, value) history; get binary-searches by snap id.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'set / snap / get(i, snapId)' },
      { id: 'hist', col: 0, row: 1, kind: 'store', label: 'per index: [(snapId, val)]' },
      { id: 'cnt', col: 1, row: 1, kind: 'store', label: 'snapId counter' },
      { id: 'note', col: 0.5, row: 2, w: 1, kind: 'note', label: 'get: binary search snapId' },
    ],
    edges: [
      { from: 'op', to: 'hist' },
      { from: 'op', to: 'cnt', label: 'snap++' },
      { from: 'hist', to: 'note' },
    ],
  },

  'prep-design-stock-price-fluctuation': {
    title: 'Stock Price Fluctuation',
    caption: 'A timestamp→price map is the truth; two heaps answer max/min with lazy deletion.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 3, kind: 'op', label: 'update / current / maximum / minimum' },
      { id: 'map', col: 0, row: 1, kind: 'store', label: 'ts → price' },
      { id: 'max', col: 1, row: 1, kind: 'store', label: 'max-heap (price, ts)' },
      { id: 'min', col: 2, row: 1, kind: 'store', label: 'min-heap (price, ts)' },
      { id: 'note', col: 1, row: 2, kind: 'note', label: 'lazy-delete stale tops' },
    ],
    edges: [
      { from: 'op', to: 'map' },
      { from: 'op', to: 'max' },
      { from: 'op', to: 'min' },
      { from: 'max', to: 'note', dashed: true },
      { from: 'min', to: 'note', dashed: true },
    ],
  },

  'prep-design-tiny-url': {
    title: 'Tiny URL (Bijective Base62)',
    caption: 'Encode an incrementing id to base62; two maps resolve short↔long.',
    nodes: [
      { id: 'long', col: 0, row: 0, kind: 'io', label: 'long URL' },
      { id: 'enc', col: 1, row: 0, kind: 'op', label: 'encode: id → base62' },
      { id: 'maps', col: 2, row: 0, kind: 'store', label: 'id2url / url2id' },
      { id: 'short', col: 0, row: 1, kind: 'io', label: 'short URL /abc' },
      { id: 'dec', col: 1, row: 1, kind: 'op', label: 'decode: base62 → id' },
    ],
    edges: [
      { from: 'long', to: 'enc' },
      { from: 'enc', to: 'short', label: 'tiny' },
      { from: 'enc', to: 'maps' },
      { from: 'short', to: 'dec' },
      { from: 'dec', to: 'maps' },
      { from: 'dec', to: 'long', label: 'resolve' },
    ],
  },

  'prep-design-version-control-snapshot': {
    title: 'Version Control Snapshot',
    caption: 'Commits store snapshots by id; copy-on-write shares unchanged data.',
    nodes: [
      { id: 'op', col: 0, row: 0, w: 2, kind: 'op', label: 'commit / checkout(version)' },
      { id: 'store', col: 0.5, row: 1, kind: 'store', label: 'versions: id → snapshot' },
      { id: 'note', col: 0.5, row: 2, w: 1, kind: 'note', label: 'COW: share, copy on write' },
    ],
    edges: [
      { from: 'op', to: 'store', bidir: true },
      { from: 'store', to: 'note' },
    ],
  },
};

export function getDesignDiagram(id: string): DesignDiagramSpec | undefined {
  return designDiagrams[id];
}

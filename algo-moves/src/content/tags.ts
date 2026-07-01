export type TagKind = 'pattern' | 'structure' | 'skill' | 'meta';

export interface Tag {
  id: string;
  label: string;
  kind: TagKind;
}

/**
 * Known tags. Items reference tags by id; unknown ids degrade gracefully via
 * getTag(). Add new tags here — the catalog indexes whatever items use.
 */
const TAGS: Record<string, Tag> = {
  graph: { id: 'graph', label: 'Graph', kind: 'structure' },
  queue: { id: 'queue', label: 'Queue', kind: 'structure' },
  stack: { id: 'stack', label: 'Stack', kind: 'structure' },
  tree: { id: 'tree', label: 'Tree', kind: 'structure' },
  heap: { id: 'heap', label: 'Heap', kind: 'structure' },
  'priority-queue': { id: 'priority-queue', label: 'Priority queue', kind: 'structure' },
  trie: { id: 'trie', label: 'Trie', kind: 'structure' },
  array: { id: 'array', label: 'Array', kind: 'structure' },
  grid: { id: 'grid', label: 'Grid', kind: 'structure' },
  string: { id: 'string', label: 'String', kind: 'structure' },
  'linked-list': { id: 'linked-list', label: 'Linked list', kind: 'structure' },
  intervals: { id: 'intervals', label: 'Intervals', kind: 'structure' },
  bfs: { id: 'bfs', label: 'BFS', kind: 'pattern' },
  dfs: { id: 'dfs', label: 'DFS', kind: 'pattern' },
  '2-coloring': { id: '2-coloring', label: '2-colouring', kind: 'pattern' },
  'union-find': { id: 'union-find', label: 'Union-Find', kind: 'pattern' },
  'topological-sort': { id: 'topological-sort', label: 'Topological sort', kind: 'pattern' },
  'shortest-path': { id: 'shortest-path', label: 'Shortest path', kind: 'pattern' },
  dijkstra: { id: 'dijkstra', label: 'Dijkstra', kind: 'pattern' },
  mst: { id: 'mst', label: 'Minimum spanning tree', kind: 'pattern' },
  'binary-search': { id: 'binary-search', label: 'Binary search', kind: 'pattern' },
  'two-pointers': { id: 'two-pointers', label: 'Two pointers', kind: 'pattern' },
  'sliding-window': { id: 'sliding-window', label: 'Sliding window', kind: 'pattern' },
  sorting: { id: 'sorting', label: 'Sorting', kind: 'pattern' },
  dp: { id: 'dp', label: 'Dynamic programming', kind: 'pattern' },
  greedy: { id: 'greedy', label: 'Greedy', kind: 'pattern' },
  backtracking: { id: 'backtracking', label: 'Backtracking', kind: 'pattern' },
  recursion: { id: 'recursion', label: 'Recursion', kind: 'skill' },
  'cycle-detection': { id: 'cycle-detection', label: 'Cycle detection', kind: 'skill' },
};

export function getTag(id: string): Tag {
  return TAGS[id] ?? { id, label: id, kind: 'meta' };
}

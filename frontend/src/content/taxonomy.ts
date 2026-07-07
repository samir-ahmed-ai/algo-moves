import {
  GO_COURSE_ID,
  GO_BROWSE_CATEGORIES as goBrowseCategories,
  OPENRTB_COURSE_ID,
  OPENRTB_BROWSE_CATEGORIES as openrtbBrowseCategories,
} from '@/plugins/_generated/courses';

/** Top-level browse tracks — the entry points for organizing content. */
export type TrackId =
  'data-structures' | 'algorithms' | 'design' | 'go' | 'openrtb' | 'interview-prep';

export interface BrowseCategorySource {
  courseId: string;
  /** When set, only include these topics from the course; otherwise all topics. */
  topicIds?: string[];
}

export interface BrowseCategory {
  id: string;
  title: string;
  summary?: string;
  /** Longer, two-sentence framing shown on the category board header. */
  description?: string;
  icon?: string;
  sources: BrowseCategorySource[];
}

export interface BrowseTrack {
  id: TrackId;
  title: string;
  summary: string;
  icon: string;
  categoryIds: string[];
}

/** Synthetic topic id prefix for mobile deck / browse scoping. */
export const BROWSE_TOPIC_PREFIX = 'browse-';

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

export function browseTopicId(categoryId: string): string {
  return `${BROWSE_TOPIC_PREFIX}${normalizeId(categoryId)}`;
}

export function isBrowseTopicId(topicId: string): boolean {
  return normalizeId(topicId).startsWith(BROWSE_TOPIC_PREFIX);
}

export function categoryIdFromBrowseTopic(topicId: string): string | undefined {
  const normalized = normalizeId(topicId);
  return isBrowseTopicId(normalized) ? normalized.slice(BROWSE_TOPIC_PREFIX.length) : undefined;
}

/* ---------------------------------------------------------------- categories */

const CATEGORIES: BrowseCategory[] = [
  // —— Data Structures ——
  {
    id: 'arrays',
    title: 'Arrays',
    summary: 'Searching, two pointers, and array manipulation.',
    description:
      'Linear sequences are the foundation of most algorithm problems; master in-place manipulation with two-pointer and sliding-window sweeps. Recognizing sorted-order structure and index arithmetic unlocks clean O(n) solutions.',
    icon: 'Table',
    sources: [{ courseId: 'arrays', topicIds: ['searching'] }, { courseId: 'prep-arrays' }],
  },
  {
    id: 'strings',
    title: 'Strings',
    summary: 'Character arrays, parsing, and string algorithms.',
    icon: 'Type',
    sources: [{ courseId: 'prep-strings' }],
  },
  {
    id: 'hash-maps',
    title: 'Hash Maps',
    summary: 'Key–value lookups, counting, and frequency maps.',
    icon: 'Hash',
    sources: [{ courseId: 'prep-hash-maps' }],
  },
  {
    id: 'linked-lists',
    title: 'Linked Lists',
    summary: 'Rewiring nodes, fast & slow pointers, and list tricks.',
    icon: 'Link',
    sources: [{ courseId: 'linked-lists' }, { courseId: 'prep-linked-lists' }],
  },
  {
    id: 'stacks-queues',
    title: 'Stacks & Queues',
    summary: 'LIFO/FIFO structures and monotonic patterns.',
    icon: 'Layers',
    sources: [{ courseId: 'prep-stacks-queues' }],
  },
  {
    id: 'trees',
    title: 'Trees',
    summary: 'Traversals, BSTs, and recursive tree walks.',
    icon: 'ListTree',
    sources: [{ courseId: 'trees' }, { courseId: 'prep-trees' }],
  },
  {
    id: 'tries',
    title: 'Tries',
    summary: 'Prefix trees for autocomplete and word search.',
    icon: 'GitBranch',
    sources: [{ courseId: 'prep-tries' }],
  },
  {
    id: 'heaps',
    title: 'Heaps',
    summary: 'Priority queues, heap operations, and top-K.',
    icon: 'Triangle',
    sources: [{ courseId: 'heaps' }],
  },
  {
    id: 'matrices',
    title: 'Matrices',
    summary: '2-D grids, traversal, and matrix manipulation.',
    icon: 'Grid',
    sources: [{ courseId: 'prep-matrices' }],
  },
  {
    id: 'database',
    title: 'Database',
    summary: 'SQL-style queries and relational patterns.',
    icon: 'Database',
    sources: [{ courseId: 'prep-database' }],
  },

  // —— Algorithms ——
  {
    id: 'backtracking',
    title: 'Backtracking',
    summary: 'Explore decision trees depth-first, undo dead ends.',
    description:
      'Explore every candidate solution by building it one choice at a time, pruning branches the moment a constraint is violated. The recursion tree expresses the full search space; backtracking keeps it tractable.',
    icon: 'GitBranch',
    sources: [{ courseId: 'backtracking' }],
  },
  {
    id: 'graphs',
    title: 'Graphs',
    summary: 'Traverse, colour, order, and search weighted graphs.',
    description:
      'Model problems as nodes connected by edges, then traverse with BFS for shortest paths and DFS for connectivity and cycle detection. Core patterns — topological sort, bipartite checking, union-find — unlock most graph interview problems.',
    icon: 'Network',
    sources: [{ courseId: 'graphs' }],
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    summary: 'Halve the search space on sorted data.',
    description:
      'Eliminate half the search space each step by evaluating a monotonic predicate at the midpoint. Applies far beyond sorted arrays — any answer space with a yes/no boundary can be binary-searched.',
    icon: 'Search',
    sources: [{ courseId: 'binary-search' }],
  },
  {
    id: 'dynamic-programming',
    title: 'Dynamic Programming',
    summary: 'Tabulate overlapping subproblems for optimal answers.',
    description:
      'Identify overlapping subproblems and cache their results to avoid redundant recomputation. Build the solution bottom-up by filling a table where each cell depends only on previously computed entries.',
    icon: 'Table',
    sources: [{ courseId: 'dynamic-programming' }],
  },
  {
    id: 'greedy',
    title: 'Greedy',
    summary: 'Make locally optimal choices for global solutions.',
    icon: 'TrendingUp',
    sources: [{ courseId: 'greedy' }],
  },
  {
    id: 'sliding-window',
    title: 'Sliding Window',
    summary: 'Maintain a window over arrays and strings.',
    icon: 'RectangleHorizontal',
    sources: [
      { courseId: 'arrays', topicIds: ['sliding-window'] },
      { courseId: 'prep-sliding-window' },
    ],
  },
  {
    id: 'sorting',
    title: 'Sorting',
    summary: 'Comparison sorts, merge sort, quicksort, and heap sort.',
    icon: 'ArrowDownUp',
    sources: [{ courseId: 'arrays', topicIds: ['sorting'] }, { courseId: 'prep-sorting' }],
  },
  {
    id: 'intervals',
    title: 'Intervals',
    summary: 'Merge, insert, and schedule interval problems.',
    icon: 'CalendarRange',
    sources: [{ courseId: 'prep-intervals' }],
  },
  {
    id: 'prefix-sum',
    title: 'Prefix Sum',
    summary: 'Precompute cumulative sums for range queries.',
    icon: 'Sigma',
    sources: [{ courseId: 'prep-prefix-sum' }],
  },
  {
    id: 'math',
    title: 'Math',
    summary: 'Number theory, combinatorics, and arithmetic tricks.',
    icon: 'Sigma',
    sources: [{ courseId: 'prep-math' }],
  },
  {
    id: 'streams-io',
    title: 'Streams & I/O',
    summary: 'Merge streams, iterators, and sequential data.',
    icon: 'Waves',
    sources: [{ courseId: 'prep-streams-io' }],
  },

  // —— Design ——
  {
    id: 'design',
    title: 'System Design',
    summary: 'Design data structures and APIs for real-world systems.',
    icon: 'Boxes',
    sources: [{ courseId: 'prep-design' }],
  },

  // —— Go (Senior) —— one category per Go course topic, generated from the course.
  ...goBrowseCategories.map((c): BrowseCategory => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    icon: c.icon,
    sources: [{ courseId: GO_COURSE_ID, topicIds: [c.courseTopicId] }],
  })),

  // —— OpenRTB —— one category per OpenRTB course topic, generated from the course.
  ...openrtbBrowseCategories.map((c): BrowseCategory => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    icon: c.icon,
    sources: [{ courseId: OPENRTB_COURSE_ID, topicIds: [c.courseTopicId] }],
  })),
];

const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategoryById(id: string): BrowseCategory | undefined {
  return categoryById.get(normalizeId(id));
}

export function getAllCategories(): BrowseCategory[] {
  return CATEGORIES.slice();
}

/* ------------------------------------------------------------------ tracks */

const DS_IDS = [
  'arrays',
  'strings',
  'hash-maps',
  'linked-lists',
  'stacks-queues',
  'trees',
  'tries',
  'heaps',
  'matrices',
  'database',
] as const;

const ALG_IDS = [
  'backtracking',
  'graphs',
  'binary-search',
  'dynamic-programming',
  'greedy',
  'sliding-window',
  'sorting',
  'intervals',
  'prefix-sum',
  'math',
  'streams-io',
] as const;

const DESIGN_IDS = ['design'] as const;

const GO_IDS = goBrowseCategories.map((c) => c.id);
const OPENRTB_IDS = openrtbBrowseCategories.map((c) => c.id);

const TRACKS: BrowseTrack[] = [
  {
    id: 'data-structures',
    title: 'Data Structures',
    summary: 'Arrays, trees, heaps, linked lists, and core structures.',
    icon: 'ListTree',
    categoryIds: [...DS_IDS],
  },
  {
    id: 'algorithms',
    title: 'Algorithms',
    summary: 'Graphs, DP, backtracking, binary search, and techniques.',
    icon: 'Network',
    categoryIds: [...ALG_IDS],
  },
  {
    id: 'design',
    title: 'Design',
    summary: 'System design and object-oriented data structure APIs.',
    icon: 'Boxes',
    categoryIds: [...DESIGN_IDS],
  },
  {
    id: 'go',
    title: 'Go — Senior Developer',
    summary: 'Concurrency, runtime & memory, generics, and system design in Go.',
    icon: 'Boxes',
    categoryIds: [...GO_IDS],
  },
  {
    id: 'openrtb',
    title: 'OpenRTB & Ad Platform Engineering',
    summary: 'Programmatic ads, OpenRTB 2.6, bidder/exchange, tracking, and privacy in Go.',
    icon: 'Megaphone',
    categoryIds: [...OPENRTB_IDS],
  },
  {
    id: 'interview-prep',
    title: 'Interview Preparation',
    summary: 'Every category — browse all problems by topic.',
    icon: 'Target',
    categoryIds: [...DS_IDS, ...ALG_IDS, ...DESIGN_IDS, ...GO_IDS, ...OPENRTB_IDS],
  },
];

const trackById = new Map(TRACKS.map((t) => [t.id, t]));

export function getTracks(): BrowseTrack[] {
  return TRACKS.slice();
}

export function getTrackById(id: TrackId): BrowseTrack | undefined {
  return trackById.get(normalizeId(id) as TrackId);
}

export function getCategoriesForTrack(trackId: TrackId): BrowseCategory[] {
  const track = getTrackById(trackId);
  if (!track) return [];
  return track.categoryIds
    .map((id) => categoryById.get(id))
    .filter((c): c is BrowseCategory => c != null);
}

/* ---------------------------------------------------- prerequisite unlock graph */

/** Directed edges: prerequisite category → dependent category within a track. */
export const CATEGORY_UNLOCK_EDGES: ReadonlyArray<readonly [string, string]> = [
  ['arrays', 'strings'],
  ['strings', 'hash-maps'],
  ['hash-maps', 'linked-lists'],
  ['linked-lists', 'stacks-queues'],
  ['stacks-queues', 'trees'],
  ['trees', 'tries'],
  ['tries', 'heaps'],
  ['arrays', 'sliding-window'],
  ['arrays', 'sorting'],
  ['sorting', 'binary-search'],
  ['binary-search', 'dynamic-programming'],
  ['graphs', 'backtracking'],
  ['backtracking', 'greedy'],
  ['prefix-sum', 'intervals'],
  ['dynamic-programming', 'design'],
] as const;

const categoryPrereqsById = new Map<string, string[]>();
for (const [from, to] of CATEGORY_UNLOCK_EDGES) {
  const list = categoryPrereqsById.get(to) ?? [];
  list.push(from);
  categoryPrereqsById.set(to, list);
}

export interface UnlockGraphNode {
  id: string;
  prereqs: string[];
}

/** Build an item-id → prerequisite-item-ids adjacency list from catalog items. */
export function buildProblemUnlockGraph(
  items: ReadonlyArray<{ id: string; prereqs: readonly string[] }>,
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const item of items) {
    const id = normalizeId(item.id);
    graph.set(id, Array.from(new Set(item.prereqs.map(normalizeId).filter((p) => p && p !== id))));
  }
  return graph;
}

/** Category ids that must be explored before `categoryId` (transitive closure). */
export function getCategoryPrerequisites(categoryId: string): string[] {
  const seen = new Set<string>();
  const stack = [...(categoryPrereqsById.get(normalizeId(categoryId)) ?? [])];
  const out: string[] = [];
  while (stack.length) {
    const id = stack.pop();
    if (!id) break;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    stack.push(...(categoryPrereqsById.get(id) ?? []));
  }
  return out;
}

export type MasteryLookup = (itemId: string) => boolean;

/** True when every explicit item prereq is mastered (or there are none). */
export function isItemUnlocked(
  itemId: string,
  graph: Map<string, string[]>,
  isMastered: MasteryLookup,
): boolean {
  const prereqs = graph.get(normalizeId(itemId)) ?? [];
  return prereqs.every((p) => isMastered(p));
}

/** Item ids blocking unlock for `itemId`. */
export function getUnmetPrerequisites(
  itemId: string,
  graph: Map<string, string[]>,
  isMastered: MasteryLookup,
): string[] {
  return (graph.get(normalizeId(itemId)) ?? []).filter((p) => !isMastered(p));
}

/** True when every problem in prerequisite categories is mastered. */
export function isCategoryUnlocked(
  categoryId: string,
  itemsInCategory: (categoryId: string) => ReadonlyArray<{ id: string }>,
  isMastered: MasteryLookup,
): boolean {
  for (const catId of getCategoryPrerequisites(categoryId)) {
    const items = itemsInCategory(catId);
    if (items.some((it) => !isMastered(it.id))) return false;
  }
  return true;
}

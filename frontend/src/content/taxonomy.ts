import {
  GO_COURSE_ID,
  GO_BROWSE_CATEGORIES as goBrowseCategories,
  OPENRTB_COURSE_ID,
  OPENRTB_BROWSE_CATEGORIES as openrtbBrowseCategories,
} from '@/plugins/_generated/courses';

/** Top-level browse tracks — the entry points for organizing content. */
export type TrackId =
  | 'data-structures'
  | 'algorithms'
  | 'design'
  | 'go'
  | 'openrtb'
  | 'interview-prep';

export interface BrowseCategorySource {
  courseId: string;
  /** When set, only include these topics from the course; otherwise all topics. */
  topicIds?: string[];
}

export interface BrowseCategory {
  id: string;
  title: string;
  summary?: string;
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

export function browseTopicId(categoryId: string): string {
  return `${BROWSE_TOPIC_PREFIX}${categoryId}`;
}

export function isBrowseTopicId(topicId: string): boolean {
  return topicId.startsWith(BROWSE_TOPIC_PREFIX);
}

export function categoryIdFromBrowseTopic(topicId: string): string | undefined {
  return isBrowseTopicId(topicId) ? topicId.slice(BROWSE_TOPIC_PREFIX.length) : undefined;
}

/* ---------------------------------------------------------------- categories */

const CATEGORIES: BrowseCategory[] = [
  // —— Data Structures ——
  {
    id: 'arrays',
    title: 'Arrays',
    summary: 'Searching, two pointers, and array manipulation.',
    icon: 'Table',
    sources: [
      { courseId: 'arrays', topicIds: ['searching'] },
      { courseId: 'prep-arrays' },
    ],
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
    icon: 'GitBranch',
    sources: [{ courseId: 'backtracking' }],
  },
  {
    id: 'graphs',
    title: 'Graphs',
    summary: 'Traverse, colour, order, and search weighted graphs.',
    icon: 'Network',
    sources: [{ courseId: 'graphs' }],
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    summary: 'Halve the search space on sorted data.',
    icon: 'Search',
    sources: [{ courseId: 'binary-search' }],
  },
  {
    id: 'dynamic-programming',
    title: 'Dynamic Programming',
    summary: 'Tabulate overlapping subproblems for optimal answers.',
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
    sources: [
      { courseId: 'arrays', topicIds: ['sorting'] },
      { courseId: 'prep-sorting' },
    ],
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
  ...goBrowseCategories.map(
    (c): BrowseCategory => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      icon: c.icon,
      sources: [{ courseId: GO_COURSE_ID, topicIds: [c.courseTopicId] }],
    }),
  ),

  // —— OpenRTB —— one category per OpenRTB course topic, generated from the course.
  ...openrtbBrowseCategories.map(
    (c): BrowseCategory => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      icon: c.icon,
      sources: [{ courseId: OPENRTB_COURSE_ID, topicIds: [c.courseTopicId] }],
    }),
  ),
];

const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategoryById(id: string): BrowseCategory | undefined {
  return categoryById.get(id);
}

export function getAllCategories(): BrowseCategory[] {
  return CATEGORIES;
}

/* ------------------------------------------------------------------ tracks */

const DS_IDS = [
  'arrays', 'strings', 'hash-maps', 'linked-lists', 'stacks-queues',
  'trees', 'tries', 'heaps', 'matrices', 'database',
] as const;

const ALG_IDS = [
  'backtracking', 'graphs', 'binary-search', 'dynamic-programming', 'greedy',
  'sliding-window', 'sorting', 'intervals', 'prefix-sum', 'math', 'streams-io',
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
  return TRACKS;
}

export function getTrackById(id: TrackId): BrowseTrack | undefined {
  return trackById.get(id);
}

export function getCategoriesForTrack(trackId: TrackId): BrowseCategory[] {
  const track = trackById.get(trackId);
  if (!track) return [];
  return track.categoryIds
    .map((id) => categoryById.get(id))
    .filter((c): c is BrowseCategory => c != null);
}

import {
  ArrowLeftRight,
  Binary,
  Boxes,
  CalendarClock,
  Crown,
  Keyboard,
  Layers,
  Link2,
  ListMusic,
  Coins,
  Route,
  Waves,
  Network,
  type LucideIcon,
} from 'lucide-react';

export type DojoGameStatus = 'live' | 'soon';

export interface DojoGameMeta {
  id: string;
  title: string;
  /** One-line pitch shown on the hub card. */
  tagline: string;
  /** The algorithm concept the game drills. */
  concept: string;
  icon: LucideIcon;
  status: DojoGameStatus;
  /** Total levels — used for hub progress; must match the game's level list. */
  levelCount: number;
  /** Card accent gradient stops. */
  c1: string;
  c2: string;
}

/**
 * The Dojo Hub catalog. The Vim Dojo keeps its own /vim route and progress
 * store; every other live game lives under /dojo#g/{id} with progress in
 * getDojoProgressStore(id). `levelCount` is the hub's single knob per game —
 * keep it in sync with the game's LEVEL_IDS.
 */
export const DOJO_GAMES: DojoGameMeta[] = [
  {
    id: 'vim',
    title: 'Vim Dojo',
    tagline: 'Escape mazes with Vim motions',
    concept: 'Keyboard efficiency',
    icon: Keyboard,
    status: 'live',
    levelCount: 12,
    c1: '#ff4d94',
    c2: '#7c3aed',
  },
  {
    id: 'backtrack',
    title: 'Queens Court',
    tagline: 'Place queens, hit dead ends, backtrack',
    concept: 'Backtracking (N-Queens)',
    icon: Crown,
    status: 'live',
    levelCount: 5,
    c1: '#f59e0b',
    c2: '#ef4444',
  },
  {
    id: 'toposort',
    title: 'Melody Machine',
    tagline: 'Unlock notes in dependency order',
    concept: 'Topological sort (Kahn’s)',
    icon: ListMusic,
    status: 'live',
    levelCount: 6,
    c1: '#22c55e',
    c2: '#0ea5e9',
  },
  {
    id: 'binary-search',
    title: 'Bisect',
    tagline: 'Halve the haystack until it sings',
    concept: 'Binary search',
    icon: Binary,
    status: 'live',
    levelCount: 5,
    c1: '#6366f1',
    c2: '#0ea5e9',
  },
  {
    id: 'two-pointers',
    title: 'Pincer',
    tagline: 'Squeeze the answer from both ends',
    concept: 'Two pointers',
    icon: ArrowLeftRight,
    status: 'live',
    levelCount: 5,
    c1: '#14b8a6',
    c2: '#22c55e',
  },
  {
    id: 'sliding-window',
    title: 'Window Shopper',
    tagline: 'Grow and shrink the perfect window',
    concept: 'Sliding window',
    icon: Waves,
    status: 'live',
    levelCount: 5,
    c1: '#f97316',
    c2: '#eab308',
  },
  {
    id: 'bfs-flood',
    title: 'Flood Gate',
    tagline: 'Ripple outward level by level',
    concept: 'BFS / flood fill',
    icon: Network,
    status: 'live',
    levelCount: 5,
    c1: '#0ea5e9',
    c2: '#6366f1',
  },
  {
    id: 'heap',
    title: 'Top of the Heap',
    tagline: 'Sift, pop, and keep the best on top',
    concept: 'Heaps / priority queues',
    icon: Boxes,
    status: 'live',
    levelCount: 5,
    c1: '#a855f7',
    c2: '#ec4899',
  },
  {
    id: 'dp-coins',
    title: 'Coin Forge',
    tagline: 'Build big answers from small ones',
    concept: 'Dynamic programming',
    icon: Coins,
    status: 'live',
    levelCount: 5,
    c1: '#eab308',
    c2: '#f59e0b',
  },
  {
    id: 'union-find',
    title: 'Bridge Builder',
    tagline: 'Merge islands, spot the cycles',
    concept: 'Union-Find (DSU)',
    icon: Link2,
    status: 'live',
    levelCount: 5,
    c1: '#06b6d4',
    c2: '#3b82f6',
  },
  {
    id: 'mono-stack',
    title: 'Skyline Stack',
    tagline: 'Pop the short, push the tall',
    concept: 'Monotonic stack',
    icon: Layers,
    status: 'live',
    levelCount: 5,
    c1: '#8b5cf6',
    c2: '#d946ef',
  },
  {
    id: 'greedy-intervals',
    title: 'Meeting Mania',
    tagline: 'Book the meeting that ends first',
    concept: 'Greedy (interval scheduling)',
    icon: CalendarClock,
    status: 'live',
    levelCount: 5,
    c1: '#f43f5e',
    c2: '#f97316',
  },
  {
    id: 'dijkstra',
    title: 'Signal Runner',
    tagline: 'Settle the closest node first',
    concept: 'Dijkstra shortest path',
    icon: Route,
    status: 'live',
    levelCount: 5,
    c1: '#10b981',
    c2: '#14b8a6',
  },
];

export function getDojoGame(id: string): DojoGameMeta | undefined {
  return DOJO_GAMES.find((g) => g.id === id);
}

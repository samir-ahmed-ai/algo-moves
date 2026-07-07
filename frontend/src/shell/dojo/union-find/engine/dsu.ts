export interface UfIsland {
  key: string;
  label: string;
}

export type UfOpType = 'connected' | 'union' | 'edge';

export interface UfOp {
  type: UfOpType;
  a: number;
  b: number;
}

export interface UfLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  par: number;
  islands: UfIsland[];
  preBridges: [number, number][];
  ops: UfOp[];
}

export interface DsuState {
  parent: number[];
  size: number[];
}

export function createDsu(n: number): DsuState {
  return {
    parent: Array.from({ length: n }, (_, i) => i),
    size: Array.from({ length: n }, () => 1),
  };
}

/** Follow parent pointers up until a node points to itself — the root. */
export function find(parent: number[], x: number): number {
  let r = x;
  while (parent[r] !== r) r = parent[r];
  return r;
}

export function rootOf(state: DsuState, x: number): number {
  return find(state.parent, x);
}

export function isConnected(state: DsuState, a: number, b: number): boolean {
  return rootOf(state, a) === rootOf(state, b);
}

export function componentSize(state: DsuState, x: number): number {
  return state.size[rootOf(state, x)];
}

/**
 * Union by size: which root should become the new parent when uniting a and
 * b. Returns the root of the larger tree (tie → a's root), or null when a and
 * b are already in the same tree.
 */
export function unionBySizeParent(state: DsuState, a: number, b: number): number | null {
  const ra = rootOf(state, a);
  const rb = rootOf(state, b);
  if (ra === rb) return null;
  return state.size[rb] > state.size[ra] ? rb : ra;
}

/** Hang `loser`'s tree under `winner` (both must be roots). Immutable. */
export function applyUnionWithParent(state: DsuState, winner: number, loser: number): DsuState {
  const parent = [...state.parent];
  const size = [...state.size];
  parent[loser] = winner;
  size[winner] += size[loser];
  return { parent, size };
}

/** Union by size with the canonical winner; no-op when already connected. */
export function applyUnion(state: DsuState, a: number, b: number): DsuState {
  const winner = unionBySizeParent(state, a, b);
  if (winner == null) return state;
  const ra = rootOf(state, a);
  const rb = rootOf(state, b);
  return applyUnionWithParent(state, winner, winner === ra ? rb : ra);
}

/** Starting DSU for a level: pre-built bridges applied by union-by-size. */
export function createLevelDsu(level: UfLevel): DsuState {
  let state = createDsu(level.islands.length);
  for (const [a, b] of level.preBridges) state = applyUnion(state, a, b);
  return state;
}

export type UnionJudgement =
  | { ok: true; winner: number; loser: number }
  | { ok: false; reason: 'outside' }
  | { ok: false; reason: 'not-root'; root: number }
  | { ok: false; reason: 'smaller'; pressedSize: number; otherRoot: number; otherSize: number };

/**
 * Judge the island pressed as the new parent for union(a, b). Valid presses
 * are the root of the larger tree, or either root on a size tie.
 */
export function judgeUnionPress(
  state: DsuState,
  a: number,
  b: number,
  pressed: number,
): UnionJudgement {
  const ra = rootOf(state, a);
  const rb = rootOf(state, b);
  const rp = rootOf(state, pressed);
  if (rp !== ra && rp !== rb) return { ok: false, reason: 'outside' };
  if (pressed !== rp) return { ok: false, reason: 'not-root', root: rp };
  const other = rp === ra ? rb : ra;
  if (state.size[rp] < state.size[other]) {
    return {
      ok: false,
      reason: 'smaller',
      pressedSize: state.size[rp],
      otherRoot: other,
      otherSize: state.size[other],
    };
  }
  return { ok: true, winner: rp, loser: other };
}

/** The correct keypress for a Kruskal edge op: skip cycles, build the rest. */
export function edgeAnswer(state: DsuState, a: number, b: number): 'c' | 'u' {
  return isConnected(state, a, b) ? 'c' : 'u';
}

export function levelHasOpType(level: UfLevel, type: UfOpType): boolean {
  return level.ops.some((op) => op.type === type);
}

const NAMES = ['Bay', 'Cove', 'Reef', 'Dune', 'Palm', 'Rock', 'Fern', 'Mist', 'Kelp'];

function islands(n: number): UfIsland[] {
  return NAMES.slice(0, n).map((label, i) => ({ key: String(i + 1), label }));
}

export const LEVELS: UfLevel[] = [
  {
    id: 'uf-01',
    title: "Who's your root?",
    objective: 'Answer five connected(a, b)? queries about the pre-built bridges.',
    lesson:
      'Every island points to a parent; follow parents up until one points to itself — that island is the root (it wears the crown). Two islands are connected exactly when they climb to the same root, no matter how far apart they sit.',
    par: 5,
    islands: islands(6),
    preBridges: [
      [0, 1],
      [1, 2],
      [3, 4],
    ],
    ops: [
      { type: 'connected', a: 1, b: 2 },
      { type: 'connected', a: 2, b: 3 },
      { type: 'connected', a: 4, b: 3 },
      { type: 'connected', a: 5, b: 0 },
      { type: 'connected', a: 0, b: 2 },
    ],
  },
  {
    id: 'uf-02',
    title: 'Little under big',
    objective: 'Perform four unions, always picking the root that keeps trees shallow.',
    lesson:
      'When two trees merge, one root must adopt the other. Union by size hangs the SMALLER tree under the BIGGER root, so no island drifts far from its root and find stays fast. On a size tie, either root works.',
    par: 4,
    islands: islands(7),
    preBridges: [
      [0, 1],
      [1, 2],
    ],
    ops: [
      { type: 'union', a: 3, b: 4 },
      { type: 'union', a: 0, b: 3 },
      { type: 'union', a: 5, b: 6 },
      { type: 'union', a: 6, b: 0 },
    ],
  },
  {
    id: 'uf-03',
    title: 'Mixed harbor',
    objective: 'Work the harbor log: queries and unions, interleaved.',
    lesson:
      'Real union–find alternates find and union. Answer each connected(a, b)? by comparing roots, and remember unions change the answer — two islands that were strangers a moment ago may now share a root.',
    par: 8,
    islands: islands(8),
    preBridges: [
      [0, 1],
      [1, 2],
      [4, 5],
    ],
    ops: [
      { type: 'connected', a: 2, b: 0 },
      { type: 'connected', a: 3, b: 4 },
      { type: 'union', a: 3, b: 4 },
      { type: 'connected', a: 5, b: 3 },
      { type: 'union', a: 6, b: 7 },
      { type: 'union', a: 6, b: 0 },
      { type: 'connected', a: 7, b: 2 },
      { type: 'union', a: 4, b: 0 },
    ],
  },
  {
    id: 'uf-04',
    title: 'The redundant bridge',
    objective: 'Process six proposed bridges: build the useful ones, skip the cycles.',
    lesson:
      "An edge between two islands that already share a root adds nothing — it would only close a cycle. That is Kruskal's insight: sort edges, then union–find tells you in O(α) which edges to keep and which to throw away.",
    par: 6,
    islands: islands(5),
    preBridges: [],
    ops: [
      { type: 'edge', a: 0, b: 1 },
      { type: 'edge', a: 2, b: 3 },
      { type: 'edge', a: 0, b: 2 },
      { type: 'edge', a: 1, b: 3 },
      { type: 'edge', a: 3, b: 4 },
      { type: 'edge', a: 4, b: 0 },
    ],
  },
  {
    id: 'uf-05',
    title: 'Archipelago',
    objective: 'The boss log: ten mixed operations across nine islands.',
    lesson:
      'Everything at once: climb to roots for queries, pick the bigger root for unions, and skip edges that close cycles. Finish and you have run union–find — the engine inside Kruskal, connectivity checks, and percolation — entirely by hand.',
    par: 10,
    islands: islands(9),
    preBridges: [[0, 1]],
    ops: [
      { type: 'union', a: 2, b: 3 },
      { type: 'connected', a: 0, b: 3 },
      { type: 'edge', a: 1, b: 2 },
      { type: 'connected', a: 0, b: 3 },
      { type: 'union', a: 4, b: 5 },
      { type: 'edge', a: 4, b: 0 },
      { type: 'edge', a: 5, b: 1 },
      { type: 'union', a: 6, b: 7 },
      { type: 'union', a: 8, b: 6 },
      { type: 'edge', a: 7, b: 0 },
    ],
  },
];

export const LEVEL_IDS: string[] = LEVELS.map((l) => l.id);

export function getLevel(id: string): UfLevel | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((l) => l.id === currentId);
  if (idx < 0 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1].id;
}

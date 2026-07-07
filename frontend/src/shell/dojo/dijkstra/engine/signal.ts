/**
 * Pure Dijkstra engine for the Signal Runner dojo game.
 * The player settles the closest unsettled node one keypress at a time;
 * relaxation of out-edges is automatic. All rules, the reference run,
 * predecessor traceback and the level catalog live here so the React
 * layer stays a thin shell.
 */

export interface SignalNode {
  /** Keycap digit 1..9 — the key the player presses to settle this node. */
  key: number;
  name: string;
  /** Fixed coordinates inside the level's SVG viewBox. */
  x: number;
  y: number;
}

/** Undirected weighted edge between node keys `a` and `b`. */
export interface SignalEdge {
  a: number;
  b: number;
  w: number;
}

export interface SignalLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  nodes: SignalNode[];
  edges: SignalEdge[];
  source: number;
  target: number;
  par: number;
  /** SVG viewBox size. */
  view: { w: number; h: number };
}

export interface SignalState {
  /** Tentative distance per node key; Infinity until the signal reaches it. */
  dist: Record<number, number>;
  /** Predecessor per node key on the current best route (null = none). */
  pred: Record<number, number | null>;
  /** Node keys in the order the player settled them. */
  settled: number[];
}

export const LEVELS: SignalLevel[] = [
  {
    id: 'dj-01',
    title: 'Straight wire',
    objective: 'Relay the signal from Base to Dish — settle every node in distance order.',
    lesson:
      'Dijkstra grows a frontier of settled nodes. At every step, one node is safe to lock in: the unsettled node with the SMALLEST tentative distance. With no negative edges, no route discovered later can undercut it — any detour must first leave the settled set through a node that is already farther. Settle it, and its edges relax the neighbors automatically.',
    nodes: [
      { key: 1, name: 'Base', x: 55, y: 100 },
      { key: 2, name: 'Relay', x: 155, y: 100 },
      { key: 3, name: 'Tower', x: 255, y: 100 },
      { key: 4, name: 'Dish', x: 355, y: 100 },
    ],
    edges: [
      { a: 1, b: 2, w: 2 },
      { a: 2, b: 3, w: 3 },
      { a: 3, b: 4, w: 4 },
    ],
    source: 1,
    target: 4,
    par: 4,
    view: { w: 410, h: 175 },
  },
  {
    id: 'dj-02',
    title: 'The tempting shortcut',
    objective: 'The direct wire costs 9 — prove the 2-hop detour at 5 is cheaper.',
    lesson:
      "Watch the Dish's label: settling Base writes 9 on it via the direct wire, but Dijkstra does NOT settle it yet — 9 is only tentative. Settling Hop (dist 2) relaxes Hop→Dish and the label improves to 5 BEFORE the Dish ever settles. A node's distance is only final at the moment it becomes the closest unsettled node; until then, better routes keep overwriting it.",
    nodes: [
      { key: 1, name: 'Base', x: 55, y: 105 },
      { key: 2, name: 'Hop', x: 200, y: 40 },
      { key: 3, name: 'Loop', x: 200, y: 175 },
      { key: 4, name: 'Dish', x: 350, y: 105 },
    ],
    edges: [
      { a: 1, b: 4, w: 9 },
      { a: 1, b: 2, w: 2 },
      { a: 2, b: 4, w: 3 },
      { a: 1, b: 3, w: 4 },
      { a: 3, b: 4, w: 4 },
    ],
    source: 1,
    target: 4,
    par: 4,
    view: { w: 410, h: 250 },
  },
  {
    id: 'dj-03',
    title: 'Branching signal',
    objective:
      'Two routes race to the Dish — settle in distance order and let the cheaper one win.',
    lesson:
      'The frontier hops between branches: North (dist 1) settles before South (dist 2), yet both routes stay alive — Dijkstra never commits to a path, only to distances. Note that Marsh (dist 9) never needs settling: the Dish locks in at 8 first, and everything farther than the target is irrelevant. You can stop the moment the target settles.',
    nodes: [
      { key: 1, name: 'Base', x: 48, y: 110 },
      { key: 2, name: 'North', x: 165, y: 45 },
      { key: 3, name: 'South', x: 165, y: 175 },
      { key: 4, name: 'Ridge', x: 285, y: 45 },
      { key: 5, name: 'Marsh', x: 285, y: 175 },
      { key: 6, name: 'Dish', x: 372, y: 110 },
    ],
    edges: [
      { a: 1, b: 2, w: 1 },
      { a: 2, b: 4, w: 4 },
      { a: 4, b: 6, w: 3 },
      { a: 1, b: 3, w: 2 },
      { a: 3, b: 5, w: 7 },
      { a: 5, b: 6, w: 5 },
    ],
    source: 1,
    target: 6,
    par: 5,
    view: { w: 420, h: 250 },
  },
  {
    id: 'dj-04',
    title: 'False friend',
    objective:
      'The cheapest first hop leads nowhere good — trust distances, not first impressions.',
    lesson:
      "Bait costs only 1, so it settles first — and that's fine! Settling a node never commits you to routing through it; it only fixes that node's own distance. Bait's continuation is brutal (9 + 9), so the frontier quietly abandons that branch: Grove, Pass and Vale settle at 3, 5 and 7 while Cliff sits at 10, and the Dish locks in at 9 through the long way around. Greedy on distances, never on edges.",
    nodes: [
      { key: 1, name: 'Base', x: 48, y: 110 },
      { key: 2, name: 'Bait', x: 150, y: 40 },
      { key: 5, name: 'Cliff', x: 270, y: 40 },
      { key: 7, name: 'Dish', x: 372, y: 110 },
      { key: 3, name: 'Grove', x: 130, y: 180 },
      { key: 4, name: 'Pass', x: 215, y: 180 },
      { key: 6, name: 'Vale', x: 300, y: 180 },
    ],
    edges: [
      { a: 1, b: 2, w: 1 },
      { a: 2, b: 5, w: 9 },
      { a: 5, b: 7, w: 9 },
      { a: 1, b: 3, w: 3 },
      { a: 3, b: 4, w: 2 },
      { a: 4, b: 6, w: 2 },
      { a: 6, b: 7, w: 2 },
    ],
    source: 1,
    target: 7,
    par: 6,
    view: { w: 420, h: 250 },
  },
  {
    id: 'dj-05',
    title: 'The grid',
    objective: 'Nine stations, tied distances — run the full algorithm across the grid.',
    lesson:
      'Ties are harmless: when two unsettled nodes share the smallest distance, either is safe — no route through one can shorten the other, since every connecting edge only adds weight. Elm and Fir tie at 2, Ivy and Yew tie at 7; pick whichever you like. Two corners (Oak and Ash, both at 10) sit beyond the Dish at 9 and never need settling at all.',
    nodes: [
      { key: 1, name: 'Base', x: 70, y: 45 },
      { key: 2, name: 'Elm', x: 210, y: 45 },
      { key: 3, name: 'Oak', x: 350, y: 45 },
      { key: 4, name: 'Fir', x: 70, y: 125 },
      { key: 5, name: 'Hub', x: 210, y: 125 },
      { key: 6, name: 'Ivy', x: 350, y: 125 },
      { key: 7, name: 'Ash', x: 70, y: 205 },
      { key: 8, name: 'Yew', x: 210, y: 205 },
      { key: 9, name: 'Dish', x: 350, y: 205 },
    ],
    edges: [
      { a: 1, b: 2, w: 2 },
      { a: 1, b: 4, w: 2 },
      { a: 2, b: 3, w: 9 },
      { a: 2, b: 5, w: 3 },
      { a: 3, b: 6, w: 3 },
      { a: 4, b: 5, w: 3 },
      { a: 4, b: 7, w: 12 },
      { a: 5, b: 6, w: 2 },
      { a: 5, b: 8, w: 2 },
      { a: 6, b: 9, w: 2 },
      { a: 7, b: 8, w: 3 },
      { a: 8, b: 9, w: 4 },
    ],
    source: 1,
    target: 9,
    par: 7,
    view: { w: 420, h: 285 },
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): SignalLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

export function getNode(level: SignalLevel, key: number): SignalNode | undefined {
  return level.nodes.find((node) => node.key === key);
}

/** Canonical undirected edge id, order-insensitive. */
export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function neighbors(level: SignalLevel, key: number): { to: number; w: number }[] {
  const out: { to: number; w: number }[] = [];
  for (const e of level.edges) {
    if (e.a === key) out.push({ to: e.b, w: e.w });
    else if (e.b === key) out.push({ to: e.a, w: e.w });
  }
  return out;
}

export function createState(level: SignalLevel): SignalState {
  const dist: Record<number, number> = {};
  const pred: Record<number, number | null> = {};
  for (const node of level.nodes) {
    dist[node.key] = node.key === level.source ? 0 : Infinity;
    pred[node.key] = null;
  }
  return { dist, pred, settled: [] };
}

export function isSettled(state: SignalState, key: number): boolean {
  return state.settled.includes(key);
}

/**
 * The set of unsettled nodes with the smallest FINITE tentative distance —
 * every one of them is a legal settle (ties are interchangeable).
 */
export function minUnsettled(
  level: SignalLevel,
  state: SignalState,
): { keys: number[]; dist: number } | null {
  let best = Infinity;
  let keys: number[] = [];
  for (const node of level.nodes) {
    if (isSettled(state, node.key)) continue;
    const d = state.dist[node.key]!;
    if (d < best) {
      best = d;
      keys = [node.key];
    } else if (d === best && d !== Infinity) {
      keys.push(node.key);
    }
  }
  return best === Infinity ? null : { keys, dist: best };
}

/** One relaxation attempt of the edge settled→to, recorded for the UI flash. */
export interface Relaxation {
  from: number;
  to: number;
  w: number;
  oldDist: number;
  newDist: number;
  improved: boolean;
}

export type SettleResult =
  | { ok: true; state: SignalState; relaxations: Relaxation[] }
  /** Pressing a settled node is a no-op, not a mistake. */
  | { ok: false; reason: 'settled' }
  /** dist = ∞ — the signal has not reached this node yet. */
  | { ok: false; reason: 'unreached'; minKey: number; minDist: number }
  /** Reached, but not the closest unsettled node. */
  | { ok: false; reason: 'notMin'; dist: number; minKey: number; minDist: number };

export function settleNode(level: SignalLevel, state: SignalState, key: number): SettleResult {
  if (isSettled(state, key)) return { ok: false, reason: 'settled' };
  const min = minUnsettled(level, state);
  if (!min) return { ok: false, reason: 'settled' }; // unreachable in valid levels
  if (state.dist[key] === Infinity) {
    return { ok: false, reason: 'unreached', minKey: min.keys[0]!, minDist: min.dist };
  }
  if (!min.keys.includes(key)) {
    return {
      ok: false,
      reason: 'notMin',
      dist: state.dist[key]!,
      minKey: min.keys[0]!,
      minDist: min.dist,
    };
  }

  const dist = { ...state.dist };
  const pred = { ...state.pred };
  const settled = [...state.settled, key];
  const relaxations: Relaxation[] = [];
  for (const { to, w } of neighbors(level, key)) {
    if (settled.includes(to)) continue;
    const oldDist = dist[to]!;
    const candidate = dist[key]! + w;
    const improved = candidate < oldDist;
    if (improved) {
      dist[to] = candidate;
      pred[to] = key;
    }
    relaxations.push({
      from: key,
      to,
      w,
      oldDist,
      newDist: improved ? candidate : oldDist,
      improved,
    });
  }
  return { ok: true, state: { dist, pred, settled }, relaxations };
}

export function isComplete(level: SignalLevel, state: SignalState): boolean {
  return isSettled(state, level.target);
}

/** Predecessor traceback from the target: node keys source→target. */
export function shortestPath(level: SignalLevel, state: SignalState): number[] {
  const path: number[] = [];
  let cur: number | null = level.target;
  for (let guard = 0; cur != null && guard <= level.nodes.length; guard++) {
    path.push(cur);
    cur = state.pred[cur] ?? null;
  }
  path.reverse();
  return path[0] === level.source ? path : [];
}

/** Edge ids along the shortest path, for the completion highlight. */
export function shortestPathEdges(level: SignalLevel, state: SignalState): Set<string> {
  const path = shortestPath(level, state);
  const ids = new Set<string>();
  for (let i = 1; i < path.length; i++) ids.add(edgeKey(path[i - 1]!, path[i]!));
  return ids;
}

export interface ReferenceRun {
  /** Settle order until (and including) the target — its length is par. */
  order: number[];
  state: SignalState;
}

/**
 * The textbook run: repeatedly settle the closest unsettled node (ties broken
 * by smallest key) until the target settles. Every step goes through the same
 * settleNode rules the player faces.
 */
export function referenceRun(level: SignalLevel): ReferenceRun {
  let state = createState(level);
  const order: number[] = [];
  for (let guard = 0; guard <= level.nodes.length; guard++) {
    if (isComplete(level, state)) return { order, state };
    const min = minUnsettled(level, state);
    if (!min) break;
    const key = Math.min(...min.keys);
    const result = settleNode(level, state, key);
    if (!result.ok) break;
    state = result.state;
    order.push(key);
  }
  throw new Error(`reference run failed to reach the target for ${level.id}`);
}

export interface TopoNode {
  key: string;
  label: string;
}

export type TopoEdge = [number, number];

export interface TopoLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  cyclic?: boolean;
  par: number;
  nodes: TopoNode[];
  edges: TopoEdge[];
}

export interface TopoPlayState {
  level: TopoLevel;
  locked: number[];
}

export function createPlayState(level: TopoLevel): TopoPlayState {
  return { level, locked: [] };
}

/** Remaining in-degree per node, counting only edges between unlocked nodes. */
export function inDegrees(
  nodes: TopoNode[],
  edges: TopoEdge[],
  locked: ReadonlySet<number>,
): number[] {
  const degs = nodes.map(() => 0);
  for (const [from, to] of edges) {
    if (!locked.has(from) && !locked.has(to)) degs[to] += 1;
  }
  return degs;
}

/** Unlocked nodes with remaining in-degree 0 — Kahn's ready queue. */
export function readyIndices(
  nodes: TopoNode[],
  edges: TopoEdge[],
  locked: ReadonlySet<number>,
): number[] {
  const degs = inDegrees(nodes, edges, locked);
  return nodes.map((_, i) => i).filter((i) => !locked.has(i) && degs[i] === 0);
}

/** Lock a node if it is ready; otherwise return the state unchanged. */
export function lockNode(state: TopoPlayState, idx: number): TopoPlayState {
  const locked = new Set(state.locked);
  if (!readyIndices(state.level.nodes, state.level.edges, locked).includes(idx)) return state;
  return { ...state, locked: [...state.locked, idx] };
}

export function isComplete(state: TopoPlayState): boolean {
  return state.locked.length === state.level.nodes.length;
}

/** Queue empty while nodes remain — how Kahn's detects a cycle. */
export function isStuck(state: TopoPlayState): boolean {
  if (isComplete(state)) return false;
  return readyIndices(state.level.nodes, state.level.edges, new Set(state.locked)).length === 0;
}

/**
 * Longest path from any source, per node. Relaxation is bounded by node count
 * (with layers capped) so cyclic levels terminate with a usable layout.
 */
export function layerOf(nodes: TopoNode[], edges: TopoEdge[]): number[] {
  const cap = Math.max(0, nodes.length - 1);
  const layers = nodes.map(() => 0);
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    for (const [from, to] of edges) {
      const candidate = Math.min(layers[from] + 1, cap);
      if (candidate > layers[to]) {
        layers[to] = candidate;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return layers;
}

/** One prerequisite of `nodeIdx` that has not been locked yet, if any. */
export function unmetPrereq(state: TopoPlayState, nodeIdx: number): number | null {
  const locked = new Set(state.locked);
  for (const [from, to] of state.level.edges) {
    if (to === nodeIdx && !locked.has(from)) return from;
  }
  return null;
}

export const LEVELS: TopoLevel[] = [
  {
    id: 'ts-01',
    title: 'One after another',
    objective: 'Lock all three notes in dependency order.',
    lesson:
      'Each badge counts the prerequisites a note is still waiting on — its in-degree. Only a note with in-degree 0 is ready. Start where the count is zero, and locking it frees whatever depended on it.',
    par: 3,
    nodes: [
      { key: '1', label: 'do' },
      { key: '2', label: 're' },
      { key: '3', label: 'mi' },
    ],
    edges: [
      [0, 1],
      [1, 2],
    ],
  },
  {
    id: 'ts-02',
    title: 'The diamond',
    objective: 'Two paths split and rejoin — lock all four notes.',
    lesson:
      'After the opener, two notes are ready at once. Take either — several valid orders can exist, and every one of them is a correct topological order.',
    par: 4,
    nodes: [
      { key: '1', label: 'intro' },
      { key: '2', label: 'verse' },
      { key: '3', label: 'chorus' },
      { key: '4', label: 'finale' },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ],
  },
  {
    id: 'ts-03',
    title: 'Two melodies',
    objective: 'Two independent chains — lock all five notes.',
    lesson:
      'Disconnected parts of a graph never wait on each other. Ready notes from either chain can interleave freely, and any interleaving is still a valid order.',
    par: 5,
    nodes: [
      { key: '1', label: 'hum' },
      { key: '2', label: 'clap' },
      { key: '3', label: 'kick' },
      { key: '4', label: 'snare' },
      { key: '5', label: 'hat' },
    ],
    edges: [
      [0, 1],
      [2, 3],
      [3, 4],
    ],
  },
  {
    id: 'ts-04',
    title: 'Morning routine',
    objective: 'Get out the door — lock all six steps in a workable order.',
    lesson:
      "Real plans are DAGs. Kahn's algorithm is exactly what you're doing: repeatedly take anything with no remaining prerequisites until nothing is left.",
    par: 6,
    nodes: [
      { key: '1', label: 'wake' },
      { key: '2', label: 'coffee' },
      { key: '3', label: 'brush' },
      { key: '4', label: 'dress' },
      { key: '5', label: 'pack' },
      { key: '6', label: 'leave' },
    ],
    edges: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [1, 4],
      [3, 5],
      [4, 5],
    ],
  },
  {
    id: 'ts-05',
    title: 'Broken record',
    objective: 'Lock what you can, then diagnose why the rest never unlocks.',
    lesson:
      'When the ready queue is empty but notes remain, no valid order exists — the leftovers form a cycle. That is exactly how code detects one: Kahn’s finishes with fewer nodes locked than it started with.',
    cyclic: true,
    par: 3,
    nodes: [
      { key: '1', label: 'intro' },
      { key: '5', label: 'outro' },
      { key: '2', label: 'loop a' },
      { key: '3', label: 'loop b' },
      { key: '4', label: 'loop c' },
    ],
    edges: [
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 2],
      [0, 1],
    ],
  },
  {
    id: 'ts-06',
    title: 'Symphony',
    objective: 'The full arrangement — lock all eight parts.',
    lesson:
      "Bigger graph, same loop: find in-degree 0, lock it, decrement its neighbors, repeat. You've been running Kahn's algorithm by hand this whole time.",
    par: 8,
    nodes: [
      { key: '1', label: 'bass' },
      { key: '2', label: 'beat' },
      { key: '3', label: 'chords' },
      { key: '4', label: 'riff' },
      { key: '5', label: 'pads' },
      { key: '6', label: 'verse' },
      { key: '7', label: 'chorus' },
      { key: '8', label: 'finale' },
    ],
    edges: [
      [0, 2],
      [0, 3],
      [1, 3],
      [1, 4],
      [2, 5],
      [3, 5],
      [3, 6],
      [4, 6],
      [5, 7],
      [6, 7],
    ],
  },
];

export const LEVEL_IDS: string[] = LEVELS.map((l) => l.id);

export function getLevel(id: string): TopoLevel | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((l) => l.id === currentId);
  if (idx < 0 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1].id;
}

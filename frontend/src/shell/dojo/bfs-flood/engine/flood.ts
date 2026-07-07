/**
 * Pure BFS flood-fill engine for the Flood Gate dojo game.
 *
 * BFS is a QUEUE: the frontier holds discovered-but-unexpanded cells in FIFO
 * order, and the only correct move is to expand the HEAD — the oldest
 * discovery. Expanding a cell at distance d discovers its unvisited orthogonal
 * neighbors in the fixed order N, E, S, W and appends them to the TAIL at
 * distance d + 1. Distances therefore grow in rings: everything at distance d
 * is expanded before anything at d + 1.
 *
 * Star levels complete the moment the star is DISCOVERED (its distance is the
 * shortest-path length); starless levels complete on full flood — every
 * reachable cell discovered.
 */

export interface Cell {
  r: number;
  c: number;
}

/** Fixed neighbor discovery order: North, East, South, West. */
export const NEIGHBOR_ORDER: readonly Cell[] = [
  { r: -1, c: 0 },
  { r: 0, c: 1 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
];

export interface FloodLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  /** '#' wall, 'S' source (may repeat), '*' goal star, '.' floor. Max 7×7. */
  grid: readonly string[];
  par: number;
}

export interface ParsedGrid {
  rows: number;
  cols: number;
  walls: boolean[][];
  /** Sources in reading order (top-to-bottom, left-to-right). */
  sources: Cell[];
  star: Cell | null;
  /** Count of non-wall cells. */
  floorCount: number;
}

export function parseGrid(grid: readonly string[]): ParsedGrid {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < 1 || rows > 7 || cols < 1 || cols > 7) {
    throw new Error(`grid must be between 1×1 and 7×7, got ${rows}×${cols}`);
  }
  const walls: boolean[][] = [];
  const sources: Cell[] = [];
  let star: Cell | null = null;
  let floorCount = 0;
  for (let r = 0; r < rows; r++) {
    const row = grid[r]!;
    if (row.length !== cols) throw new Error(`grid row ${r} is not ${cols} chars wide`);
    walls.push([]);
    for (let c = 0; c < cols; c++) {
      const ch = row[c]!;
      if (ch !== '#' && ch !== 'S' && ch !== '*' && ch !== '.') {
        throw new Error(`unknown grid char '${ch}' at (${r},${c})`);
      }
      walls[r]!.push(ch === '#');
      if (ch !== '#') floorCount++;
      if (ch === 'S') sources.push({ r, c });
      if (ch === '*') {
        if (star) throw new Error('grid has more than one star');
        star = { r, c };
      }
    }
  }
  if (sources.length === 0) throw new Error('grid has no source');
  return { rows, cols, walls, sources, star, floorCount };
}

export interface FloodState {
  /** Shortest distance per cell; -1 = undiscovered or wall. */
  dist: number[][];
  /** FIFO frontier — discovered, unexpanded cells. Index 0 is the head. */
  queue: Cell[];
  /** Count of discovered floor cells (flooded + frontier). */
  discovered: number;
  starDiscovered: boolean;
}

/** Seeds every source into the queue at distance 0, in reading order. */
export function createState(parsed: ParsedGrid): FloodState {
  const dist = Array.from({ length: parsed.rows }, () => Array<number>(parsed.cols).fill(-1));
  const queue: Cell[] = [];
  for (const s of parsed.sources) {
    dist[s.r]![s.c] = 0;
    queue.push(s);
  }
  return {
    dist,
    queue,
    discovered: parsed.sources.length,
    starDiscovered: parsed.star != null && parsed.sources.some(isSame(parsed.star)),
  };
}

function isSame(a: Cell): (b: Cell) => boolean {
  return (b) => a.r === b.r && a.c === b.c;
}

export function isComplete(parsed: ParsedGrid, state: FloodState): boolean {
  return parsed.star ? state.starDiscovered : state.discovered === parsed.floorCount;
}

export type ExpandResult =
  | {
      ok: true;
      state: FloodState;
      expanded: Cell;
      expandedDist: number;
      /** Newly discovered cells, in N,E,S,W order, now at the tail. */
      discoveredCells: Cell[];
    }
  /**
   * empty — nothing left to expand; notHead — a frontier cell other than the
   * head was picked (BFS is FIFO); outOfRange — no cell holds that number.
   */
  | { ok: false; reason: 'empty' | 'notHead' | 'outOfRange' };

/** Expand the frontier cell at 1-based queue position `pos`. Only pos 1 is legal. */
export function expandAt(parsed: ParsedGrid, state: FloodState, pos: number): ExpandResult {
  if (state.queue.length === 0) return { ok: false, reason: 'empty' };
  if (pos < 1 || pos > state.queue.length) return { ok: false, reason: 'outOfRange' };
  if (pos !== 1) return { ok: false, reason: 'notHead' };

  const head = state.queue[0]!;
  const d = state.dist[head.r]![head.c]!;
  const dist = state.dist.map((row) => [...row]);
  const queue = state.queue.slice(1);
  const discoveredCells: Cell[] = [];
  let starDiscovered = state.starDiscovered;

  for (const step of NEIGHBOR_ORDER) {
    const r = head.r + step.r;
    const c = head.c + step.c;
    if (r < 0 || c < 0 || r >= parsed.rows || c >= parsed.cols) continue;
    if (parsed.walls[r]![c] || dist[r]![c] !== -1) continue;
    dist[r]![c] = d + 1;
    const cell = { r, c };
    queue.push(cell);
    discoveredCells.push(cell);
    if (parsed.star && parsed.star.r === r && parsed.star.c === c) starDiscovered = true;
  }

  return {
    ok: true,
    state: {
      dist,
      queue,
      discovered: state.discovered + discoveredCells.length,
      starDiscovered,
    },
    expanded: head,
    expandedDist: d,
    discoveredCells,
  };
}

export function expandHead(parsed: ParsedGrid, state: FloodState): ExpandResult {
  return expandAt(parsed, state, 1);
}

/**
 * Reference BFS distances, computed independently of the playable state
 * machine. Walls and unreachable cells stay -1.
 */
export function referenceDistances(parsed: ParsedGrid): number[][] {
  const dist = Array.from({ length: parsed.rows }, () => Array<number>(parsed.cols).fill(-1));
  const queue: Cell[] = [];
  for (const s of parsed.sources) {
    dist[s.r]![s.c] = 0;
    queue.push(s);
  }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]!;
    for (const step of NEIGHBOR_ORDER) {
      const r = cur.r + step.r;
      const c = cur.c + step.c;
      if (r < 0 || c < 0 || r >= parsed.rows || c >= parsed.cols) continue;
      if (parsed.walls[r]![c] || dist[r]![c] !== -1) continue;
      dist[r]![c] = dist[cur.r]![cur.c]! + 1;
      queue.push({ r, c });
    }
  }
  return dist;
}

export function maxDistance(dist: number[][]): number {
  let max = 0;
  for (const row of dist) for (const d of row) if (d > max) max = d;
  return max;
}

export interface OptimalRun {
  /** Expansions spent to reach completion (the optimal action count). */
  expansions: number;
  /** Largest frontier size seen at any point, including the initial seed. */
  maxQueue: number;
  /** The star's discovered distance, or null for starless levels. */
  starDistance: number | null;
  finalState: FloodState;
}

/** The textbook run: always expand the head until the level completes. */
export function simulateOptimal(level: FloodLevel): OptimalRun {
  const parsed = parseGrid(level.grid);
  let state = createState(parsed);
  let expansions = 0;
  let maxQueue = state.queue.length;
  while (!isComplete(parsed, state)) {
    const result = expandHead(parsed, state);
    if (!result.ok) throw new Error(`optimal run stalled on ${level.id}: ${result.reason}`);
    state = result.state;
    expansions++;
    maxQueue = Math.max(maxQueue, state.queue.length);
  }
  return {
    expansions,
    maxQueue,
    starDistance: parsed.star ? state.dist[parsed.star.r]![parsed.star.c]! : null,
    finalState: state,
  };
}

export const LEVELS: FloodLevel[] = [
  {
    id: 'bf-01',
    title: 'Down the hall',
    objective: 'Flood the corridor until the star is discovered.',
    lesson:
      'BFS keeps a queue of discovered-but-unexpanded cells. Expand the head — the OLDEST discovery — and its unvisited neighbors join the tail one step farther out. In a corridor the queue never holds more than one cell, so you can feel the raw rhythm: expand, discover, repeat. The star lights up the moment it is discovered, and its number is the shortest path.',
    grid: ['S......', '######*'],
    par: 7,
  },
  {
    id: 'bf-02',
    title: 'Ripples',
    objective: 'Flood the whole pool from the spring at the center.',
    lesson:
      'In open water the frontier is a ring. Every cell at distance d enters the queue before any cell at d + 1, so serving the queue in FIFO order expands ring 1 completely, then ring 2, then ring 3 — ripples. That ordering is the whole reason BFS distances are shortest paths: no cell can be reached early by a longer route, because longer routes are still waiting at the tail.',
    grid: ['#...#', '.....', '..S..', '.....', '#...#'],
    par: 13,
  },
  {
    id: 'bf-03',
    title: 'The bent path',
    objective: 'Wind through the walls until the star is discovered.',
    lesson:
      'Walls make the shortest path bend, but BFS never notices — distance counts steps taken, not straight-line closeness. The star sits only a few cells away as the crow flies, yet its true distance is 12 because the flood must walk the S-route. When BFS discovers a cell, that discovery IS the proof no shorter route exists.',
    grid: ['S######', '.######', '....###', '###.###', '###....', '######.', '######*'],
    par: 12,
  },
  {
    id: 'bf-04',
    title: 'Two springs',
    objective: 'Flood everything — the water rises from TWO springs at once.',
    lesson:
      'Multi-source BFS changes exactly one thing: seed the queue with ALL sources at distance 0 (here in reading order). Everything else is the same FIFO loop, and every cell ends up labeled with its distance to the NEAREST spring. Watch the two floods spread as one frontier and meet in the middle — no special merge logic needed, the queue does it for free.',
    grid: ['S.....', '......', '.....S'],
    par: 12,
  },
  {
    id: 'bf-05',
    title: 'Flooded keep',
    objective: 'Flood the courtyard and breach the gate — discover the star.',
    lesson:
      'Everything at once: the courtyard floods in rings, the frontier swells, and the gate funnels the water toward the star. Keep serving the head — the oldest discovery — and the rings stay honest, so the star’s number is guaranteed to be the shortest path into the keep. Skip ahead in the queue even once and the ring order (and the guarantee) collapses.',
    grid: ['S...###', '....###', '....###', '....*..', '####.#.', '####.#.', '####...'],
    par: 16,
  },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

export function getLevel(id: string): FloodLevel | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((level) => level.id === currentId);
  if (idx === -1 || idx === LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

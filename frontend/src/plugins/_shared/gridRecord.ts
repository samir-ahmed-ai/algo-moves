import type { Frame, Tone } from '../../core/types';
import { createRecorder } from './createRecorder';

export interface GridRecordState {
  grid: number[][];
  rows: number;
  cols: number;
  cur: [number, number] | null;
  visited: boolean[][];
  dist: number[][];
  done: boolean;
  result: unknown;
}

export function createGridRecorder(grid: number[][], overrides?: Partial<GridRecordState>) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  return createRecorder<GridRecordState>(() => ({
    grid: grid.map((r) => r.slice()),
    rows,
    cols,
    cur: null,
    visited: Array.from({ length: rows }, () => new Array(cols).fill(false)),
    dist: Array.from({ length: rows }, () => new Array(cols).fill(-1)),
    done: false,
    result: null,
    ...overrides,
  }));
}

export type GridEmit = (
  type: string,
  note: string,
  caption: string,
  partial?: Partial<GridRecordState>,
  tone?: Tone,
) => void;

/** Grid BFS from (sr, sc) — `passable` gates movement; `onCell` handles each dequeued cell. */
export function recordGridBfs(
  grid: number[][],
  start: [number, number],
  options: {
    initCaption: string;
    passable: (r: number, c: number, val: number) => boolean;
    onCell?: (
      r: number,
      c: number,
      emit: GridEmit,
      ctx: { visited: boolean[][]; dist: number[][]; queue: [number, number][] },
    ) => boolean;
    onFinish?: (emit: GridEmit) => void;
  },
): Frame<GridRecordState>[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  const [sr, sc] = start;
  const queue: [number, number][] = [[sr, sc]];
  const startVisited = visited[sr];
  const startDist = dist[sr];
  if (startVisited) startVisited[sc] = true;
  if (startDist) startDist[sc] = 0;

  const { emit, frames } = createGridRecorder(grid, { visited, dist, cur: [sr, sc] });
  emit('INIT', `start=(${sr},${sc})`, options.initCaption, { cur: [sr, sc], visited, dist });

  const dirs = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ] as const;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    emit('VISIT', `(${r},${c})`, `Process cell (${r}, ${c}) with value ${grid[r]?.[c] ?? '?'}.`, {
      cur: [r, c],
      visited,
      dist,
    });
    if (options.onCell?.(r, c, emit, { visited, dist, queue })) break;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const visitedRow = visited[nr];
      const gridRow = grid[nr];
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || !visitedRow || visitedRow[nc]) continue;
      const cellVal = gridRow?.[nc];
      if (cellVal === undefined || !options.passable(nr, nc, cellVal)) continue;
      visitedRow[nc] = true;
      const distRow = dist[nr];
      const srcDist = dist[r]?.[c];
      if (distRow && srcDist !== undefined) distRow[nc] = srcDist + 1;
      queue.push([nr, nc]);
      const newDist = distRow?.[nc];
      emit('ENQUEUE', `→(${nr},${nc})`, `Move to (${nr}, ${nc}), dist=${newDist ?? '?'}.`, {
        cur: [nr, nc],
        visited,
        dist,
      });
    }
  }

  options.onFinish?.(emit);
  return frames;
}

/** Fill a DP table row-by-row, emitting one frame per cell update. */
export function recordDpFill<T extends Record<string, unknown>>(
  makeBase: () => T,
  fill: (
    emit: (type: string, note: string, caption: string, partial?: Partial<T>, tone?: Tone) => void,
  ) => void,
): Frame<T>[] {
  const { emit, frames } = createRecorder(makeBase);
  fill(emit);
  return frames;
}

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/GridBoard';

interface PathInput {
  mat: number[][];
  sx: number;
  sy: number;
  dx: number;
  dy: number;
}

interface PathState {
  mat: number[][];
  src: [number, number];
  dest: [number, number];
  visited: boolean[][]; // cells we have committed to and explored from
  path: [number, number][]; // current DFS stack of cells, in order
  cur: [number, number] | null; // cell the DFS is currently examining
  result: [number, number][] | null; // final path once found
  done: boolean;
}

const DIRS: [number, number][] = [
  [0, 1], // right
  [1, 0], // down
  [0, -1], // left
  [-1, 0], // up
];

const DIR_NAME = (dr: number, dc: number): string =>
  dr === 0 && dc === 1
    ? 'right'
    : dr === 1 && dc === 0
      ? 'down'
      : dr === 0 && dc === -1
        ? 'left'
        : 'up';

function record({ mat, sx, sy, dx, dy }: PathInput): Frame<PathState>[] {
  const m = mat.length;
  const n = mat[0].length;
  const visited: boolean[][] = Array.from({ length: m }, () => new Array<boolean>(n).fill(false));
  const path: [number, number][] = [];
  const frames: Frame<PathState>[] = [];

  const cloneVisited = (): boolean[][] => visited.map((row) => row.slice());
  const clonePath = (): [number, number][] => path.map((p) => [p[0], p[1]] as [number, number]);

  const emit = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    extra: Partial<PathState> = {},
    tone?: 'good' | 'bad',
  ): void => {
    frames.push({
      move: { type, note, caption, tone },
      state: {
        mat,
        src: [sx, sy],
        dest: [dx, dy],
        visited: cloneVisited(),
        path: clonePath(),
        cur,
        result: null,
        done: false,
        ...extra,
      },
    });
  };

  emit(
    'INIT',
    `(${sx},${sy}) → (${dx},${dy})`,
    `Find a path from the start cell (${sx},${sy}) to the destination (${dx},${dy}) through open cells (0). Cells marked 1 are walls. We run DFS in the order right, down, left, up, pushing each cell onto the path and backtracking (popping) when a branch dead-ends.`,
    null,
  );

  let found: [number, number][] | null = null;

  const dfs = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= m || j >= n) {
      emit(
        'BLOCKED',
        `(${i},${j}) off-grid`,
        `Cell (${i},${j}) is outside the ${m}×${n} grid, so this direction fails. Return false and try the next direction.`,
        null,
        {},
        'bad',
      );
      return false;
    }
    if (mat[i][j] === 1) {
      emit(
        'BLOCKED',
        `(${i},${j}) wall`,
        `Cell (${i},${j}) is a wall (value 1), so we cannot step here. Return false and try the next direction.`,
        [i, j],
        {},
        'bad',
      );
      return false;
    }
    if (visited[i][j]) {
      emit(
        'BLOCKED',
        `(${i},${j}) seen`,
        `Cell (${i},${j}) is already on the explored path, so revisiting would loop. Return false and try the next direction.`,
        [i, j],
        {},
        'bad',
      );
      return false;
    }

    path.push([i, j]);
    emit(
      'PUSH',
      `push (${i},${j})`,
      `Cell (${i},${j}) is open, so append it to the current path. Path length is now ${path.length}.`,
      [i, j],
    );

    if (i === dx && j === dy) {
      found = clonePath();
      emit(
        'FOUND',
        `reached (${dx},${dy})`,
        `Cell (${i},${j}) is the destination. The whole path from start to here is the answer — unwind the recursion returning true.`,
        [i, j],
        { result: found, done: true },
        'good',
      );
      return true;
    }

    visited[i][j] = true;
    emit(
      'VISIT',
      `visit (${i},${j})`,
      `Mark (${i},${j}) as explored, then probe its neighbours in the order right, down, left, up.`,
      [i, j],
    );

    for (const [dr, dc] of DIRS) {
      const ni = i + dr;
      const nj = j + dc;
      emit(
        'TRY',
        `${DIR_NAME(dr, dc)} → (${ni},${nj})`,
        `From (${i},${j}) try the ${DIR_NAME(dr, dc)} neighbour (${ni},${nj}).`,
        [ni, nj],
      );
      if (dfs(ni, nj)) return true;
    }

    path.pop();
    emit(
      'POP',
      `backtrack (${i},${j})`,
      `Every direction out of (${i},${j}) dead-ended, so pop it off the path and backtrack to the previous cell.`,
      [i, j],
      {},
      'bad',
    );
    return false;
  };

  const ok = dfs(sx, sy);
  if (!ok) {
    emit(
      'NONE',
      'no path',
      `DFS exhausted every reachable open cell without touching the destination, so no path exists between (${sx},${sy}) and (${dx},${dy}).`,
      null,
      { done: true },
      'bad',
    );
  }

  return frames;
}

function onPath(path: [number, number][], r: number, c: number): boolean {
  return path.some((p) => p[0] === r && p[1] === c);
}

function View({ frame }: PluginViewProps<PathState>) {
  const s = frame.state;
  const result = s.result;
  const tone = (r: number, c: number): string => {
    if (result && onPath(result, r, c)) return 'path';
    if (r === s.src[0] && c === s.src[1]) return 'active';
    if (r === s.dest[0] && c === s.dest[1]) return 'fill';
    if (s.mat[r][c] === 1) return 'water';
    if (onPath(s.path, r, c)) return 'path';
    if (s.visited[r][c]) return 'visited';
    return 'land';
  };
  const label = (r: number, c: number): string => {
    if (r === s.src[0] && c === s.src[1]) return 'S';
    if (r === s.dest[0] && c === s.dest[1]) return 'D';
    return s.mat[r][c] === 1 ? '▩' : '·';
  };
  const pathStr = (result ?? s.path).map((p) => `(${p[0]},${p[1]})`).join(' → ');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        start <span className="font-mono text-ink">({s.src[0]},{s.src[1]})</span> · dest{' '}
        <span className="font-mono text-ink">({s.dest[0]},{s.dest[1]})</span> · 1 = wall
      </div>
      <GridBoard grid={s.mat} cellTone={tone} label={label} active={s.cur} />
      <div className={cn('mt-1 font-mono', vizText.sm, result ? 'text-good' : 'text-ink3')}>
        {result ? '→ ' : 'path '} {pathStr || '·'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PathState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="start" v={`(${s.src[0]},${s.src[1]})`} />
      <InspectorRow k="dest" v={`(${s.dest[0]},${s.dest[1]})`} />
      <InspectorRow k="current" v={s.cur ? `(${s.cur[0]},${s.cur[1]})` : '—'} />
      <InspectorRow k="path length" v={(s.result ?? s.path).length} />
      <InspectorRow k="result" v={s.result ? `${s.result.length} cells` : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-find-path-between-cells';
export const title = 'Find path between cells';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'fp1',
      label: '4×4 open path',
      value: {
        mat: [
          [0, 0, 1, 0],
          [1, 0, 1, 0],
          [0, 0, 0, 0],
          [0, 1, 1, 0],
        ],
        sx: 0,
        sy: 0,
        dx: 3,
        dy: 3,
      },
    },
    {
      id: 'fp2',
      label: '3×3 walled off',
      value: {
        mat: [
          [0, 1, 0],
          [1, 1, 0],
          [0, 0, 0],
        ],
        sx: 0,
        sy: 0,
        dx: 2,
        dy: 0,
      },
    },
  ] satisfies SampleInput<PathInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PathState | undefined;
    return s?.result
      ? { ok: true, label: `path of ${s.result.length} cells` }
      : { ok: false, label: 'no path' };
  },
};

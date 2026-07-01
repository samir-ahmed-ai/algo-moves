import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, RailGroup, RailResult, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';

interface SpbmInput {
  grid: number[][]; // 0 = open, 1 = blocked
}

interface SpbmState {
  grid: number[][];
  visited: boolean[][];
  cur: [number, number] | null;
  dist: number; // path length (cell count) of the current cell
  path: [number, number][]; // final shortest path once found
  answer: number | null; // shortest path length, or -1, or null while running
  done: boolean;
}

// 8-directional moves.
const DIRS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function record({ grid }: SpbmInput): Frame<SpbmState>[] {
  const n = grid.length;
  const visited = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  // parent[r][c] = the cell we arrived from, to reconstruct the path.
  const parent: ([number, number] | null)[][] = Array.from({ length: n }, () => new Array<[number, number] | null>(n).fill(null));
  const dist = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  const { emit, frames } = createRecorder<SpbmState>(() => ({
    grid,
    visited: visited.map((row) => row.slice()),
    cur: null,
    dist: 0,
    path: [],
    answer: null,
    done: false,
  }));

  const snap = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    d: number,
    path: [number, number][],
    answer: number | null,
    tone?: 'good' | 'bad',
  ) =>
    emit(type, note, caption, {
      cur,
      dist: d,
      path: path.map((p) => [p[0], p[1]] as [number, number]),
      answer,
      done: type === 'DONE',
    }, tone);

  snap(
    'INIT',
    `${n}×${n} grid`,
    `Find the shortest clear path from the top-left (0, 0) to the bottom-right (${n - 1}, ${n - 1}), moving in any of the 8 directions through open (0) cells only. BFS explores cells in waves, so the first time we reach the goal is the shortest path. The answer is the number of cells on that path, or -1 if no path exists.`,
    null,
    0,
    [],
    null,
  );

  const reconstruct = (er: number, ec: number): [number, number][] => {
    const path: [number, number][] = [];
    let p: [number, number] | null = [er, ec];
    while (p) {
      path.push(p);
      p = parent[p[0]][p[1]];
    }
    return path.reverse();
  };

  if (grid[0][0] !== 0 || grid[n - 1][n - 1] !== 0) {
    snap(
      'BLOCKED',
      'endpoint blocked',
      `Either the start (0, 0) or the goal (${n - 1}, ${n - 1}) is a blocked (1) cell, so no clear path can exist.`,
      null,
      0,
      [],
      null,
    );
    snap('DONE', 'no path', `No clear path: the answer is -1.`, null, 0, [], -1, 'bad');
    return frames;
  }

  const queue: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  dist[0][0] = 1;
  snap(
    'START',
    'enqueue (0,0)',
    `Start the BFS at (0, 0) with a path length of 1 (it counts as the first cell). Mark it visited and add it to the queue.`,
    [0, 0],
    1,
    [],
    null,
  );

  while (queue.length) {
    const [r, c] = queue.shift() as [number, number];
    const d = dist[r][c];

    if (r === n - 1 && c === n - 1) {
      const path = reconstruct(r, c);
      snap(
        'GOAL',
        `reached in ${d}`,
        `Dequeued the goal (${r}, ${c}) at path length ${d}. Because BFS reaches every cell by its shortest number of steps, this is the answer.`,
        [r, c],
        d,
        path,
        d,
      );
      snap('DONE', `${d} cells`, `Shortest clear path uses ${d} cells. The answer is ${d}.`, null, d, path, d, 'good');
      return frames;
    }

    const opened: string[] = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] === 0 && !visited[nr][nc]) {
        visited[nr][nc] = true;
        dist[nr][nc] = d + 1;
        parent[nr][nc] = [r, c];
        queue.push([nr, nc]);
        opened.push(`(${nr}, ${nc})`);
      }
    }

    const expanded =
      opened.length > 0
        ? `Open unvisited neighbours ${opened.join(', ')} are reached at path length ${d + 1}; mark them visited and enqueue them.`
        : `No new open neighbours to explore from here.`;
    snap(
      'EXPAND',
      `expand (${r},${c})`,
      `Dequeue (${r}, ${c}) at path length ${d}. ${expanded}`,
      [r, c],
      d,
      [],
      null,
    );
  }

  snap('DONE', 'no path', `The queue is empty and the goal was never reached: the answer is -1.`, null, 0, [], -1, 'bad');
  return frames;
}

function View({ frame }: PluginViewProps<SpbmState>) {
  const s = frame.state;
  const onPath = (r: number, c: number) => s.path.some((p) => p[0] === r && p[1] === c);
  const cellTone = (r: number, c: number) => {
    if (s.grid[r][c] === 1) return 'water';
    if (s.path.length > 0 && onPath(r, c)) return 'path';
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (s.visited[r][c]) return 'visited';
    return 'land';
  };
  const answerValue = s.answer !== null ? s.answer : s.dist > 0 ? s.dist : '—';
  const answerDone = s.answer !== null;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="cell" v={s.cur ? `(${s.cur[0]},${s.cur[1]})` : '—'} />
        <RailStat k="dist" v={s.dist > 0 ? s.dist : '—'} tone="accent" />
      </RailGroup>
      <RailResult label="path len" value={answerValue} tone={answerDone ? (s.answer === -1 ? 'bad' : 'good') : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <GridBoard grid={s.grid} cellTone={cellTone} active={s.cur} cellSize={44} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SpbmState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="cell" v={s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—'} />
      <InspectorRow k="path so far" v={s.cur ? s.dist : '—'} />
      <InspectorRow k="answer" v={s.answer !== null ? s.answer : '—'} />
    </VarGrid>
  );
}

const G1: SpbmInput = {
  grid: [
    [0, 0, 0],
    [1, 1, 0],
    [1, 1, 0],
  ],
};
const G2: SpbmInput = {
  grid: [
    [0, 1, 0],
    [0, 1, 0],
    [0, 0, 0],
  ],
};

export const manifestId = 'imp-12-shortest-path-in-binary-matrix';
export const title = 'Shortest Path in Binary Matrix';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g1', label: '3×3 · path 4', value: G1 },
    { id: 'g2', label: '3×3 · path 4', value: G2 },
  ] satisfies SampleInput<SpbmInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SpbmState | undefined;
    const ans = s?.answer ?? -1;
    return { ok: ans !== -1, label: ans === -1 ? 'no path (-1)' : `${ans} cells` };
  },
};

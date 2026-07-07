import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';

interface SwimInput {
  grid: number[][]; // n×n elevations, distinct 0..n²-1
}

interface SwimState {
  grid: number[][];
  reachTime: number[][]; // min time to reach each settled cell (−1 = not settled)
  cur: [number, number] | null;
  res: number; // current best (max elevation) so far
  answer: number | null; // set on DONE
  done: boolean;
}

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

function record({ grid }: SwimInput): Frame<SwimState>[] {
  const n = grid.length;
  const reachTime = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  const vis = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const { emit, frames } = createRecorder<SwimState>(() => ({
    grid: grid,
    reachTime: reachTime.map((row) => row.slice()),
    cur: null,
    res: 0,
    answer: null,
    done: false,
  }));

  emit(
    'INIT',
    `${n}×${n} grid`,
    `Water rises over time; at time t every cell with elevation ≤ t is flooded and swimmable. Cost to reach a cell = the maximum elevation along the best path. Dijkstra-style: always settle the unvisited frontier cell of lowest elevation. Answer = the least time to reach (${n - 1}, ${n - 1}) from (0, 0).`,
    { cur: null, res: 0, answer: null },
  );

  // min-heap over [elevation, r, c]
  const heap: [number, number, number][] = [[grid[0]![0]!, 0, 0]];
  vis[0]![0] = true;
  const popMin = (): [number, number, number] => {
    let best = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i]![0] < heap[best]![0]) best = i;
    const v = heap[best]!;
    heap.splice(best, 1);
    return v;
  };

  let res = 0;
  let answer: number | null = null;

  while (heap.length) {
    const [elev, r, c] = popMin();
    if (elev > res) res = elev;
    reachTime[r]![c] = res;
    const isTarget = r === n - 1 && c === n - 1;
    emit(
      isTarget ? 'TARGET' : 'SETTLE',
      `(${r},${c}) elev ${elev} · time ${res}`,
      isTarget
        ? `Reached the target (${r}, ${c}) with elevation ${elev}. The highest elevation crossed on the best path is ${res} — that is the least time needed.`
        : `Settle the lowest frontier cell (${r}, ${c}), elevation ${elev}. Best time to reach it = max elevation so far = ${res}.`,
      { cur: [r, c], res: res, answer: null },
    );
    if (isTarget) {
      answer = res;
      break;
    }
    for (const [dr, dc] of DIRS) {
      const nr = r + dr!;
      const nc = c + dc!;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && !vis[nr]![nc]) {
        vis[nr]![nc] = true;
        heap.push([grid[nr]![nc]!, nr, nc]);
      }
    }
  }

  emit(
    'DONE',
    `answer = ${answer ?? res}`,
    `Least time to swim from (0, 0) to (${n - 1}, ${n - 1}) = ${answer ?? res}.`,
    { cur: [n - 1, n - 1], res: answer ?? res, answer: answer ?? res, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SwimState>) {
  const s = frame.state;
  const n = s.grid.length;
  const display = s.grid.map((row, r) =>
    row.map((_, c) => (s.reachTime[r]![c]! >= 0 ? s.reachTime[r]![c]! : '·')),
  );
  const cellTone = (r: number, c: number) => {
    if (s.done && r === n - 1 && c === n - 1) return 'path';
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (s.reachTime[r]![c]! >= 0) return 'visited';
    return '';
  };
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="cell" v={s.cur ? `(${s.cur[0]},${s.cur[1]})` : '—'} />
        <RailStat k="elev" v={s.cur ? s.grid[s.cur[0]]![s.cur[1]] : '—'} />
        <RailStat k="time" v={s.res} tone="accent" />
      </RailGroup>
      <RailResult
        label="answer"
        value={s.answer === null ? '—' : s.answer}
        tone={s.answer !== null ? 'good' : 'accent'}
      />
    </>
  );
  return (
    <VizStage rail={rail}>
      <GridBoard grid={display} cellTone={cellTone} active={s.cur} cellSize={44} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SwimState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="cell" v={s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—'} />
      <InspectorRow k="elevation" v={s.cur ? s.grid[s.cur[0]]![s.cur[1]] : '—'} />
      <InspectorRow k="time so far" v={s.res} />
      <InspectorRow k="answer" v={s.answer === null ? '—' : s.answer} />
    </VarGrid>
  );
}

const G1: SwimInput = {
  grid: [
    [0, 2],
    [1, 3],
  ],
};
const G2: SwimInput = {
  grid: [
    [0, 1, 2, 3, 4],
    [24, 23, 22, 21, 5],
    [12, 13, 14, 15, 16],
    [11, 17, 18, 19, 20],
    [10, 9, 8, 7, 6],
  ],
};

export const manifestId = 'imp-5-swim-in-rising-water';
export const title = 'Swim in Rising Water';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g1', label: '2×2 · answer 3', value: G1 },
    { id: 'g2', label: '5×5 · answer 16', value: G2 },
  ] satisfies SampleInput<SwimInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SwimState | undefined;
    return { ok: true, label: `answer = ${s?.answer ?? 0}` };
  },
};

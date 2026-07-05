import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface LcoInput {
  grid: number[][]; // each row sorted: 0s then 1s
}

interface LcoState {
  grid: number[][];
  r: number;
  c: number;
  path: boolean[][]; // cells the walk has stood on
  res: number; // leftmost column known to contain a 1, or -1
  inBounds: boolean;
  done: boolean;
}

function record({ grid }: LcoInput): Frame<LcoState>[] {
  const m = grid.length;
  const n = grid[0].length;  const path = Array.from({ length: m }, () => new Array<boolean>(n).fill(false));

  let r = 0;
  let c = n - 1;
  let res = -1;

  const { emit, frames } = createRecorder<LcoState>(() => ({
        grid: grid,
        r: r,
        c: c,
        path: path.map((row) => row.slice()),
        res: res,
        inBounds: r < m && c >= 0,
        done: false
      }));

  emit('INIT', `${m}×${n}, start (0, ${n - 1})`, `Each row is sorted (0s then 1s). Start at the top-right corner and walk a staircase: on a 1 record its column and step left (a 1 might also sit further left in a lower row); on a 0 step down. The smallest column ever recorded is the answer.`, {});

  while (r < m && c >= 0) {
    path[r][c] = true;
    if (grid[r][c] === 1) {
      res = c;
      emit('ONE', `(${r},${c}) = 1 → res=${c}`, `Cell (${r}, ${c}) is 1: this row has a 1 at column ${c}, so record res = ${c} and step left to hunt for an even earlier 1.`, {});
      c--;
    } else {
      emit('ZERO', `(${r},${c}) = 0 → down`, `Cell (${r}, ${c}) is 0: the whole row up to here is 0, so no 1 can be at column ≤ ${c} in this row — step down to the next row.`, {});
      r++;
    }
  }

  emit('DONE', res === -1 ? 'no 1 found' : `leftmost column ${res}`, res === -1
      ? `The walk left the grid without ever seeing a 1 — the matrix is all zeros. Return -1.`
      : `The walk left the grid. The smallest column that held a 1 was ${res}. Leftmost column with a one = ${res}.`, { done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<LcoState>) {
  const s = frame.state;
  const cur: [number, number] | null = s.inBounds && !s.done ? [s.r, s.c] : null;
  const cellTone = (r: number, c: number) => {
    if (cur && cur[0] === r && cur[1] === c) return 'active';
    if (s.res !== -1 && c === s.res) return 'path';
    if (s.path[r][c]) return 'visited';
    return s.grid[r][c] === 1 ? 'land' : 'water';
  };
  const rail = (
    <>
      <RailGroup label="pointer">
        <RailStat k="r" v={s.inBounds && !s.done ? s.r : '—'} tone="accent" />
        <RailStat k="c" v={s.inBounds && !s.done ? s.c : '—'} tone="accent" />
      </RailGroup>
      <RailResult label="leftmost col" value={s.res === -1 ? '—' : s.res} tone={s.done ? (s.res === -1 ? 'bad' : 'good') : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <GridBoard grid={s.grid} cellTone={cellTone} active={cur} cellSize={40} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LcoState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="row r" v={s.inBounds && !s.done ? s.r : '—'} />
      <InspectorRow k="col c" v={s.inBounds && !s.done ? s.c : '—'} />
      <InspectorRow k="res" v={s.res === -1 ? '-1' : s.res} />
    </VarGrid>
  );
}

const M1: LcoInput = {
  grid: [
    [0, 0, 0, 1],
    [0, 0, 1, 1],
    [0, 1, 1, 1],
  ],
};
const M2: LcoInput = {
  grid: [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
};

export const manifestId = 'imp-55-leftmost-column-with-at-least-a-one';
export const title = 'Leftmost Column with at Least a One';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'lco1', label: '3×4 · leftmost = 1', value: M1 },
    { id: 'lco2', label: '3×3 all zero · -1', value: M2 },
  ] satisfies SampleInput<LcoInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LcoState | undefined;
    if (!s || s.res === -1) return { ok: false, label: '-1 (no 1)' };
    return { ok: true, label: `column ${s.res}` };
  },
};

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
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface MRInput {
  matrix: string[][];
}

interface MRState {
  matrix: string[][];
  rows: number;
  cols: number;
  heights: number[][]; // -1 = row not yet computed
  cur: [number, number] | null;
  best: { row: number; left: number; right: number; height: number } | null;
  answer: number;
  done: boolean;
}

/** Largest rectangle in a histogram; returns the area plus the spanning columns. */
function largestRect(h: number[]): { area: number; left: number; right: number; height: number } {
  const stack: number[] = [];
  let best = { area: 0, left: 0, right: 0, height: 0 };
  const ext = [...h, 0];
  for (let i = 0; i < ext.length; i++) {
    while (stack.length > 0 && ext[stack[stack.length - 1]] > ext[i]) {
      const top = stack.pop() as number;
      const height = ext[top];
      const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
      const right = i - 1;
      const area = height * (right - left + 1);
      if (area > best.area) best = { area, left, right, height };
    }
    stack.push(i);
  }
  return best;
}

function record({ matrix }: MRInput): Frame<MRState>[] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const heights: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(-1));
  let answer = 0;
  let best: MRState['best'] = null;

  const { emit, frames } = createRecorder<MRState>(() => ({
    matrix: matrix,
    rows: rows,
    cols: cols,
    heights: heights.map((r) => r.slice()),
    best: best,
    answer: answer,
    cur: null,
    done: false,
  }));

  emit(
    'INIT',
    `${rows}×${cols}`,
    `Maximal Rectangle: find the largest all-1s rectangle. We build a heights table row by row — heights[i][j] is the number of consecutive 1s ending at (i, j) going up — then read off the biggest rectangle as a histogram per row.`,
    { cur: null },
  );

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const isOne = matrix[i][j] === '1';
      const prev = i > 0 ? heights[i - 1][j] : 0;
      heights[i][j] = isOne ? prev + 1 : 0;
      emit(
        isOne ? 'FILL' : 'ZERO',
        `h[${i}][${j}]=${heights[i][j]}`,
        isOne
          ? `matrix[${i}][${j}] is '1', so the column of 1s grows: heights[${i}][${j}] = heights[${i - 1 < 0 ? 0 : i - 1}][${j}] (${prev}) + 1 = ${heights[i][j]}.`
          : `matrix[${i}][${j}] is '0', so the column of 1s breaks here: heights[${i}][${j}] resets to 0.`,
        { cur: [i, j] },
      );
    }
    // After completing a row, evaluate its histogram.
    const r = largestRect(heights[i]);
    if (r.area > answer) {
      answer = r.area;
      best = { row: i, left: r.left, right: r.right, height: r.height };
    }
  }

  const span = best
    ? `columns ${best.left}–${best.right} of row ${best.row}, ${best.height} tall`
    : 'none';
  emit(
    'DONE',
    `area ${answer}`,
    `The heights table is complete. The largest histogram rectangle spans ${span}, giving the maximal rectangle area = ${answer}.`,
    { cur: best ? [best.row, best.left] : null, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MRState>) {
  const s = frame.state;
  const display: (number | string)[][] = s.heights.map((row) => row.map((v) => (v < 0 ? '' : v)));
  const inBest = (r: number, c: number) =>
    s.best !== null && r === s.best.row && c >= s.best.left && c <= s.best.right;
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (s.done && inBest(r, c)) return 'path';
    return s.heights[r][c] >= 0 ? 'visited' : '';
  };
  const curCell = s.cur && s.heights[s.cur[0]][s.cur[1]] >= 0 ? s.heights[s.cur[0]][s.cur[1]] : '—';
  const curMatrix = s.cur ? s.matrix[s.cur[0]][s.cur[1]] : '—';
  const rail = (
    <>
      <RailGroup label="cell">
        <RailStat k="pos" v={s.cur ? `[${s.cur[0]},${s.cur[1]}]` : '—'} />
        <RailStat k="val" v={curMatrix} tone="accent" />
        <RailStat k="h" v={curCell} tone="accent" />
      </RailGroup>
      <RailGroup label="best">
        <RailStat
          k="area"
          v={s.answer > 0 ? s.answer : '—'}
          tone={s.answer > 0 ? 'good' : undefined}
        />
      </RailGroup>
      {s.done && <RailResult label="answer" value={s.answer} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <GridBoard grid={display} cellTone={cellTone} active={s.cur} cellSize={44} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MRState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curCell = s.cur && s.heights[s.cur[0]][s.cur[1]] >= 0 ? s.heights[s.cur[0]][s.cur[1]] : '—';
  const curMatrix = s.cur ? s.matrix[s.cur[0]][s.cur[1]] : '—';
  return (
    <VarGrid>
      <InspectorRow k="grid" v={`${s.rows}×${s.cols}`} />
      <InspectorRow k="cell" v={s.cur ? `h[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="matrix value" v={curMatrix} />
      <InspectorRow k="height" v={curCell} />
      <InspectorRow k="best so far" v={s.answer} />
      <InspectorRow k="answer" v={s.done ? `area ${s.answer}` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-70-maximal-rectangle';
export const title = 'Maximal Rectangle';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'm4x5',
      label: 'classic 4×5',
      value: {
        matrix: [
          ['1', '0', '1', '0', '0'],
          ['1', '0', '1', '1', '1'],
          ['1', '1', '1', '1', '1'],
          ['1', '0', '0', '1', '0'],
        ],
      },
    },
    {
      id: 'm2x3',
      label: 'small 2×3',
      value: {
        matrix: [
          ['1', '1', '0'],
          ['1', '1', '1'],
        ],
      },
    },
  ] satisfies SampleInput<MRInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MRState | undefined;
    return { ok: true, label: `area ${s ? s.answer : 0}` };
  },
};

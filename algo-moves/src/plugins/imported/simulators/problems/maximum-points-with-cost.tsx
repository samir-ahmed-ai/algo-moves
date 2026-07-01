import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MPInput {
  points: number[][];
}

interface MPState {
  points: number[][];
  rows: number;
  cols: number;
  dp: number[][]; // null sentinel via -Infinity = not yet filled
  cur: [number, number] | null;
  bestCol: number; // column of the overall answer (last row)
  done: boolean;
}

const UNSET = -Infinity;

function record({ points }: MPInput): Frame<MPState>[] {
  const rows = points.length;
  const cols = points[0].length;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(UNSET));
  const frames: Frame<MPState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    bestCol: number,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { points, rows, cols, dp: dp.map((r) => r.slice()), cur, bestCol, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `${rows}×${cols}`,
    `Maximum Number of Points with Cost: pick one cell per row to maximize total points, but moving from column k in the previous row to column j costs |j − k|. dp[i][j] = the best score when you pick column j in row i.`,
    null,
    0,
  );

  // Base row: dp[0][j] = points[0][j].
  for (let j = 0; j < cols; j++) {
    dp[0][j] = points[0][j];
    emit('BASE', `dp[0][${j}]=${dp[0][j]}`, `Base row: with nothing above it, picking column ${j} in row 0 just scores its own value points[0][${j}] = ${points[0][j]}.`, [0, j], 0);
  }

  for (let i = 1; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let best = UNSET;
      let bestK = 0;
      for (let k = 0; k < cols; k++) {
        const cand = dp[i - 1][k] - Math.abs(j - k);
        if (cand > best) {
          best = cand;
          bestK = k;
        }
      }
      dp[i][j] = points[i][j] + best;
      emit(
        'FILL',
        `dp[${i}][${j}]=${dp[i][j]}`,
        `For column ${j} in row ${i}, the best previous column is k = ${bestK}: dp[${i - 1}][${bestK}] (=${dp[i - 1][bestK]}) minus the move cost |${j} − ${bestK}| (=${Math.abs(j - bestK)}) gives ${best}. Add this cell's points[${i}][${j}] = ${points[i][j]}: dp[${i}][${j}] = ${points[i][j]} + ${best} = ${dp[i][j]}.`,
        [i, j],
        0,
      );
    }
  }

  // Answer = max of last row.
  let answer = UNSET;
  let bestCol = 0;
  for (let j = 0; j < cols; j++) {
    if (dp[rows - 1][j] > answer) {
      answer = dp[rows - 1][j];
      bestCol = j;
    }
  }

  emit(
    'DONE',
    `${answer} points`,
    `The table is full. The best score in the last row is dp[${rows - 1}][${bestCol}] = ${answer}, so the maximum number of points is ${answer}.`,
    [rows - 1, bestCol],
    bestCol,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MPState>) {
  const s = frame.state;
  const display: (number | string)[][] = s.dp.map((row) => row.map((v) => (v === UNSET ? '' : v)));
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (s.done && r === s.rows - 1 && c === s.bestCol) return 'path';
    return s.dp[r][c] !== UNSET ? 'visited' : '';
  };
  let ans: number | string = '…filling';
  if (s.done) ans = s.dp[s.rows - 1][s.bestCol];
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.rows}×{s.cols} dp table, max points = <span className="font-mono text-ink">{ans}</span>
      </div>
      <GridBoard grid={display} cellTone={cellTone} active={s.cur} cellSize={48} />
      <div className={cn(vizText.sm, 'text-ink3')}>dp[i][j] = best score picking column j in row i</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MPState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (r: number, c: number) =>
    r >= 0 && c >= 0 && s.dp[r]?.[c] !== undefined && s.dp[r][c] !== UNSET ? s.dp[r][c] : '—';
  const ans = s.done ? `${s.dp[s.rows - 1][s.bestCol]} points` : '…filling';
  return (
    <VarGrid>
      <InspectorRow k="grid" v={`${s.rows}×${s.cols}`} />
      <InspectorRow k="cell" v={s.cur ? `dp[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="own points" v={s.cur ? s.points[s.cur[0]][s.cur[1]] : '—'} />
      <InspectorRow k="dp value" v={s.cur ? cell(s.cur[0], s.cur[1]) : '—'} />
      <InspectorRow k="answer" v={ans} />
    </VarGrid>
  );
}

export const manifestId = 'imp-73-maximum-number-of-points-with-cost';
export const title = 'Maximum Number of Points with Cost';

export const simulator: DpSimulator = {
  inputs: [
    {
      id: 'p3x3',
      label: '[[1,2,3],[1,5,1],[3,1,1]]',
      value: { points: [[1, 2, 3], [1, 5, 1], [3, 1, 1]] },
    },
    {
      id: 'p2x3',
      label: '[[1,2,3],[1,5,1]]',
      value: { points: [[1, 2, 3], [1, 5, 1]] },
    },
  ] satisfies SampleInput<MPInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MPState | undefined;
    if (!s) return { ok: true, label: '0 points' };
    let v = UNSET;
    for (let j = 0; j < s.cols; j++) if (s.dp[s.rows - 1][j] > v) v = s.dp[s.rows - 1][j];
    return { ok: true, label: `${v} points` };
  },
};

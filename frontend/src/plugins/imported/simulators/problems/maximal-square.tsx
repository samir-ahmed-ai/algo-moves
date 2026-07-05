import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface MSInput {
  matrix: string[][]; // '0' / '1'
}

interface MSState {
  matrix: string[][];
  m: number;
  n: number;
  dp: number[][]; // -1 = not yet filled, otherwise side length of largest square ending here
  cur: [number, number] | null;
  best: number; // best side seen so far
  bestCell: [number, number] | null; // cell achieving the best side
  done: boolean;
}

function record({ matrix }: MSInput): Frame<MSState>[] {
  const m = matrix.length;
  const n = matrix[0].length;
  const dp: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(-1));  let best = 0;
  let bestCell: [number, number] | null = null;

  const { emit, frames } = createRecorder<MSState>(() => ({
        matrix: matrix.map((r) => r.slice()),
        m: m,
        n: n,
        dp: dp.map((r) => r.slice()),
        best: best,
        bestCell: bestCell ? [bestCell[0], bestCell[1]] : null,
        cur: null,
        done: false
      }));

  emit('INIT', `${m}×${n}`, `Maximal Square: find the largest square of all '1's in the binary matrix. dp[i][j] is the side length of the largest all-1 square whose bottom-right corner is cell (i, j); the answer is (max side)².`, { cur: null });

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] !== '1') {
        dp[r][c] = 0;
        emit('ZERO', `dp[${r}][${c}]=0`, `Cell (${r}, ${c}) holds '0', so no square can end here: dp[${r}][${c}] = 0.`, { cur: [r, c] });
        continue;
      }
      if (r === 0 || c === 0) {
        dp[r][c] = 1;
        const why = r === 0 && c === 0 ? `it is the corner` : r === 0 ? `it is in the top row` : `it is in the left column`;
        if (dp[r][c] > best) {
          best = dp[r][c];
          bestCell = [r, c];
        }
        emit('EDGE', `dp[${r}][${c}]=1`, `Cell (${r}, ${c}) holds '1' and ${why}, so the largest square ending here is just itself: dp[${r}][${c}] = 1.`, { cur: [r, c] });
        continue;
      }
      const up = dp[r - 1][c];
      const left = dp[r][c - 1];
      const diag = dp[r - 1][c - 1];
      const side = Math.min(up, left, diag) + 1;
      dp[r][c] = side;
      if (side > best) {
        best = side;
        bestCell = [r, c];
      }
      emit('FILL', `dp[${r}][${c}]=${side}`, `Cell (${r}, ${c}) holds '1'. A square ending here is limited by its three neighbours: up (${r - 1}, ${c}) = ${up}, left (${r}, ${c - 1}) = ${left}, diagonal (${r - 1}, ${c - 1}) = ${diag}. Take min(${up}, ${left}, ${diag}) + 1 = ${Math.min(up, left, diag)} + 1 = ${side}.`, { cur: [r, c] });
    }
  }

  const area = best * best;
  emit('DONE', `area ${area}`, `The table is full. The largest side is ${best}${bestCell ? ` (ending at cell (${bestCell[0]}, ${bestCell[1]}))` : ''}, so the maximal square area is ${best}² = ${area}.`, { cur: bestCell , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<MSState>) {
  const s = frame.state;
  const display: (number | string)[][] = s.dp.map((row) => row.map((v) => (v < 0 ? '' : v)));
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (s.bestCell && s.bestCell[0] === r && s.bestCell[1] === c) return 'path';
    return s.dp[r][c] >= 0 ? 'visited' : '';
  };
  const cell = (r: number, c: number) => (r >= 0 && c >= 0 && s.dp[r]?.[c] >= 0 ? s.dp[r][c] : '—');
  const area = s.best * s.best;
  const rail = (
    <>
      <RailGroup label="cell">
        <RailStat k="pos" v={s.cur ? `(${s.cur[0]},${s.cur[1]})` : '—'} tone="accent" />
        <RailStat k="val" v={s.cur ? `'${s.matrix[s.cur[0]][s.cur[1]]}'` : '—'} />
        <RailStat k="up" v={s.cur ? cell(s.cur[0] - 1, s.cur[1]) : '—'} />
        <RailStat k="left" v={s.cur ? cell(s.cur[0], s.cur[1] - 1) : '—'} />
        <RailStat k="diag" v={s.cur ? cell(s.cur[0] - 1, s.cur[1] - 1) : '—'} />
      </RailGroup>
      <RailGroup label="best">
        <RailStat k="side" v={s.best} tone={s.best > 0 ? 'accent' : undefined} />
      </RailGroup>
      <RailResult label="area" value={s.done ? area : '…'} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <GridBoard grid={display} cellTone={cellTone} active={s.cur} cellSize={40} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MSState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (r: number, c: number) => (r >= 0 && c >= 0 && s.dp[r]?.[c] >= 0 ? s.dp[r][c] : '—');
  return (
    <VarGrid>
      <InspectorRow k="matrix" v={`${s.m}×${s.n}`} />
      <InspectorRow k="cell" v={s.cur ? `dp[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="value here" v={s.cur ? `'${s.matrix[s.cur[0]][s.cur[1]]}'` : '—'} />
      <InspectorRow k="up" v={s.cur ? cell(s.cur[0] - 1, s.cur[1]) : '—'} />
      <InspectorRow k="left" v={s.cur ? cell(s.cur[0], s.cur[1] - 1) : '—'} />
      <InspectorRow k="diagonal" v={s.cur ? cell(s.cur[0] - 1, s.cur[1] - 1) : '—'} />
      <InspectorRow k="best side" v={s.best} />
      <InspectorRow k="answer" v={s.done ? `area ${s.best * s.best}` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-71-maximal-square';
export const title = 'Maximal Square';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'm4x5',
      label: '4×5 matrix (answer 4)',
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
      id: 'm2x2',
      label: '2×2 all ones (answer 4)',
      value: {
        matrix: [
          ['1', '1'],
          ['1', '1'],
        ],
      },
    },
  ] satisfies SampleInput<MSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MSState | undefined;
    const v = s ? s.best * s.best : 0;
    return { ok: true, label: `area ${v}` };
  },
};

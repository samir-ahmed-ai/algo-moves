import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface UPInput {
  m: number; // rows
  n: number; // cols
}

interface UPState {
  m: number;
  n: number;
  dp: number[][]; // -1 = not yet filled
  cur: [number, number] | null;
  done: boolean;
}

function record({ m, n }: UPInput): Frame<UPState>[] {
  const dp: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(-1));
  const frames: Frame<UPState>[] = [];

  const emit = (type: string, note: string, caption: string, cur: [number, number] | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { m, n, dp: dp.map((r) => r.slice()), cur, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `${m}×${n}`,
    `Unique Paths: count the paths from the top-left to the bottom-right of a ${m}×${n} grid moving only right or down. dp[i][j] is the number of ways to reach cell (i, j).`,
    null,
  );

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (i === 0 && j === 0) {
        dp[i][j] = 1;
        emit('BASE', `dp[0][0]=1`, `Base case: there is exactly 1 way to be at the start cell (0, 0).`, [i, j]);
      } else if (i === 0) {
        dp[i][j] = 1;
        emit('EDGE', `dp[0][${j}]=1`, `Top row: cell (0, ${j}) is only reachable by moving right the whole way — 1 path.`, [i, j]);
      } else if (j === 0) {
        dp[i][j] = 1;
        emit('EDGE', `dp[${i}][0]=1`, `Left column: cell (${i}, 0) is only reachable by moving down the whole way — 1 path.`, [i, j]);
      } else {
        const up = dp[i - 1][j];
        const left = dp[i][j - 1];
        dp[i][j] = up + left;
        emit(
          'FILL',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `Reach (${i}, ${j}) from above (${i - 1}, ${j}) = ${up} or from the left (${i}, ${j - 1}) = ${left}: dp[${i}][${j}] = ${up} + ${left} = ${dp[i][j]}.`,
          [i, j],
        );
      }
    }
  }

  emit('DONE', `${dp[m - 1][n - 1]} paths`, `The grid is full. dp[${m - 1}][${n - 1}] = ${dp[m - 1][n - 1]}, so there are ${dp[m - 1][n - 1]} unique paths.`, [m - 1, n - 1], 'good');
  return frames;
}

function View({ frame }: PluginViewProps<UPState>) {
  const s = frame.state;
  const display: (number | string)[][] = s.dp.map((row) => row.map((v) => (v < 0 ? '' : v)));
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (r === s.m - 1 && c === s.n - 1) return 'path';
    return s.dp[r][c] >= 0 ? 'visited' : '';
  };
  const ans = s.dp[s.m - 1][s.n - 1] >= 0 ? s.dp[s.m - 1][s.n - 1] : '…filling';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.m}×{s.n} grid, unique paths = <span className="font-mono text-ink">{ans}</span>
      </div>
      <GridBoard grid={display} cellTone={cellTone} active={s.cur} cellSize={40} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<UPState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (r: number, c: number) => (r >= 0 && c >= 0 && s.dp[r]?.[c] >= 0 ? s.dp[r][c] : '—');
  const done = s.dp[s.m - 1][s.n - 1] >= 0;
  return (
    <VarGrid>
      <InspectorRow k="grid" v={`${s.m}×${s.n}`} />
      <InspectorRow k="cell" v={s.cur ? `dp[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="from above" v={s.cur ? cell(s.cur[0] - 1, s.cur[1]) : '—'} />
      <InspectorRow k="from left" v={s.cur ? cell(s.cur[0], s.cur[1] - 1) : '—'} />
      <InspectorRow k="answer" v={done ? `${s.dp[s.m - 1][s.n - 1]} paths` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-77-unique-paths';
export const title = 'Unique Paths';

export const simulator: DpSimulator = {
  inputs: [
    { id: '3x3', label: '3 × 3', value: { m: 3, n: 3 } },
    { id: '3x4', label: '3 × 4', value: { m: 3, n: 4 } },
  ] satisfies SampleInput<UPInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as UPState | undefined;
    const v = s ? s.dp[s.m - 1][s.n - 1] : 0;
    return { ok: true, label: `${v} paths` };
  },
};

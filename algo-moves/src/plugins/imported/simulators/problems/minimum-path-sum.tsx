import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MPSInput {
  grid: number[][];
}

interface MPSState {
  grid: number[][]; // the cost grid (input)
  m: number;
  n: number;
  dp: number[][]; // -1 = not yet filled
  cur: [number, number] | null;
  done: boolean;
}

function record({ grid }: MPSInput): Frame<MPSState>[] {
  const m = grid.length;
  const n = grid[0].length;
  const dp: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(-1));
  const frames: Frame<MPSState>[] = [];

  const emit = (type: string, note: string, caption: string, cur: [number, number] | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { grid: grid.map((r) => r.slice()), m, n, dp: dp.map((r) => r.slice()), cur, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `${m}×${n}`,
    `Minimum Path Sum: walk from the top-left to the bottom-right of the cost grid moving only right or down, minimising the sum of cells visited. dp[i][j] is the cheapest cost to reach cell (i, j).`,
    null,
  );

  // Base cell.
  dp[0][0] = grid[0][0];
  emit('BASE', `dp[0][0]=${dp[0][0]}`, `Base case: the only way to be at the start (0, 0) is to start there, so dp[0][0] = grid[0][0] = ${grid[0][0]}.`, [0, 0]);

  // First row: prefix sums (only reachable from the left).
  for (let c = 1; c < n; c++) {
    dp[0][c] = dp[0][c - 1] + grid[0][c];
    emit(
      'EDGE',
      `dp[0][${c}]=${dp[0][c]}`,
      `Top row: cell (0, ${c}) is only reachable from the left (0, ${c - 1}) = ${dp[0][c - 1]}, plus its own cost grid[0][${c}] = ${grid[0][c]}, so dp[0][${c}] = ${dp[0][c - 1]} + ${grid[0][c]} = ${dp[0][c]}.`,
      [0, c],
    );
  }

  // First column: prefix sums (only reachable from above).
  for (let r = 1; r < m; r++) {
    dp[r][0] = dp[r - 1][0] + grid[r][0];
    emit(
      'EDGE',
      `dp[${r}][0]=${dp[r][0]}`,
      `Left column: cell (${r}, 0) is only reachable from above (${r - 1}, 0) = ${dp[r - 1][0]}, plus its own cost grid[${r}][0] = ${grid[r][0]}, so dp[${r}][0] = ${dp[r - 1][0]} + ${grid[r][0]} = ${dp[r][0]}.`,
      [r, 0],
    );
  }

  // Interior cells.
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      const up = dp[r - 1][c];
      const left = dp[r][c - 1];
      const cheaper = Math.min(up, left);
      const fromLabel = up <= left ? `above (${r - 1}, ${c}) = ${up}` : `the left (${r}, ${c - 1}) = ${left}`;
      dp[r][c] = grid[r][c] + cheaper;
      emit(
        'FILL',
        `dp[${r}][${c}]=${dp[r][c]}`,
        `Reach (${r}, ${c}) via the cheaper neighbour: above (${r - 1}, ${c}) = ${up} vs the left (${r}, ${c - 1}) = ${left}, so take ${fromLabel}. Add its own cost grid[${r}][${c}] = ${grid[r][c]}: dp[${r}][${c}] = ${grid[r][c]} + ${cheaper} = ${dp[r][c]}.`,
        [r, c],
      );
    }
  }

  emit(
    'DONE',
    `min sum ${dp[m - 1][n - 1]}`,
    `The table is full. dp[${m - 1}][${n - 1}] = ${dp[m - 1][n - 1]}, so the cheapest path sum from top-left to bottom-right is ${dp[m - 1][n - 1]}.`,
    [m - 1, n - 1],
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MPSState>) {
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
        cost grid {`[${s.grid.map((r) => `[${r.join(',')}]`).join(',')}]`}, min path sum = <span className="font-mono text-ink">{ans}</span>
      </div>
      <GridBoard grid={display} cellTone={cellTone} active={s.cur} cellSize={40} />
      <div className={cn(vizText.sm, 'text-ink3')}>each cell = cheapest cost to reach it</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MPSState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (r: number, c: number) => (r >= 0 && c >= 0 && s.dp[r]?.[c] >= 0 ? s.dp[r][c] : '—');
  const done = s.dp[s.m - 1][s.n - 1] >= 0;
  return (
    <VarGrid>
      <InspectorRow k="grid" v={`${s.m}×${s.n}`} />
      <InspectorRow k="cell" v={s.cur ? `dp[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="cost here" v={s.cur ? s.grid[s.cur[0]][s.cur[1]] : '—'} />
      <InspectorRow k="from above" v={s.cur ? cell(s.cur[0] - 1, s.cur[1]) : '—'} />
      <InspectorRow k="from left" v={s.cur ? cell(s.cur[0], s.cur[1] - 1) : '—'} />
      <InspectorRow k="answer" v={done ? `min sum ${s.dp[s.m - 1][s.n - 1]}` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-74-minimum-path-sum';
export const title = 'Minimum Path Sum';

export const simulator: DpSimulator = {
  inputs: [
    {
      id: 'g3x3',
      label: '[[1,3,1],[1,5,1],[4,2,1]]',
      value: { grid: [[1, 3, 1], [1, 5, 1], [4, 2, 1]] },
    },
    {
      id: 'g2x3',
      label: '[[1,2,3],[4,5,6]]',
      value: { grid: [[1, 2, 3], [4, 5, 6]] },
    },
  ] satisfies SampleInput<MPSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MPSState | undefined;
    const v = s ? s.dp[s.m - 1][s.n - 1] : 0;
    return { ok: true, label: `min sum ${v}` };
  },
};

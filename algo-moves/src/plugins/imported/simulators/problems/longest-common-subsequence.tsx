import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LCSInput {
  a: string;
  b: string;
}

interface LCSState {
  a: string;
  b: string;
  dp: number[][]; // (m+1) x (n+1), -1 = not yet filled
  cur: [number, number] | null;
  done: boolean;
}

function record({ a, b }: LCSInput): Frame<LCSState>[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(-1));
  const frames: Frame<LCSState>[] = [];

  const emit = (type: string, note: string, caption: string, cur: [number, number] | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { a, b, dp: dp.map((r) => r.slice()), cur, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `"${a}" vs "${b}"`,
    `Longest Common Subsequence: find the length of the longest subsequence common to "${a}" and "${b}". dp[i][j] is the LCS length using the first i chars of "${a}" and the first j chars of "${b}", built bottom-up.`,
    null,
  );

  for (let j = 0; j <= n; j++) {
    dp[0][j] = 0;
    emit('BASE', `dp[0][${j}]=0`, `Base case: with 0 chars of "${a}" the LCS is empty, so dp[0][${j}] = 0.`, [0, j]);
  }
  for (let i = 1; i <= m; i++) {
    dp[i][0] = 0;
    emit('BASE', `dp[${i}][0]=0`, `Base case: with 0 chars of "${b}" the LCS is empty, so dp[${i}][0] = 0.`, [i, 0]);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const ca = a[i - 1];
      const cb = b[j - 1];
      if (ca === cb) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        emit(
          'FILL',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `'${ca}' == '${cb}': the match extends the diagonal. dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i - 1][j - 1]} + 1 = ${dp[i][j]}.`,
          [i, j],
        );
      } else {
        const up = dp[i - 1][j];
        const left = dp[i][j - 1];
        dp[i][j] = Math.max(up, left);
        emit(
          'FILL',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `'${ca}' != '${cb}': carry the better neighbour. dp[${i}][${j}] = max(up dp[${i - 1}][${j}]=${up}, left dp[${i}][${j - 1}]=${left}) = ${dp[i][j]}.`,
          [i, j],
        );
      }
    }
  }

  emit(
    'DONE',
    `LCS = ${dp[m][n]}`,
    `The table is full. dp[${m}][${n}] = ${dp[m][n]}, so the longest common subsequence of "${a}" and "${b}" has length ${dp[m][n]}.`,
    [m, n],
    'good',
  );
  return frames;
}

function buildDisplay(s: LCSState): (number | string)[][] {
  const m = s.a.length;
  const n = s.b.length;
  const display: (number | string)[][] = Array.from({ length: m + 2 }, () => new Array<number | string>(n + 2).fill(''));
  display[0][1] = 'ε';
  for (let j = 0; j < n; j++) display[0][j + 2] = s.b[j];
  display[1][0] = 'ε';
  for (let i = 0; i < m; i++) display[i + 2][0] = s.a[i];
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      display[i + 1][j + 1] = s.dp[i][j] < 0 ? '' : s.dp[i][j];
    }
  }
  return display;
}

function View({ frame }: PluginViewProps<LCSState>) {
  const s = frame.state;
  const display = buildDisplay(s);
  const m = s.a.length;
  const n = s.b.length;
  const ans = s.dp[m][n] >= 0 ? s.dp[m][n] : '…filling';
  const displayActive: [number, number] | null = s.cur ? [s.cur[0] + 1, s.cur[1] + 1] : null;
  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'land';
    if (s.cur && s.cur[0] + 1 === r && s.cur[1] + 1 === c) return 'active';
    return s.dp[r - 1][c - 1] >= 0 ? 'visited' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        <span className="font-mono text-ink">"{s.a}"</span> vs <span className="font-mono text-ink">"{s.b}"</span>, LCS ={' '}
        <span className="font-mono text-ink">{ans}</span>
      </div>
      <GridBoard grid={display} cellTone={cellTone} active={displayActive} cellSize={36} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LCSState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const m = s.a.length;
  const n = s.b.length;
  const cell = (r: number, c: number) => (r >= 0 && c >= 0 && s.dp[r]?.[c] >= 0 ? s.dp[r][c] : '—');
  const answer = s.dp[m][n] >= 0 ? s.dp[m][n] : '…filling';
  return (
    <VarGrid>
      <InspectorRow k="text1" v={`"${s.a}"`} />
      <InspectorRow k="text2" v={`"${s.b}"`} />
      <InspectorRow k="cell" v={s.cur ? `dp[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="diagonal" v={s.cur ? cell(s.cur[0] - 1, s.cur[1] - 1) : '—'} />
      <InspectorRow k="from above" v={s.cur ? cell(s.cur[0] - 1, s.cur[1]) : '—'} />
      <InspectorRow k="from left" v={s.cur ? cell(s.cur[0], s.cur[1] - 1) : '—'} />
      <InspectorRow k="dp[m][n]" v={answer} />
    </VarGrid>
  );
}

export const manifestId = 'imp-65-longest-common-subsequence';
export const title = 'Longest Common Subsequence';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'abcde-ace', label: '"abcde" vs "ace"', value: { a: 'abcde', b: 'ace' } },
    { id: 'abc-abc', label: '"abc" vs "abc"', value: { a: 'abc', b: 'abc' } },
  ] satisfies SampleInput<LCSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LCSState | undefined;
    const v = s ? s.dp[s.a.length][s.b.length] : 0;
    return { ok: true, label: `LCS = ${v}` };
  },
};

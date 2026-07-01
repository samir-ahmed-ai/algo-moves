import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface EDInput {
  a: string;
  b: string;
}

interface EDState {
  a: string;
  b: string;
  dp: number[][]; // (m+1) x (n+1), -1 = not yet filled
  cur: [number, number] | null; // dp coords
  done: boolean;
}

function record({ a, b }: EDInput): Frame<EDState>[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(-1));
  const frames: Frame<EDState>[] = [];

  const emit = (type: string, note: string, caption: string, cur: [number, number] | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { a, b, dp: dp.map((r) => r.slice()), cur, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `"${a}" → "${b}"`,
    `Edit Distance: the fewest single-character inserts, deletes, or replaces to turn "${a}" into "${b}". dp[i][j] is the edit distance between the first i chars of "${a}" and the first j chars of "${b}".`,
    null,
  );

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
    emit('BASE', `dp[${i}][0]=${i}`, `Base case: turning the first ${i} char(s) of "${a}" into "" needs ${i} deletion(s), so dp[${i}][0] = ${i}.`, [i, 0]);
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = j;
    emit('BASE', `dp[0][${j}]=${j}`, `Base case: turning "" into the first ${j} char(s) of "${b}" needs ${j} insertion(s), so dp[0][${j}] = ${j}.`, [0, j]);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const ca = a[i - 1];
      const cb = b[j - 1];
      if (ca === cb) {
        dp[i][j] = dp[i - 1][j - 1];
        emit(
          'FILL',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `'${ca}' == '${cb}': no edit is needed here, so carry the diagonal dp[${i - 1}][${j - 1}] = ${dp[i][j]} into dp[${i}][${j}].`,
          [i, j],
        );
      } else {
        const del = dp[i - 1][j];
        const ins = dp[i][j - 1];
        const rep = dp[i - 1][j - 1];
        const best = Math.min(del, ins, rep);
        dp[i][j] = 1 + best;
        emit(
          'FILL',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `'${ca}' != '${cb}': dp[${i}][${j}] = 1 + min(delete dp[${i - 1}][${j}]=${del}, insert dp[${i}][${j - 1}]=${ins}, replace dp[${i - 1}][${j - 1}]=${rep}) = 1 + ${best} = ${dp[i][j]}.`,
          [i, j],
        );
      }
    }
  }

  emit('DONE', `${dp[m][n]} edits`, `The table is full. dp[${m}][${n}] = ${dp[m][n]}, so turning "${a}" into "${b}" takes ${dp[m][n]} edit(s).`, [m, n], 'good');
  return frames;
}

function buildDisplay(s: EDState): (number | string)[][] {
  const m = s.a.length;
  const n = s.b.length;
  const display: (number | string)[][] = Array.from({ length: m + 2 }, () => new Array<number | string>(n + 2).fill(''));
  display[0][0] = '';
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

function View({ frame }: PluginViewProps<EDState>) {
  const s = frame.state;
  const display = buildDisplay(s);
  const m = s.a.length;
  const n = s.b.length;
  const dist = s.dp[m][n] >= 0 ? s.dp[m][n] : '…filling';
  const displayActive: [number, number] | null = s.cur ? [s.cur[0] + 1, s.cur[1] + 1] : null;
  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'land';
    if (r === m + 1 && c === n + 1) return 'path';
    if (s.cur && s.cur[0] + 1 === r && s.cur[1] + 1 === c) return 'active';
    const v = s.dp[r - 1][c - 1];
    return v >= 0 ? 'visited' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        <span className="font-mono text-ink">"{s.a}"</span> → <span className="font-mono text-ink">"{s.b}"</span>, distance ={' '}
        <span className="font-mono text-ink">{dist}</span>
      </div>
      <GridBoard grid={display} cellTone={cellTone} active={displayActive} cellSize={34} />
      <div className={cn(vizText.sm, 'text-ink3')}>row = chars of word1, col = chars of word2</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<EDState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const m = s.a.length;
  const n = s.b.length;
  const curVal = s.cur && s.dp[s.cur[0]][s.cur[1]] >= 0 ? s.dp[s.cur[0]][s.cur[1]] : '—';
  const answer = s.dp[m][n] >= 0 ? `${s.dp[m][n]} edits` : '…filling';
  return (
    <VarGrid>
      <InspectorRow k="word1" v={`"${s.a}"`} />
      <InspectorRow k="word2" v={`"${s.b}"`} />
      <InspectorRow k="cell" v={s.cur ? `dp[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="cell value" v={curVal} />
      <InspectorRow k="answer" v={answer} />
    </VarGrid>
  );
}

export const manifestId = 'imp-61-edit-distance';
export const title = 'Edit Distance';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'horse-ros', label: '"horse" → "ros" (3)', value: { a: 'horse', b: 'ros' } },
    { id: 'intention-execution', label: '"intention" → "execution" (5)', value: { a: 'intention', b: 'execution' } },
  ] satisfies SampleInput<EDInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as EDState | undefined;
    const v = s ? s.dp[s.a.length][s.b.length] : 0;
    return { ok: true, label: `${v} edits` };
  },
};

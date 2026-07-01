import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { DpCell, DpHeader, InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LPSInput {
  s: string;
}

interface LPSState {
  s: string;
  dp: number[][]; // -1 = not yet filled; dp[i][j] = LPS length in s[i..j]
  cur: [number, number] | null;
  done: boolean;
}

function record({ s }: LPSInput): Frame<LPSState>[] {
  const n = s.length;
  const dp: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  const frames: Frame<LPSState>[] = [];

  const emit = (type: string, note: string, caption: string, cur: [number, number] | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { s, dp: dp.map((r) => r.slice()), cur, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `s="${s}"`,
    `Longest Palindromic Subsequence: dp[i][j] is the length of the longest palindromic subsequence inside the substring s[i..j]. We only fill the upper triangle (i ≤ j) and build it up by increasing substring length.`,
    null,
  );

  // Base diagonal: single characters are palindromes of length 1.
  for (let i = 0; i < n; i++) {
    dp[i][i] = 1;
    emit('BASE', `dp[${i}][${i}]=1`, `Base case: the single character "${s[i]}" is a palindrome of length 1, so dp[${i}][${i}] = 1.`, [i, i]);
  }

  // Fill by increasing substring length (len = 2..n).
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      if (s[i] === s[j]) {
        const inner = len === 2 ? 0 : dp[i + 1][j - 1];
        dp[i][j] = inner + 2;
        emit(
          'MATCH',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `s[${i}]="${s[i]}" matches s[${j}]="${s[j]}": wrap them around the inner result dp[${i + 1}][${j - 1}] = ${inner}, so dp[${i}][${j}] = ${inner} + 2 = ${dp[i][j]}.`,
          [i, j],
        );
      } else {
        const drop = dp[i + 1][j];
        const keep = dp[i][j - 1];
        dp[i][j] = Math.max(drop, keep);
        emit(
          'SKIP',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `s[${i}]="${s[i]}" ≠ s[${j}]="${s[j]}": take the better of dropping the left end dp[${i + 1}][${j}] = ${drop} or the right end dp[${i}][${j - 1}] = ${keep}, so dp[${i}][${j}] = ${dp[i][j]}.`,
          [i, j],
        );
      }
    }
  }

  const ans = n > 0 ? dp[0][n - 1] : 0;
  emit('DONE', `LPS = ${ans}`, `The table is full. dp[0][${n - 1}] = ${ans}, so the longest palindromic subsequence of "${s}" has length ${ans}.`, n > 0 ? [0, n - 1] : null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<LPSState>) {
  const st = frame.state;
  const n = st.s.length;
  const display: (number | string)[][] = st.dp.map((row) => row.map((v) => (v < 0 ? '' : v)));
  const cellTone = (r: number, c: number) => {
    if (c < r) return 'water'; // unused lower triangle
    if (st.cur && st.cur[0] === r && st.cur[1] === c) return 'active';
    if (r === 0 && c === n - 1 && st.dp[r][c] >= 0) return 'path';
    return st.dp[r][c] >= 0 ? 'visited' : '';
  };
  const ans = n > 0 && st.dp[0][n - 1] >= 0 ? st.dp[0][n - 1] : '…filling';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">{st.s}</span>, LPS length = <span className="font-mono text-ink">{ans}</span>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-[2px] pt-[26px]">
          {st.s.split('').map((ch, i) => (
            <DpCell key={i} width={18} height={40} tone="text-ink3">
              {ch}
            </DpCell>
          ))}
        </div>
        <div className="flex flex-col gap-[2px]">
          <div className="flex gap-[2px]">
            {st.s.split('').map((ch, j) => (
              <DpHeader key={j} width={40}>
                {ch}
              </DpHeader>
            ))}
          </div>
          <GridBoard grid={display} cellTone={cellTone} label={(r, c) => (c < r ? '' : display[r][c])} active={st.cur} cellSize={40} />
        </div>
      </div>
      <div className={cn(vizText.xs, 'text-ink3')}>Rows/cols are indexed by the characters of s; dp[i][j] covers s[i..j]. The lower triangle is unused.</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LPSState>) {
  if (!frame) return <VizEmpty />;
  const st = frame.state;
  const n = st.s.length;
  const done = n > 0 && st.dp[0][n - 1] >= 0;
  const i = st.cur ? st.cur[0] : -1;
  const j = st.cur ? st.cur[1] : -1;
  const sub = i >= 0 && j >= 0 ? st.s.slice(i, j + 1) : '—';
  return (
    <VarGrid>
      <InspectorRow k="s" v={st.s} />
      <InspectorRow k="cell" v={st.cur ? `dp[${i}][${j}]` : '—'} />
      <InspectorRow k="substring" v={st.cur ? `"${sub}"` : '—'} />
      <InspectorRow k="ends" v={st.cur ? `${st.s[i]} / ${st.s[j]}` : '—'} />
      <InspectorRow k="answer" v={done ? `LPS = ${st.dp[0][n - 1]}` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-67-longest-palindromic-subsequence';
export const title = 'Longest Palindromic Subsequence';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'bbbab', label: 's = "bbbab"', value: { s: 'bbbab' } },
    { id: 'cbbd', label: 's = "cbbd"', value: { s: 'cbbd' } },
  ] satisfies SampleInput<LPSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const st = frames[frames.length - 1]?.state as LPSState | undefined;
    const n = st ? st.s.length : 0;
    const v = st && n > 0 ? st.dp[0][n - 1] : 0;
    return { ok: true, label: `LPS = ${v}` };
  },
};

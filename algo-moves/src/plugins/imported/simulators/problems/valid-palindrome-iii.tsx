import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { DpCell, DpHeader, InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface VP3Input {
  s: string;
  k: number;
}

interface VP3State {
  s: string;
  k: number;
  dp: number[][]; // -1 = not yet filled; dp[i][j] = LPS length in s[i..j]
  cur: [number, number] | null;
  done: boolean;
}

function record({ s, k }: VP3Input): Frame<VP3State>[] {
  const n = s.length;
  const dp: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  const frames: Frame<VP3State>[] = [];

  const emit = (type: string, note: string, caption: string, cur: [number, number] | null, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { s, k, dp: dp.map((r) => r.slice()), cur, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `s="${s}", k=${k}`,
    `Valid Palindrome III: "${s}" is k-palindrome if removing at most k = ${k} characters makes it a palindrome. The fewest removals needed is n − LPS(s), so we compute the LPS table where dp[i][j] is the longest palindromic subsequence in s[i..j], then check (n − dp[0][n−1]) ≤ k.`,
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

  const lps = n > 0 ? dp[0][n - 1] : 0;
  const removals = n - lps;
  const ok = removals <= k;
  emit(
    'DONE',
    ok ? `true (${removals} ≤ ${k})` : `false (${removals} > ${k})`,
    `LPS("${s}") = dp[0][${n - 1}] = ${lps}, so the fewest removals to make a palindrome is n − LPS = ${n} − ${lps} = ${removals}. Since ${removals} ${ok ? '≤' : '>'} k = ${k}, "${s}" is ${ok ? '' : 'not '}a ${k}-palindrome → ${ok ? 'true' : 'false'}.`,
    n > 0 ? [0, n - 1] : null,
    ok ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<VP3State>) {
  const st = frame.state;
  const n = st.s.length;
  const display: (number | string)[][] = st.dp.map((row) => row.map((v) => (v < 0 ? '' : v)));
  const cellTone = (r: number, c: number) => {
    if (c < r) return 'water'; // unused lower triangle
    if (st.cur && st.cur[0] === r && st.cur[1] === c) return 'active';
    if (r === 0 && c === n - 1 && st.dp[r][c] >= 0) return 'path';
    return st.dp[r][c] >= 0 ? 'visited' : '';
  };
  const lpsReady = n > 0 && st.dp[0][n - 1] >= 0;
  const lps = lpsReady ? st.dp[0][n - 1] : null;
  const removals = lps === null ? null : n - lps;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">{st.s}</span>, k = <span className="font-mono text-ink">{st.k}</span>
        {removals === null ? (
          <>, computing LPS…</>
        ) : (
          <>
            , n − LPS = {n} − {lps} = <span className="font-mono text-ink">{removals}</span> {removals <= st.k ? '≤' : '>'} k → {' '}
            <span className="font-mono text-ink">{removals <= st.k ? 'true' : 'false'}</span>
          </>
        )}
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
      <div className={cn(vizText.xs, 'text-ink3')}>dp[i][j] = longest palindromic subsequence of s[i..j]; the answer needs only dp[0][{n - 1}] = LPS(s).</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<VP3State>) {
  if (!frame) return <VizEmpty />;
  const st = frame.state;
  const n = st.s.length;
  const lpsReady = n > 0 && st.dp[0][n - 1] >= 0;
  const lps = lpsReady ? st.dp[0][n - 1] : null;
  const removals = lps === null ? null : n - lps;
  const i = st.cur ? st.cur[0] : -1;
  const j = st.cur ? st.cur[1] : -1;
  const sub = i >= 0 && j >= 0 ? st.s.slice(i, j + 1) : '—';
  return (
    <VarGrid>
      <InspectorRow k="s" v={st.s} />
      <InspectorRow k="k" v={st.k} />
      <InspectorRow k="n" v={n} />
      <InspectorRow k="cell" v={st.cur ? `dp[${i}][${j}]` : '—'} />
      <InspectorRow k="substring" v={st.cur ? `"${sub}"` : '—'} />
      <InspectorRow k="LPS" v={lps === null ? '…filling' : lps} />
      <InspectorRow k="n − LPS" v={removals === null ? '—' : removals} />
      <InspectorRow k="answer" v={removals === null ? '…filling' : removals <= st.k ? 'true' : 'false'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-85-valid-palindrome-iii';
export const title = 'Valid Palindrome III';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'abcdeca-2', label: 's = "abcdeca", k = 2', value: { s: 'abcdeca', k: 2 } },
    { id: 'abbababa-1', label: 's = "abbababa", k = 1', value: { s: 'abbababa', k: 1 } },
  ] satisfies SampleInput<VP3Input>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const st = frames[frames.length - 1]?.state as VP3State | undefined;
    if (!st || st.s.length === 0) return { ok: true, label: 'true' };
    const n = st.s.length;
    const removals = n - st.dp[0][n - 1];
    const ok = removals <= st.k;
    return { ok, label: ok ? `true (${removals} ≤ ${st.k})` : `false (${removals} > ${st.k})` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MDInput {
  s: string;
}

interface MDState {
  s: string;
  dp: number[]; // -1 = not yet filled; dp[i] = min deletions over the first i+1 chars
  i: number | null;
  bCount: number; // running count of 'b's seen so far (including current)
  done: boolean;
}

function record({ s }: MDInput): Frame<MDState>[] {
  const n = s.length;
  const dp = new Array<number>(n).fill(-1);
  const frames: Frame<MDState>[] = [];
  let bCount = 0;
  let cur = 0; // running dp value (deletions for the prefix processed so far)

  const emit = (type: string, note: string, caption: string, i: number | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { s, dp: dp.slice(), i, bCount, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `s="${s}"`,
    `Minimum Deletions to Make String Balanced: delete the fewest characters from "${s}" so no 'b' ever comes before an 'a'. Scan left to right tracking bCount (how many 'b' seen) and dp (min deletions for the prefix so far).`,
    null,
  );

  for (let i = 0; i < n; i++) {
    if (s[i] === 'b') {
      bCount++;
      dp[i] = cur;
      emit(
        'SEE_B',
        `dp[${i}]=${cur}`,
        `s[${i}]='b': a 'b' never violates balance on its own, so deletions stay at ${cur}. We just remember it by bumping bCount to ${bCount}.`,
        i,
      );
    } else {
      // s[i] === 'a': either delete this 'a' (cur+1) or delete all prior 'b's (bCount)
      const next = cur + 1 < bCount ? cur + 1 : bCount;
      const deleteA = cur + 1 < bCount;
      cur = next;
      dp[i] = cur;
      emit(
        'SEE_A',
        `dp[${i}]=${cur}`,
        deleteA
          ? `s[${i}]='a' sits after ${bCount} 'b'(s). Cheaper to delete this single 'a' (${cur - 1} + 1 = ${cur}) than to delete all ${bCount} prior 'b's, so dp[${i}] = ${cur}.`
          : `s[${i}]='a' sits after ${bCount} 'b'(s). Deleting all ${bCount} prior 'b's (${bCount}) is at least as cheap as deleting this 'a' (${cur} + 1), so dp[${i}] = ${bCount}.`,
        i,
      );
    }
  }

  emit(
    'DONE',
    `${cur} deletions`,
    n === 0
      ? `The string is empty — it is already balanced, so 0 deletions are needed.`
      : `Scan complete. The minimum deletions to balance "${s}" is dp[${n - 1}] = ${cur}.`,
    n > 0 ? n - 1 : null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MDState>) {
  const s = frame.state;
  const cells = s.dp.map((v, i) => (v < 0 ? s.s[i] : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: `'${s.s[s.i]}'`, tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'found' : s.dp[i] >= 0 ? 'match' : '');
  const lastFilled = (() => {
    let v = '…filling' as string | number;
    for (let i = s.dp.length - 1; i >= 0; i--) {
      if (s.dp[i] >= 0) {
        v = s.dp[i];
        break;
      }
    }
    return v;
  })();
  const ans = s.done ? lastFilled : '…filling';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">"{s.s}"</span>, min deletions ={' '}
        <span className="font-mono text-ink">{ans}</span>, bCount ={' '}
        <span className="font-mono text-ink">{s.bCount}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} label={(i) => s.s[i]} />
      <div className={cn(vizText.sm, 'text-ink3')}>cell = dp[i] (min deletions for the prefix ending at i); index shows the character</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MDState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (i: number) => (i >= 0 && i < s.dp.length && s.dp[i] >= 0 ? s.dp[i] : '—');
  let answer: string | number = '…filling';
  if (s.done) {
    for (let i = s.dp.length - 1; i >= 0; i--) {
      if (s.dp[i] >= 0) {
        answer = `${s.dp[i]} deletions`;
        break;
      }
    }
    if (s.dp.length === 0) answer = '0 deletions';
  }
  return (
    <VarGrid>
      <InspectorRow k="s" v={`"${s.s}"`} />
      <InspectorRow k="i" v={s.i !== null ? `${s.i} ('${s.s[s.i]}')` : '—'} />
      <InspectorRow k="dp[i]" v={s.i !== null ? cell(s.i) : '—'} />
      <InspectorRow k="bCount" v={s.bCount} />
      <InspectorRow k="answer" v={answer} />
    </VarGrid>
  );
}

export const manifestId = 'imp-75-minimum-deletions-to-make-string-balanced';
export const title = 'Minimum Deletions to Make String Balanced';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'aababbab', label: 's = "aababbab"', value: { s: 'aababbab' } },
    { id: 'bbaaaaabb', label: 's = "bbaaaaabb"', value: { s: 'bbaaaaabb' } },
  ] satisfies SampleInput<MDInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as MDState) ?? null;
    let v = 0;
    if (s) {
      for (let i = s.dp.length - 1; i >= 0; i--) {
        if (s.dp[i] >= 0) {
          v = s.dp[i];
          break;
        }
      }
    }
    return { ok: true, label: `${v} deletions` };
  },
};

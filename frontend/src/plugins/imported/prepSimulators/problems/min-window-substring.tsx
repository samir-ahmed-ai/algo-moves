import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MinWindowInput {
  s: string;
  t: string;
}

interface MinWindowState {
  s: string; // the search string, one char per cell
  t: string; // the pattern we must cover
  l: number | null; // left edge of the sliding window
  r: number | null; // right edge (char just added)
  required: number; // distinct chars in t we must satisfy
  formed: number; // distinct chars currently satisfied
  window: [number, number] | null; // current window [l, r], null before start
  best: [number, number] | null; // best (smallest) window found so far
  result: string | null; // final answer once known
  done: boolean;
}

// Re-implements the Go sliding-window minWindowSubstring: grow r until every
// char in t is covered (formed === required), then shrink l to the smallest
// covering window, recording the best. Time O(n), Space O(1) (bounded alphabet).
function record({ s, t }: MinWindowInput): Frame<MinWindowState>[] {
  const need = new Map<string, number>();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);
  const required = need.size;

  let formed = 0;
  const have = new Map<string, number>();
  let l = 0;
  let bestL = 0;
  let bestLen = Number.MAX_SAFE_INTEGER;

  const { emit, frames } = createRecorder<MinWindowState>(() => ({
        s,
        t,
        l: null,
        r: null,
        required,
        formed,
        window: null,
        best: bestLen === Number.MAX_SAFE_INTEGER ? null : [bestL, bestL + bestLen - 1],
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `t="${t}"`,
    `Min Window Substring: find the shortest slice of s that contains every character of t (with multiplicity). We slide a window over s, growing the right edge to cover t, then shrinking the left edge to make it as small as possible. required = ${required} distinct char(s).`,
    {},
  );

  if (t.length === 0) {
    emit('EMPTY', 'empty t', `t is empty, so the answer is the empty string "".`, { result: '', done: true }, 'bad');
    return frames;
  }

  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    have.set(c, (have.get(c) ?? 0) + 1);
    const cnt = need.get(c);
    const nowFormed = cnt !== undefined && have.get(c) === cnt;
    if (nowFormed) formed++;

    emit(
      'EXPAND',
      `r=${r} '${c}'`,
      cnt !== undefined
        ? nowFormed
          ? `Grow right: add s[${r}]='${c}'. It is in t and we now have enough '${c}' — one more required char is satisfied, so formed = ${formed}/${required}.`
          : `Grow right: add s[${r}]='${c}'. It is in t but we still don't have the full count needed, so formed stays ${formed}/${required}.`
        : `Grow right: add s[${r}]='${c}'. It is not in t, so it can't help coverage — formed stays ${formed}/${required}.`,
      { l, r, window: [l, r] },
    );

    while (formed === required && l <= r) {
      if (r - l + 1 < bestLen) {
        bestLen = r - l + 1;
        bestL = l;
        emit(
          'RECORD',
          `best="${s.slice(bestL, bestL + bestLen)}"`,
          `The window s[${l}..${r}] = "${s.slice(l, r + 1)}" covers all of t and is shorter than any before (length ${bestLen}). Record it as the new best.`,
          { l, r, window: [l, r], best: [bestL, bestL + bestLen - 1] },
          'good',
        );
      }

      const left = s[l];
      have.set(left, (have.get(left) ?? 0) - 1);
      const leftCnt = need.get(left);
      const brokeCoverage = leftCnt !== undefined && (have.get(left) ?? 0) < leftCnt;
      if (brokeCoverage) formed--;

      emit(
        'SHRINK',
        `l=${l}→${l + 1}`,
        brokeCoverage
          ? `Shrink left: drop s[${l}]='${left}'. That was the last copy needed to cover '${left}', so coverage breaks — formed = ${formed}/${required}. Stop shrinking and grow right again.`
          : `Shrink left: drop s[${l}]='${left}'. We still cover t without it, so keep shrinking to look for an even smaller window.`,
        { l: l + 1, r, window: l + 1 <= r ? [l + 1, r] : null },
      );
      l++;
    }
  }

  const result = bestLen === Number.MAX_SAFE_INTEGER ? '' : s.slice(bestL, bestL + bestLen);
  emit(
    'DONE',
    result === '' ? 'no window' : `"${result}"`,
    result === ''
      ? `Reached the end of s without ever covering all of t — there is no valid window, so return "".`
      : `Scan complete. The smallest covering window is "${result}" (s[${bestL}..${bestL + bestLen - 1}]). That is the answer.`,
    { result, done: true, best: result === '' ? null : [bestL, bestL + bestLen - 1] },
    result === '' ? 'bad' : 'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MinWindowState>) {
  const s = frame.state;
  const chars = s.s.split('');
  const pointers: ArrayPointer[] = [];
  if (s.l !== null && s.l < chars.length) pointers.push({ i: s.l, label: 'l', tone: 'good', place: 'below' });
  if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'accent', place: 'above' });

  const tone = (i: number) => {
    if (s.result && s.best && i >= s.best[0] && i <= s.best[1]) return 'found';
    if (s.window && i >= s.window[0] && i <= s.window[1]) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        t = <span className="font-mono text-ink">"{s.t}"</span>
        {' · '}covered{' '}
        <span className="font-mono text-ink">
          {s.formed}/{s.required}
        </span>
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={s.window} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        best {s.best ? `= "${s.s.slice(s.best[0], s.best[1] + 1)}"` : '= (none yet)'}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono', s.result ? 'text-good' : 'text-bad', vizText.base)}>
          → {s.result ? `"${s.result}"` : '"" (no window)'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MinWindowState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const winStr = s.window ? `"${s.s.slice(s.window[0], s.window[1] + 1)}"` : '—';
  const bestStr = s.best ? `"${s.s.slice(s.best[0], s.best[1] + 1)}"` : '—';
  return (
    <VarGrid>
      <InspectorRow k="t" v={`"${s.t}"`} />
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="window" v={winStr} />
      <InspectorRow k="formed / required" v={`${s.formed} / ${s.required}`} />
      <InspectorRow k="best" v={bestStr} />
      <InspectorRow k="result" v={s.result !== null ? (s.result === '' ? '""' : `"${s.result}"`) : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-min-window-substring';
export const title = 'Min window substring';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'mw1', label: 's="ADOBECODEBANC", t="ABC"', value: { s: 'ADOBECODEBANC', t: 'ABC' } },
    { id: 'mw2', label: 's="aa", t="aa"', value: { s: 'aa', t: 'aa' } },
  ] satisfies SampleInput<MinWindowInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MinWindowState | undefined;
    if (!s || s.result === null) return { ok: false, label: 'no window' };
    return s.result === '' ? { ok: false, label: '"" (no window)' } : { ok: true, label: `"${s.result}"` };
  },
};

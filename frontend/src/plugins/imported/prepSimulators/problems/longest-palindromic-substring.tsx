import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LpsInput {
  s: string;
}

interface LpsState {
  chars: string[];
  l: number | null; // left edge of the current expansion
  r: number | null; // right edge of the current expansion
  center: [number, number] | null; // the seed center [i, i] or [i, i+1]
  matched: boolean | null; // did s[l] === s[r] on this compare?
  start: number; // start index of the best palindrome so far
  maxLen: number; // length of the best palindrome so far
  best: string; // the best palindrome string so far
  done: boolean;
}

function record({ s }: LpsInput): Frame<LpsState>[] {
  const chars = s.split('');
  const n = chars.length;
  let start = 0;
  let maxLen = 0;

  const { emit, frames } = createRecorder<LpsState>(() => ({
        chars,
        l: null,
        r: null,
        center: null,
        matched: null,
        start,
        maxLen,
        best: s.slice(start, start + maxLen),
        done: false
      }));

  emit(
    'INIT',
    `s="${s}"`,
    `Longest Palindromic Substring by expand-from-center: every index is a possible mirror center. For each center we grow a window outward while the two edge characters match, then keep the longest span seen. Time O(n^2), Space O(1).`,
    {},
  );

  // Faithful port of Go's expand(l, r): grow while s[l] === s[r], then update best.
  const expand = (l0: number, r0: number, kind: 'odd' | 'even') => {
    const center: [number, number] = [l0, r0];
    let l = l0;
    let r = r0;

    if (kind === 'odd') {
      emit(
        'CENTER',
        `odd @${l0}`,
        `Odd-length center: seed both pointers at index ${l0} (the single character '${chars[l0]}'). Expand outward as long as s[l] === s[r].`,
        { l, r, center, matched: null },
      );
    } else {
      const between =
        r0 < n ? `'${chars[l0]}' and '${chars[r0]}'` : `index ${l0} and index ${r0} (r is off the end)`;
      emit(
        'CENTER',
        `even @${l0},${r0}`,
        `Even-length center: seed the gap between ${between}. Expand outward as long as s[l] === s[r].`,
        { l, r, center, matched: null },
      );
    }

    while (l >= 0 && r < n && chars[l] === chars[r]) {
      emit(
        'MATCH',
        `s[${l}]==s[${r}]`,
        `s[${l}]='${chars[l]}' equals s[${r}]='${chars[r]}', so this window is still a palindrome. Step both pointers outward.`,
        { l, r, center, matched: true },
        'good',
      );
      l--;
      r++;
    }

    // Loop stopped: either out of bounds or a mismatch. The valid palindrome is
    // (l, r) exclusive, i.e. span length r - l - 1 starting at l + 1.
    const spanLen = r - l - 1;
    const spanStart = l + 1;
    if (l < 0 || r >= n) {
      emit(
        'STOP',
        `edge`,
        `A pointer ran off the end (l=${l}, r=${r}), so the window can't grow further. The palindrome found is "${s.slice(spanStart, spanStart + spanLen)}" (length ${spanLen}).`,
        { l, r, center, matched: null },
      );
    } else {
      emit(
        'STOP',
        `s[${l}]!=s[${r}]`,
        `s[${l}]='${chars[l]}' differs from s[${r}]='${chars[r]}', so expansion stops. The palindrome found is "${s.slice(spanStart, spanStart + spanLen)}" (length ${spanLen}).`,
        { l, r, center, matched: false },
        'bad',
      );
    }

    if (spanLen > maxLen) {
      maxLen = spanLen;
      start = spanStart;
      emit(
        'BEST',
        `len ${maxLen}`,
        `Length ${spanLen} beats the previous best, so record it: start=${start}, maxLen=${maxLen}, best="${s.slice(start, start + maxLen)}".`,
        { l, r, center, matched: null },
        'good',
      );
    }
  };

  for (let i = 0; i < n; i++) {
    expand(i, i, 'odd'); // odd-length palindromes centered on i
    expand(i, i + 1, 'even'); // even-length palindromes centered between i and i+1
  }

  emit(
    'DONE',
    `"${s.slice(start, start + maxLen)}"`,
    `All ${n} centers have been expanded. The longest palindromic substring is "${s.slice(start, start + maxLen)}" (length ${maxLen}), starting at index ${start}.`,
    { done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<LpsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.l !== null && s.l >= 0) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
  if (s.r !== null && s.r < s.chars.length) pointers.push({ i: s.r, label: 'r', tone: 'accent', place: 'above' });

  const bestStart = s.start;
  const bestEnd = s.start + s.maxLen - 1;
  const inBest = (i: number) => s.maxLen > 0 && i >= bestStart && i <= bestEnd;

  const tone = (i: number) => {
    if (s.matched && s.l !== null && s.r !== null && (i === s.l || i === s.r)) return 'match';
    if (inBest(i)) return 'found';
    return '';
  };

  const window: [number, number] | null =
    s.l !== null && s.r !== null && s.l >= 0 && s.r < s.chars.length && s.l <= s.r
      ? [s.l, s.r]
      : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        best ={' '}
        <span className="font-mono text-ink">{s.best ? `"${s.best}"` : '—'}</span>
        {' · '}maxLen = <span className="font-mono text-ink">{s.maxLen}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={window} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        {s.done ? (
          <span className="font-mono text-good">→ "{s.best}"</span>
        ) : s.center !== null ? (
          <span>
            center = <span className="font-mono text-ink">[{s.center[0]}, {s.center[1]}]</span>
          </span>
        ) : (
          <span>each index is a mirror center — grow while edges match</span>
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LpsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const ch = (i: number | null) =>
    i !== null && i >= 0 && i < s.chars.length ? `'${s.chars[i]}'` : '—';
  return (
    <VarGrid>
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="s[l]" v={ch(s.l)} />
      <InspectorRow k="s[r]" v={ch(s.r)} />
      <InspectorRow k="start" v={s.start} />
      <InspectorRow k="maxLen" v={s.maxLen} />
      <InspectorRow k="best" v={s.best ? `"${s.best}"` : '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-longest-palindromic-substring';
export const title = 'Longest palindromic substring';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'lps1', label: '"babad"', value: { s: 'babad' } },
    { id: 'lps2', label: '"cbbd"', value: { s: 'cbbd' } },
  ] satisfies SampleInput<LpsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LpsState | undefined;
    const best = s?.best ?? '';
    return best.length > 0
      ? { ok: true, label: `"${best}" (len ${best.length})` }
      : { ok: false, label: 'empty' };
  },
};

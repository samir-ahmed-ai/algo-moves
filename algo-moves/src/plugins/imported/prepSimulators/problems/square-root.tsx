import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SqrtInput {
  x: number;
}

interface SqrtState {
  x: number;
  // Candidate answers are the integers 1..x/2 laid out as a row.
  // These indices are into that row (candidate value = index + 1).
  lo: number | null;
  mid: number | null;
  hi: number | null;
  ans: number; // best integer whose square is <= x so far
  check: string | null; // "mid <= x/mid ?" line for the current step
  result: number | null; // final floor(sqrt(x))
  done: boolean;
}

// Number of candidate cells to render: the search space is [1, x/2].
function candidateCount(x: number): number {
  return x < 2 ? 0 : Math.floor(x / 2);
}

function record({ x }: SqrtInput): Frame<SqrtState>[] {
  const frames: Frame<SqrtState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<SqrtState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        x,
        lo: null,
        mid: null,
        hi: null,
        ans: 1,
        check: null,
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `x=${x}`,
    `Square Root: compute floor(√${x}) — the largest integer whose square is at most ${x}. Instead of scanning, we binary-search the answer in the range [1, ⌊x/2⌋]. Time O(log x), Space O(1).`,
    {},
  );

  // Base case: for x < 2 the answer is x itself (0 or 1).
  if (x < 2) {
    emit(
      'BASE',
      `√${x}=${x}`,
      `Base case: for x < 2 the floor square root is just x itself. floor(√${x}) = ${x}.`,
      { result: x, ans: x, done: true },
      'good',
    );
    return frames;
  }

  let lo = 1;
  let hi = Math.floor(x / 2);
  let ans = 1;

  emit(
    'RANGE',
    `[1, ${hi}]`,
    `Any integer larger than ⌊${x}/2⌋ = ${hi} squares past ${x}, so the answer lies in [1, ${hi}]. Start with lo=1, hi=${hi}, ans=1.`,
    { lo: lo - 1, hi: hi - 1, ans },
  );

  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    // Compare mid <= x/mid (integer division) — equivalent to mid*mid <= x without overflow.
    const rhs = Math.floor(x / mid);
    const fits = mid <= rhs;
    emit(
      'MID',
      `mid=${mid}`,
      `Pick mid = lo + (hi−lo)/2 = ${mid}. Test whether mid fits: compare mid ≤ ⌊${x}/mid⌋ = ⌊${x}/${mid}⌋ = ${rhs} (an overflow-safe way to ask mid·mid ≤ ${x}).`,
      { lo: lo - 1, mid: mid - 1, hi: hi - 1, ans, check: `${mid} ≤ ⌊${x}/${mid}⌋ = ${rhs} ?` },
    );

    if (fits) {
      ans = mid;
      const prevLo = lo;
      lo = mid + 1;
      emit(
        'FIT',
        `ans=${mid}`,
        `${mid} ≤ ${rhs} is true, so ${mid}·${mid} ≤ ${x}: ${mid} is a valid answer. Record ans=${mid} and search higher — move lo from ${prevLo} to ${lo}.`,
        {
          lo: lo - 1,
          mid: mid - 1,
          hi: hi - 1,
          ans,
          check: `${mid} ≤ ${rhs} ✓ → ans=${mid}, lo=${lo}`,
        },
        'good',
      );
    } else {
      const prevHi = hi;
      hi = mid - 1;
      emit(
        'SHRINK',
        `hi=${hi}`,
        `${mid} ≤ ${rhs} is false, so ${mid}·${mid} > ${x}: ${mid} is too big. Discard it and everything above — move hi from ${prevHi} to ${hi}.`,
        {
          lo: lo - 1,
          mid: mid - 1,
          hi: hi - 1,
          ans,
          check: `${mid} ≤ ${rhs} ✗ → hi=${hi}`,
        },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `√${x}=${ans}`,
    `lo passed hi, so the search is done. The largest integer whose square is ≤ ${x} is ${ans}. floor(√${x}) = ${ans}.`,
    { ans, result: ans, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SqrtState>) {
  const s = frame.state;
  const n = candidateCount(s.x);
  // Candidate row: cell index i holds the candidate integer i+1.
  const values: number[] = Array.from({ length: n }, (_, i) => i + 1);

  const pointers: ArrayPointer[] = [];
  if (s.lo !== null && s.lo >= 0 && s.lo < n) pointers.push({ i: s.lo, label: 'lo', tone: 'good', place: 'below' });
  if (s.hi !== null && s.hi >= 0 && s.hi < n) pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  if (s.mid !== null && s.mid >= 0 && s.mid < n) pointers.push({ i: s.mid, label: 'mid', tone: 'accent', place: 'above' });

  const inRange = (i: number) =>
    s.lo !== null && s.hi !== null && i >= s.lo && i <= s.hi;

  const tone = (i: number) => {
    if (s.done && s.result !== null && i === s.result - 1) return 'found';
    if (s.mid === i) return 'mid';
    if (s.lo === i) return 'lo';
    if (s.hi === i) return 'hi';
    if (!s.done && inRange(i)) return 'in-window';
    return 'dead';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        x = <span className="font-mono text-ink">{s.x}</span> · candidates 1..⌊x/2⌋ ·{' '}
        best ans = <span className="font-mono text-ink">{s.ans}</span>
      </div>
      {n > 0 ? (
        <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('font-mono text-ink', vizText.base)}>x &lt; 2 — answer is x itself</div>
      )}
      {s.check && !s.done && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>{s.check}</div>
      )}
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ floor(√{s.x}) = {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SqrtState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const val = (i: number | null) => (i !== null && i >= 0 ? i + 1 : '—');
  return (
    <VarGrid>
      <InspectorRow k="x" v={s.x} />
      <InspectorRow k="lo" v={val(s.lo)} />
      <InspectorRow k="mid" v={val(s.mid)} />
      <InspectorRow k="hi" v={val(s.hi)} />
      <InspectorRow k="ans (best)" v={s.ans} />
      <InspectorRow k="result" v={s.result !== null ? s.result : s.done ? s.ans : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-square-root';
export const title = 'Square root';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'sqrt16', label: 'x = 16', value: { x: 16 } },
    { id: 'sqrt8', label: 'x = 8', value: { x: 8 } },
  ] satisfies SampleInput<SqrtInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SqrtState | undefined;
    const v = s ? (s.result ?? s.ans) : 0;
    return { ok: true, label: `√ = ${v}` };
  },
};

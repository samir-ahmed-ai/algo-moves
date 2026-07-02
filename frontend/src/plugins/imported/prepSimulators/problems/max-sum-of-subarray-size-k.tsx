import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MaxSumKInput {
  nums: number[];
  k: number;
}

interface MaxSumKState {
  nums: number[];
  k: number;
  lo: number | null; // left edge of the current window (inclusive)
  hi: number | null; // right edge of the current window (inclusive)
  enter: number | null; // index sliding into the window this step
  leave: number | null; // index sliding out of the window this step
  sum: number; // running sum of the current window
  best: number; // best window sum seen so far
  bestRange: [number, number] | null; // window that produced best
  done: boolean;
}

function record({ nums, k }: MaxSumKInput): Frame<MaxSumKState>[] {
  const { emit, frames } = createRecorder<MaxSumKState>(() => ({
        nums,
        k,
        lo: null,
        hi: null,
        enter: null,
        leave: null,
        sum: 0,
        best: 0,
        bestRange: null,
        done: false
      }));

  emit(
    'INIT',
    `k=${k}`,
    `Max Sum of Subarray Size K: slide a fixed window of width ${k} across the array and track the largest window sum. We seed the first ${k} elements, then move the window one slot at a time.`,
    {},
  );

  if (nums.length < k) {
    emit(
      'DONE',
      'too short',
      `The array has only ${nums.length} elements, which is fewer than k = ${k}, so no window of size ${k} exists. Return 0.`,
      { done: true, best: 0 },
      'bad',
    );
    return frames;
  }

  // Seed the first window (indices 0..k-1).
  let sum = 0;
  for (let i = 0; i < k; i++) {
    sum += nums[i];
    emit(
      'SEED',
      `sum=${sum}`,
      `Building the first window: add nums[${i}] = ${nums[i]} to the running sum, giving ${sum}. This window covers indices 0..${k - 1}.`,
      { lo: 0, hi: i, enter: i, sum },
    );
  }

  let best = sum;
  let bestRange: [number, number] = [0, k - 1];
  emit(
    'BEST',
    `best=${best}`,
    `The first full window [0..${k - 1}] sums to ${sum}, so that is our best so far: best = ${best}.`,
    { lo: 0, hi: k - 1, sum, best, bestRange },
    'good',
  );

  // Slide the window one position at a time.
  for (let i = k; i < nums.length; i++) {
    const incoming = nums[i];
    const outgoing = nums[i - k];
    sum += incoming - outgoing;
    const lo = i - k + 1;
    const hi = i;
    emit(
      'SLIDE',
      `sum=${sum}`,
      `Slide right: nums[${i}] = ${incoming} enters and nums[${i - k}] = ${outgoing} leaves, so sum += ${incoming} − ${outgoing} = ${sum}. Window is now [${lo}..${hi}].`,
      { lo, hi, enter: i, leave: i - k, sum, best, bestRange },
    );

    if (sum > best) {
      best = sum;
      bestRange = [lo, hi];
      emit(
        'BEST',
        `best=${best}`,
        `Window [${lo}..${hi}] sums to ${sum}, which beats the previous best. Update best = ${best}.`,
        { lo, hi, sum, best, bestRange },
        'good',
      );
    } else {
      emit(
        'KEEP',
        `best=${best}`,
        `Window [${lo}..${hi}] sums to ${sum}, which does not beat best = ${best}. Keep the current best.`,
        { lo, hi, sum, best, bestRange },
      );
    }
  }

  emit(
    'DONE',
    `${best}`,
    `Every window of size ${k} has been checked. The maximum sum is ${best}, from the highlighted window.`,
    { done: true, sum, best, bestRange, lo: bestRange[0], hi: bestRange[1] },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MaxSumKState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.lo !== null) pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
  if (s.hi !== null) pointers.push({ i: s.hi, label: 'hi', tone: 'accent', place: 'below' });
  if (s.enter !== null) pointers.push({ i: s.enter, label: 'in', tone: 'good', place: 'above' });
  if (s.leave !== null) pointers.push({ i: s.leave, label: 'out', tone: 'bad', place: 'above' });

  const tone = (i: number) => {
    if (s.bestRange && i >= s.bestRange[0] && i <= s.bestRange[1] && s.done) return 'found';
    if (s.lo !== null && s.hi !== null && i >= s.lo && i <= s.hi) return 'match';
    return '';
  };

  const win: [number, number] | null =
    s.lo !== null && s.hi !== null ? [s.lo, s.hi] : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {' · '}sum = <span className="font-mono text-ink">{s.sum}</span>
        {' · '}best = <span className="font-mono text-ink">{s.best}</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={win} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        window {s.lo !== null && s.hi !== null ? `[${s.lo}..${s.hi}]` : '—'} sum = {s.sum}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ max sum = {s.best}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MaxSumKState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k (window)" v={s.k} />
      <InspectorRow k="lo" v={s.lo ?? '—'} />
      <InspectorRow k="hi" v={s.hi ?? '—'} />
      <InspectorRow k="entering" v={s.enter !== null ? `nums[${s.enter}]=${s.nums[s.enter]}` : '—'} />
      <InspectorRow k="leaving" v={s.leave !== null ? `nums[${s.leave}]=${s.nums[s.leave]}` : '—'} />
      <InspectorRow k="window sum" v={s.sum} />
      <InspectorRow k="best" v={s.best} />
      <InspectorRow k="best window" v={s.bestRange ? `[${s.bestRange[0]}..${s.bestRange[1]}]` : '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-max-sum-of-subarray-size-k';
export const title = 'Max sum of subarray size K';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'msk1', label: '[2,1,5,1,3,2], k=3', value: { nums: [2, 1, 5, 1, 3, 2], k: 3 } },
    { id: 'msk2', label: '[1,9,-1,-2,7,3,-1,2], k=4', value: { nums: [1, 9, -1, -2, 7, 3, -1, 2], k: 4 } },
  ] satisfies SampleInput<MaxSumKInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MaxSumKState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: true, label: `max sum = ${s.best}` };
  },
};

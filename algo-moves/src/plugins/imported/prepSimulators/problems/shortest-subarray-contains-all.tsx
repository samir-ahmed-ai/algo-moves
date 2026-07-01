import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ShortestInput {
  nums: number[];
  target: number;
}

interface ShortestState {
  nums: number[];
  target: number;
  l: number; // left edge of the window
  r: number | null; // right edge just added (null before the scan)
  sum: number; // running sum over nums[l..r]
  best: number; // shortest window length found so far (0 = none yet)
  windowLen: number | null; // r-l+1 recorded on this step, if any
  done: boolean;
}

const INF = Number.MAX_SAFE_INTEGER;

function record({ nums, target }: ShortestInput): Frame<ShortestState>[] {
  const frames: Frame<ShortestState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<ShortestState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        nums,
        target,
        l: 0,
        r: null,
        sum: 0,
        best: 0,
        windowLen: null,
        done: false,
        ...s,
      },
    });

  let sum = 0;
  let l = 0;
  let best = INF;

  emit(
    'INIT',
    `target=${target}`,
    `Shortest subarray reaching a target sum. Slide a window: grow the right edge to add elements, and shrink from the left while the window sum still reaches ${target}, recording the smallest length seen.`,
    { l, r: null, sum, best: 0 },
  );

  for (let r = 0; r < nums.length; r++) {
    sum += nums[r];
    emit(
      'GROW',
      `+nums[${r}]=${nums[r]}`,
      `Grow the window: add nums[${r}] = ${nums[r]}. The window is [${l}..${r}] with sum ${sum}.`,
      { l, r, sum, best: best === INF ? 0 : best },
    );

    while (sum >= target) {
      const windowLen = r - l + 1;
      const isBetter = windowLen < best;
      if (isBetter) best = windowLen;
      emit(
        isBetter ? 'RECORD' : 'SHRINK',
        `len ${windowLen}`,
        `Window [${l}..${r}] has sum ${sum} ≥ ${target}. Its length is ${r} − ${l} + 1 = ${windowLen}` +
          (isBetter
            ? `, the shortest so far — record best = ${windowLen}.`
            : `, not shorter than the current best (${best}).`) +
          ` Now shrink from the left: drop nums[${l}] = ${nums[l]}.`,
        { l, r, sum, best, windowLen },
        isBetter ? 'good' : undefined,
      );
      sum -= nums[l];
      l++;
    }
  }

  const answer = best === INF ? 0 : best;
  emit(
    'DONE',
    answer === 0 ? 'none' : `best=${answer}`,
    answer === 0
      ? `The scan is over and no window ever reached the target ${target}. There is no qualifying subarray, so the answer is 0.`
      : `The scan is over. The shortest subarray whose sum reaches ${target} has length ${answer}.`,
    { l, r: nums.length - 1, sum, best: answer, done: true },
    answer === 0 ? 'bad' : 'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ShortestState>) {
  const s = frame.state;
  const hasWindow = s.r !== null && s.l <= s.r;
  const pointers: ArrayPointer[] = [];
  if (hasWindow) {
    pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'below' });
    if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'good', place: 'above' });
  }
  const windowRange: [number, number] | null =
    hasWindow && s.r !== null ? [s.l, s.r] : null;
  const tone = (i: number) =>
    hasWindow && s.r !== null && i >= s.l && i <= s.r ? 'match' : '';

  const bestLabel = s.done ? (s.best === 0 ? 'none' : s.best) : s.best === 0 ? '…' : s.best;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        target = <span className="font-mono text-ink">{s.target}</span>
        {' · '}window sum = <span className="font-mono text-ink">{s.sum}</span>
        {' · '}best = <span className="font-mono text-ink">{bestLabel}</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={windowRange} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {hasWindow && s.r !== null
          ? `window [${s.l}..${s.r}] · len ${s.r - s.l + 1}`
          : 'window empty'}
        {s.windowLen !== null && <span className="text-ink"> → recorded len {s.windowLen}</span>}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono', vizText.base, s.best === 0 ? 'text-bad' : 'text-good')}>
          → answer = {s.best}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ShortestState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const hasWindow = s.r !== null && s.l <= s.r;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="l" v={s.l} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="window" v={hasWindow && s.r !== null ? `[${s.l}..${s.r}]` : '—'} />
      <InspectorRow k="sum" v={s.sum} />
      <InspectorRow k="best" v={s.done ? (s.best === 0 ? 'none' : s.best) : s.best === 0 ? '…' : s.best} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-shortest-subarray-contains-all';
export const title = 'Shortest subarray contains all';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ssc1', label: '[2,3,1,2,4,3] → 7', value: { nums: [2, 3, 1, 2, 4, 3], target: 7 } },
    { id: 'ssc2', label: '[1,1,1,1] → 6', value: { nums: [1, 1, 1, 1], target: 6 } },
  ] satisfies SampleInput<ShortestInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ShortestState | undefined;
    const answer = s ? s.best : 0;
    return answer > 0
      ? { ok: true, label: `len ${answer}` }
      : { ok: false, label: 'no subarray' };
  },
};

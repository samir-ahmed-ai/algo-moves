import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';

interface MaxProductInput {
  nums: number[];
}

interface MaxProductState {
  nums: number[];
  i: number | null; // current index being folded in
  v: number | null; // nums[i]
  swapped: boolean; // did we swap curMax/curMin because v < 0?
  curMax: number; // best product ending at i
  curMin: number; // worst (most negative) product ending at i
  best: number; // global answer so far
  hi: number | null; // curMax(prev) * v
  lo: number | null; // curMin(prev) * v
  bestUpdated: boolean; // did best change on this frame?
  done: boolean;
}

function record({ nums }: MaxProductInput): Frame<MaxProductState>[] {
  let best = nums[0];
  let curMax = nums[0];
  let curMin = nums[0];

  const { emit, frames } = createRecorder<MaxProductState>(() => ({
    nums,
    i: null,
    v: null,
    swapped: false,
    curMax,
    curMin,
    best,
    hi: null,
    lo: null,
    bestUpdated: false,
    done: false,
  }));

  emit(
    'INIT',
    `best=${best}`,
    `Max Product Subarray: find the largest product of any contiguous run. We carry BOTH a running max and a running min, because multiplying by a negative flips the largest into the smallest. Seed all three with nums[0] = ${nums[0]}.`,
    { i: 0, v: nums[0] },
  );

  for (let i = 1; i < nums.length; i++) {
    const v = nums[i];

    if (v < 0) {
      const t = curMax;
      curMax = curMin;
      curMin = t;
      emit(
        'SWAP',
        `v=${v}<0`,
        `nums[${i}] = ${v} is negative, so it flips signs: a big product becomes small and vice-versa. Swap curMax and curMin first — now curMax=${curMax}, curMin=${curMin}.`,
        { i, v, swapped: true },
      );
    }

    const hi = curMax * v;
    const lo = curMin * v;
    emit(
      'EXTEND',
      `v=${v}`,
      `Fold nums[${i}] = ${v} in. Two candidate products extend the run: curMax·v = ${curMax}·${v} = ${hi} and curMin·v = ${curMin}·${v} = ${lo}. We can also start fresh at just v = ${v}.`,
      { i, v, hi, lo, swapped: false },
    );

    curMax = Math.max(v, hi, lo);
    curMin = Math.min(v, hi, lo);
    emit(
      'PICK',
      `cMax=${curMax}`,
      `Pick curMax = max(${v}, ${hi}, ${lo}) = ${curMax} and curMin = min(${v}, ${hi}, ${lo}) = ${curMin}. These are the best/worst products of any run ending exactly at index ${i}.`,
      { i, v, hi, lo, swapped: false },
    );

    if (curMax > best) {
      best = curMax;
      emit(
        'BEST',
        `best=${best}`,
        `curMax = ${curMax} beats the old best, so the global answer is now ${best}.`,
        { i, v, hi, lo, swapped: false, bestUpdated: true },
        'good',
      );
    } else {
      emit(
        'KEEP',
        `best=${best}`,
        `curMax = ${curMax} does not beat the running best ${best}, so the answer is unchanged.`,
        { i, v, hi, lo, swapped: false },
      );
    }
  }

  emit(
    'DONE',
    `${best}`,
    `Every index has been folded in. The largest product of any contiguous subarray is ${best}.`,
    { i: nums.length - 1, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MaxProductState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    pointers.push({ i: s.i, label: 'i', tone: s.bestUpdated ? 'good' : 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.i === null) return '';
    if (i === s.i) return s.bestUpdated ? 'found' : 'match';
    if (i < s.i) return 'dead';
    return '';
  };
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="i" v={s.i ?? '—'} />
        <RailStat k="v" v={s.v ?? '—'} tone="accent" />
        {s.swapped && <RailStat k="swap" v="v<0" tone="warn" />}
      </RailGroup>
      <RailGroup label="window">
        <RailStat k="curMax" v={s.curMax} tone="accent" />
        <RailStat k="curMin" v={s.curMin} />
        {s.hi !== null && s.lo !== null && !s.done && (
          <>
            <RailStat k="hi" v={s.hi} />
            <RailStat k="lo" v={s.lo} />
          </>
        )}
      </RailGroup>
      <RailResult label="best" value={s.best} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MaxProductState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.v ?? '—'} />
      <InspectorRow k="swapped (v<0)" v={s.swapped ? 'yes' : 'no'} />
      <InspectorRow k="curMax·v" v={s.hi ?? '—'} />
      <InspectorRow k="curMin·v" v={s.lo ?? '—'} />
      <InspectorRow k="curMax" v={s.curMax} />
      <InspectorRow k="curMin" v={s.curMin} />
      <InspectorRow k="best" v={s.best} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-max-product-of-subarray';
export const title = 'Max product of subarray';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'mp1', label: '[2,3,-2,4]', value: { nums: [2, 3, -2, 4] } },
    { id: 'mp2', label: '[-2,3,-4]', value: { nums: [-2, 3, -4] } },
  ] satisfies SampleInput<MaxProductInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MaxProductState | undefined;
    return s ? { ok: true, label: `${s.best}` } : { ok: false, label: '—' };
  },
};

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface KthInput {
  nums: number[];
  k: number;
}

interface KthState {
  values: number[];
  k: number;
  target: number; // 0-indexed position quickselect is hunting for
  lo: number;
  hi: number;
  pivotIdx: number | null; // index currently holding the pivot value
  pivot: number | null;
  i: number | null; // scan pointer
  pos: number | null; // boundary of the "< pivot" region
  swapped: [number, number] | null;
  dead: boolean[]; // outside the live [lo,hi] window
  found: number | null;
  answer: number | null;
  done: boolean;
}

function record({ nums, k }: KthInput): Frame<KthState>[] {
  const a = nums.slice();
  const n = a.length;
  const target = n - k; // k-th largest sits at this 0-indexed position once sorted
  const dead = new Array<boolean>(n).fill(false);

  let answer: number | null = null;
  let found: number | null = null;

  const { emit, frames } = createRecorder<KthState>(
    () => ({
      values: a.slice(),
      k,
      target,
      lo: 0,
      hi: n - 1,
      pivotIdx: null,
      pivot: null,
      i: null,
      pos: null,
      swapped: null,
      dead: dead.slice(),
      found,
      answer,
      done: false,
    }),
    {
      merge: (base, partial) => ({
        ...base,
        ...partial,
        done: partial.done ?? base.done,
      }),
    },
  );

  const emitDone = (
    type: string,
    note: string,
    caption: string,
    extra: Partial<KthState>,
    tone?: 'good' | 'bad',
  ) => emit(type, note, caption, { ...extra, done: true }, tone);

  emit(
    'INIT',
    `target=${target}`,
    `Find the ${k}${k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'} largest of ${n} numbers. Once sorted ascending it would sit at index ${target}, so quickselect partitions the array until the pivot lands exactly there — without sorting the rest.`,
    {},
  );

  let lo = 0;
  let hi = n - 1;

  while (true) {
    // mark everything outside [lo,hi] as settled/dead
    for (let x = 0; x < n; x++) dead[x] = x < lo || x > hi;

    if (lo === hi) {
      answer = a[lo];
      found = lo;
      emitDone(
        'BASE',
        `a[${lo}]=${a[lo]}`,
        `Window collapsed to a single cell at index ${lo}. Its value ${a[lo]} is the element at the target position — that is the ${k}${k === 2 ? 'nd' : 'th'} largest. Answer = ${a[lo]}.`,
        { lo, hi, found: lo, answer: a[lo] },
        'good',
      );
      return frames;
    }

    const pivot = a[lo];
    let pos = lo;
    emit(
      'PIVOT',
      `pivot=${pivot}`,
      `Partition window [${lo}..${hi}]. Take pivot = a[${lo}] = ${pivot}. Everything smaller than ${pivot} will be pushed to the left; pos tracks the right edge of that smaller region (starts at ${lo}).`,
      { lo, hi, pivot, pivotIdx: lo, pos, i: lo },
    );

    for (let i = lo + 1; i <= hi; i++) {
      if (a[i] < pivot) {
        pos++;
        const tmp = a[pos];
        a[pos] = a[i];
        a[i] = tmp;
        emit(
          'SCAN',
          `a[${i}]=${a[pos]}<${pivot}`,
          `a[${i}] = ${a[pos]} < pivot ${pivot}: grow the smaller region to pos=${pos} and swap it in. Cells [${lo + 1}..${pos}] now hold values below the pivot.`,
          { lo, hi, pivot, pivotIdx: lo, pos, i, swapped: pos === i ? null : [pos, i] },
        );
      } else {
        emit(
          'SCAN',
          `a[${i}]=${a[i]}≥${pivot}`,
          `a[${i}] = ${a[i]} ≥ pivot ${pivot}: it belongs on the right, leave it in place. pos stays at ${pos}.`,
          { lo, hi, pivot, pivotIdx: lo, pos, i },
        );
      }
    }

    // place pivot at its final spot
    const tmp = a[lo];
    a[lo] = a[pos];
    a[pos] = tmp;
    emit(
      'PLACE',
      `pivot→${pos}`,
      `Scan done. Swap the pivot ${pivot} into pos=${pos}: now everything left of ${pos} is smaller and everything right is ≥ ${pivot}, so the pivot is in its final sorted position ${pos}.`,
      { lo, hi, pivot, pivotIdx: pos, pos, swapped: lo === pos ? null : [lo, pos] },
    );

    if (pos === target) {
      answer = a[pos];
      found = pos;
      emitDone(
        'HIT',
        `idx ${pos}==${target}`,
        `Pivot landed exactly on the target index ${target}. Its value ${a[pos]} is the ${k}${k === 2 ? 'nd' : 'th'} largest element. Answer = ${a[pos]}.`,
        { lo, hi, pivotIdx: pos, found: pos, answer: a[pos] },
        'good',
      );
      return frames;
    }

    if (target < pos) {
      hi = pos - 1;
      emit(
        'LEFT',
        `hi=${hi}`,
        `Target index ${target} < pivot index ${pos}, so the answer is in the smaller-left part. Recurse into [${lo}..${hi}] and ignore the right side.`,
        { lo, hi, pivotIdx: pos },
      );
    } else {
      lo = pos + 1;
      emit(
        'RIGHT',
        `lo=${lo}`,
        `Target index ${target} > pivot index ${pos}, so the answer is in the larger-right part. Recurse into [${lo}..${hi}] and ignore the left side.`,
        { lo, hi, pivotIdx: pos },
      );
    }
  }
}

function View({ frame }: PluginViewProps<KthState>) {
  const s = frame.state;
  const live = s.lo <= s.hi && !s.done;
  const pointers: ArrayPointer[] = [];
  if (s.pivotIdx !== null)
    pointers.push({ i: s.pivotIdx, label: 'pivot', tone: 'warn', place: 'above' });
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'good', place: 'above' });
  if (live) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  }
  if (s.pos !== null && !s.done)
    pointers.push({ i: s.pos, label: 'pos', tone: 'good', place: 'below' });
  const tone = (i: number) => {
    if (s.found === i) return 'found';
    if (s.swapped && (s.swapped[0] === i || s.swapped[1] === i)) return 'mid';
    if (s.pivotIdx === i) return 'mid';
    if (s.dead[i]) return 'dead';
    return '';
  };
  const rail = (
    <>
      <RailGroup label="params">
        <RailStat k="k" v={s.k} />
        <RailStat k="target" v={s.target} tone="accent" />
      </RailGroup>
      <RailGroup label="window">
        <RailStat k="lo" v={live ? s.lo : '—'} tone="accent" />
        <RailStat k="hi" v={live ? s.hi : '—'} tone="bad" />
      </RailGroup>
      <RailGroup label="partition">
        <RailStat k="pivot" v={s.pivot ?? '—'} tone="warn" />
        <RailStat k="pos" v={s.pos ?? '—'} />
      </RailGroup>
      {s.answer !== null && <RailResult label="answer" value={s.answer} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<KthState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="target index" v={s.target} />
      <InspectorRow k="window" v={s.lo <= s.hi ? `[${s.lo}, ${s.hi}]` : '—'} />
      <InspectorRow k="pivot" v={s.pivot ?? '—'} />
      <InspectorRow k="pivot idx" v={s.pivotIdx ?? '—'} />
      <InspectorRow k="pos" v={s.pos ?? '—'} />
      <InspectorRow k="result" v={s.answer !== null ? s.answer : '…selecting'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-49-kth-largest-element-in-an-array';
export const title = 'Kth Largest Element in an Array';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'k1', label: '[3,2,1,5,6,4], k=2 → 5', value: { nums: [3, 2, 1, 5, 6, 4], k: 2 } },
    {
      id: 'k2',
      label: '[3,2,3,1,2,4,5,5,6], k=4 → 4',
      value: { nums: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 },
    },
  ] satisfies SampleInput<KthInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as KthState | undefined;
    return s && s.answer !== null ? { ok: true, label: `${s.answer}` } : { ok: false, label: '—' };
  },
};

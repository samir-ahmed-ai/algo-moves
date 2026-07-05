import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ZerosInput {
  nums: number[];
}

type Phase = 'rake' | 'fill' | 'done';

interface ZerosState {
  nums: number[]; // live array, mutated in place as the algorithm runs
  i: number | null; // read pointer (current element being inspected)
  w: number; // write pointer — next slot to drop a non-zero into
  phase: Phase;
  rakedUpTo: number; // how many slots [0, rakedUpTo) are finalized non-zeros
  done: boolean;
}

function record({ nums: input }: ZerosInput): Frame<ZerosState>[] {
  const nums = input.slice();  let w = 0;

  const { emit, frames } = createRecorder<ZerosState>(() => ({
        nums: nums.slice(),
        i: null,
        w,
        phase: 'rake',
        rakedUpTo: w,
        done: false
      }));

  emit(
    'INIT',
    `n=${nums.length}`,
    `Move Zeros: shift every non-zero to the front in order, then pad the tail with zeros — all in place, O(n) time and O(1) space. A write pointer w marks the next slot to receive a non-zero; it starts at 0.`,
    { i: null, w: 0, phase: 'rake', rakedUpTo: 0 },
  );

  // Pass 1: rake non-zeros to the front using the write pointer w.
  for (let i = 0; i < nums.length; i++) {
    const v = nums[i];
    if (v !== 0) {
      const movedInPlace = i === w;
      nums[w] = v;
      const next = w + 1;
      emit(
        'KEEP',
        movedInPlace ? `keep ${v}` : `nums[${w}]=${v}`,
        movedInPlace
          ? `nums[${i}] = ${v} is non-zero and w already points here (${i}=${w}), so it stays put. Advance w to ${next}.`
          : `nums[${i}] = ${v} is non-zero, so copy it into slot w=${w}. Now nums[${w}]=${v}. Advance w to ${next}.`,
        { i, w, phase: 'rake', rakedUpTo: next },
      );
      w = next;
    } else {
      emit(
        'SKIP',
        `skip 0 @${i}`,
        `nums[${i}] = 0, so the read pointer skips it — w stays at ${w}. This zero's slot will be overwritten later (or back-filled at the end).`,
        { i, w, phase: 'rake', rakedUpTo: w },
      );
    }
  }

  emit(
    'RAKED',
    `w=${w}`,
    `First pass done: indices [0, ${w}) now hold every non-zero in original order. The remaining ${nums.length - w} slot(s) from index ${w} onward must become zeros.`,
    { i: null, w, phase: 'fill', rakedUpTo: w },
  );

  // Pass 2: zero-fill the tail from w to the end.
  for (let i = w; i < nums.length; i++) {
    nums[i] = 0;
    emit(
      'FILL',
      `nums[${i}]=0`,
      `Back-fill the tail: set nums[${i}] = 0. Everything from w=${w} to the end becomes zero.`,
      { i, w, phase: 'fill', rakedUpTo: w },
    );
  }

  emit(
    'DONE',
    `${nums.join(',')}`,
    `Finished: non-zeros sit in front in their original order and all zeros are pushed to the end — [${nums.join(', ')}].`,
    { i: null, w, phase: 'done', rakedUpTo: w, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ZerosState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (!s.done) pointers.push({ i: s.w < s.nums.length ? s.w : s.nums.length - 1, label: 'w', tone: 'good', place: 'below' });

  const tone = (idx: number) => {
    if (s.done) return s.nums[idx] === 0 ? 'dead' : 'found';
    if (s.phase === 'fill') {
      if (idx < s.w) return 'match'; // finalized non-zeros
      if (s.i !== null && idx === s.i) return 'found'; // just zeroed
      return idx > (s.i ?? s.w - 1) ? '' : 'dead';
    }
    // rake phase
    if (idx < s.rakedUpTo) return 'match'; // raked non-zeros so far
    if (s.i !== null && idx === s.i) return s.nums[idx] === 0 ? 'dead' : 'found';
    return '';
  };

  const phaseLabel = s.phase === 'rake' ? 'rake non-zeros forward' : s.phase === 'fill' ? 'zero-fill tail' : 'done';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        phase: <span className="font-mono text-ink">{phaseLabel}</span>
        {' · '}w = <span className="font-mono text-ink">{s.w}</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {`[0, ${s.w}) = non-zeros · [${s.w}, ${s.nums.length}) = zeros`}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ZerosState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="i (read)" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="w (write)" v={s.w} />
      <InspectorRow k="non-zeros placed" v={s.rakedUpTo} />
      <InspectorRow k="array" v={`[${s.nums.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-move-all-zeros-to-end';
export const title = 'Move all zeros to end';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'mz1', label: '[0,1,0,3,12]', value: { nums: [0, 1, 0, 3, 12] } },
    { id: 'mz2', label: '[4,0,0,5,0,6]', value: { nums: [4, 0, 0, 5, 0, 6] } },
  ] satisfies SampleInput<ZerosInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ZerosState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    return { ok: true, label: `[${s.nums.join(',')}]` };
  },
};

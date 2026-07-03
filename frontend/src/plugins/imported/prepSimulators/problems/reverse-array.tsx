import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ReverseArrayInput {
  nums: number[];
}

interface ReverseArrayState {
  nums: number[];
  i: number | null; // left pointer
  j: number | null; // right pointer
  swapped: boolean; // did this frame perform a swap of i and j?
  done: boolean;
}

function record({ nums }: ReverseArrayInput): Frame<ReverseArrayState>[] {
  const arr = nums.slice();
  const { emit, frames } = createRecorder<ReverseArrayState>(() => ({
        nums: arr.slice(),
        i: null,
        j: null,
        swapped: false,
        done: false
      }));

  emit(
    'INIT',
    `n=${arr.length}`,
    `Reverse the array in place. Put one pointer i at the left end and another pointer j at the right end, then march them toward each other swapping the values they sit on.`,
    { i: 0, j: arr.length - 1 },
  );

  let i = 0;
  let j = arr.length - 1;

  while (i < j) {
    emit(
      'COMPARE',
      `i=${i} j=${j}`,
      `i (${i}) is still left of j (${j}), so there is a pair to mirror. Swap nums[${i}] = ${arr[i]} with nums[${j}] = ${arr[j]}.`,
      { i, j },
    );

    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;

    emit(
      'SWAP',
      `swap ${i}↔${j}`,
      `Swapped: nums[${i}] is now ${arr[i]} and nums[${j}] is now ${arr[j]}. Step i inward (i++) and step j inward (j--).`,
      { i, j, swapped: true },
    );

    i++;
    j--;
  }

  if (i === j) {
    emit(
      'CENTER',
      `i=j=${i}`,
      `i and j meet at the middle index ${i}. A single middle element stays where it is, so there is nothing to swap.`,
      { i, j },
    );
  } else {
    emit(
      'CROSS',
      `i=${i} j=${j}`,
      `i (${i}) has crossed j (${j}). Every pair has been mirrored, so the loop stops.`,
      { i, j },
    );
  }

  emit(
    'DONE',
    `[${arr.join(',')}]`,
    `The array is fully reversed in place: [${arr.join(', ')}]. Time O(n), Space O(1).`,
    { i: null, j: null, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ReverseArrayState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i >= 0 && s.i < s.nums.length)
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null && s.j >= 0 && s.j < s.nums.length)
    pointers.push({ i: s.j, label: 'j', tone: 'good', place: 'below' });

  const tone = (idx: number) => {
    if (s.done) return 'found';
    if (s.swapped && (idx === s.i || idx === s.j)) return 'found';
    if (idx === s.i || idx === s.j) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        two pointers ·{' '}
        <span className="font-mono text-ink">i = {s.i ?? '—'}</span>
        {' · '}
        <span className="font-mono text-ink">j = {s.j ?? '—'}</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, s.done ? 'text-good' : 'text-ink3')}>
        {s.done ? '→ ' : ''}[{s.nums.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ReverseArrayState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (k: number | null) =>
    k !== null && k >= 0 && k < s.nums.length ? s.nums[k] : '—';
  return (
    <VarGrid>
      <InspectorRow k="length" v={s.nums.length} />
      <InspectorRow k="i (left)" v={s.i ?? '—'} />
      <InspectorRow k="j (right)" v={s.j ?? '—'} />
      <InspectorRow k="nums[i]" v={at(s.i)} />
      <InspectorRow k="nums[j]" v={at(s.j)} />
      <InspectorRow k="array" v={`[${s.nums.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-reverse-array';
export const title = 'Reverse array';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ra1', label: '[1,2,3,4,5]', value: { nums: [1, 2, 3, 4, 5] } },
    { id: 'ra2', label: '[7,3,9,2]', value: { nums: [7, 3, 9, 2] } },
  ] satisfies SampleInput<ReverseArrayInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ReverseArrayState | undefined;
    return s
      ? { ok: true, label: `[${s.nums.join(',')}]` }
      : { ok: false, label: 'no result' };
  },
};

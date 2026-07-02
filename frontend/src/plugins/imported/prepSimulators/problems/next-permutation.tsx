import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface NextPermInput {
  nums: number[];
}

interface NextPermState {
  nums: number[];
  /** 'find-dip' | 'find-swap' | 'reverse' | 'done' */
  phase: 'find-dip' | 'find-swap' | 'reverse' | 'done';
  i: number | null; // pivot index (first nums[i] < nums[i+1] from the right)
  j: number | null; // rightmost index with nums[j] > nums[i]
  cmp: number | null; // the index currently being compared while scanning
  lo: number | null; // left bound of suffix-reverse
  hi: number | null; // right bound of suffix-reverse
  /** indices that have settled into their final reversed position */
  reversed: number[];
  done: boolean;
}

function record({ nums: input }: NextPermInput): Frame<NextPermState>[] {
  const nums = input.slice();
  const n = nums.length;
  const { emit, frames } = createRecorder<NextPermState>(() => ({
        nums: nums.slice(),
        phase: 'find-dip',
        i: null,
        j: null,
        cmp: null,
        lo: null,
        hi: null,
        reversed: [],
        done: false
      }));

  emit(
    'INIT',
    `[${nums.join(',')}]`,
    `Next permutation: rearrange the numbers into the next lexicographically larger ordering, in place. Scan from the right to find the dip, swap it with the next-bigger element, then flip the tail. Time O(n), Space O(1).`,
    { phase: 'find-dip' },
  );

  // Step 1: find the pivot i — first index from the right with nums[i] < nums[i+1].
  let i = n - 2;
  while (i >= 0) {
    emit(
      'SCAN_DIP',
      `i=${i}`,
      `Looking for the dip: is nums[${i}] (=${nums[i]}) < nums[${i + 1}] (=${nums[i + 1]})? If not, this suffix is still descending, so step left.`,
      { phase: 'find-dip', i: i + 1, cmp: i },
    );
    if (nums[i] < nums[i + 1]) {
      emit(
        'DIP_FOUND',
        `pivot i=${i}`,
        `Found the dip at i=${i}: nums[${i}] (=${nums[i]}) < nums[${i + 1}] (=${nums[i + 1]}). Everything to the right is descending, so the pivot ${nums[i]} is the value we must bump up.`,
        { phase: 'find-dip', i, cmp: i },
        'good',
      );
      break;
    }
    i--;
  }

  if (i < 0) {
    // Whole array is descending — it's the last permutation; reverse to the first.
    emit(
      'NO_DIP',
      'last perm',
      `No dip exists — the array is fully descending, the largest permutation. The next one wraps to the smallest, so reverse the whole array.`,
      { phase: 'reverse', i: null },
      'bad',
    );
  } else {
    // Step 2: find j — rightmost index with nums[j] > nums[i].
    emit(
      'SWAP_PHASE',
      `find j > ${nums[i]}`,
      `Now find the rightmost element bigger than the pivot ${nums[i]}. Because the suffix is descending, the first one we meet scanning from the right is the smallest value still greater than the pivot.`,
      { phase: 'find-swap', i },
    );
    let j = n - 1;
    while (nums[j] <= nums[i]) {
      emit(
        'SCAN_SWAP',
        `j=${j}`,
        `nums[${j}] (=${nums[j]}) ≤ pivot ${nums[i]}, so it can't be the swap target. Step left.`,
        { phase: 'find-swap', i, j: null, cmp: j },
      );
      j--;
    }
    emit(
      'SWAP_TARGET',
      `j=${j}`,
      `nums[${j}] (=${nums[j]}) > pivot ${nums[i]} (=${nums[i]}). This is the next-bigger value; swap it into the pivot position.`,
      { phase: 'find-swap', i, j, cmp: j },
      'good',
    );
    const tmp = nums[i];
    nums[i] = nums[j];
    nums[j] = tmp;
    emit(
      'SWAP',
      `swap ${i}↔${j}`,
      `Swapped nums[${i}] and nums[${j}]. The prefix is now one notch larger; only the suffix to the right of i still needs to be made as small as possible.`,
      { phase: 'find-swap', i, j },
      'good',
    );
  }

  // Step 3: reverse the suffix to the right of i (or the whole array if i < 0).
  let l = i + 1;
  let r = n - 1;
  const settled: number[] = [];
  for (let k = 0; k < l; k++) settled.push(k);
  emit(
    'REVERSE_PHASE',
    `reverse [${l}, ${r}]`,
    `The suffix from index ${l} to ${r} is descending; reversing it makes the smallest possible tail, completing the next permutation.`,
    { phase: 'reverse', i: i < 0 ? null : i, lo: l, hi: r, reversed: settled.slice() },
  );
  while (l < r) {
    const tmp = nums[l];
    nums[l] = nums[r];
    nums[r] = tmp;
    settled.push(l, r);
    emit(
      'REVERSE_SWAP',
      `swap ${l}↔${r}`,
      `Reversed the tail ends: swapped indices ${l} and ${r}. Move both pointers inward.`,
      { phase: 'reverse', i: i < 0 ? null : i, lo: l, hi: r, reversed: settled.slice() },
    );
    l++;
    r--;
  }
  if (l === r) settled.push(l);

  const allIdx: number[] = [];
  for (let k = 0; k < n; k++) allIdx.push(k);
  emit(
    'DONE',
    `[${nums.join(',')}]`,
    `Done. The next permutation is [${nums.join(', ')}].`,
    { phase: 'done', i: null, lo: null, hi: null, reversed: allIdx, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<NextPermState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null) pointers.push({ i: s.j, label: 'j', tone: 'good', place: 'above' });
  if (s.cmp !== null && s.cmp !== s.i && s.cmp !== s.j)
    pointers.push({ i: s.cmp, label: 'scan', tone: 'warn', place: 'below' });
  if (s.lo !== null && s.phase === 'reverse')
    pointers.push({ i: s.lo, label: 'l', tone: 'accent', place: 'below' });
  if (s.hi !== null && s.phase === 'reverse' && s.hi !== s.lo)
    pointers.push({ i: s.hi, label: 'r', tone: 'bad', place: 'below' });

  const window: [number, number] | null =
    s.phase === 'reverse' && s.lo !== null && s.hi !== null && s.lo <= s.hi ? [s.lo, s.hi] : null;

  const tone = (idx: number) => {
    if (s.done) return 'found';
    if (idx === s.i) return 'match';
    if (idx === s.j) return 'found';
    return '';
  };

  const phaseLabel =
    s.phase === 'find-dip'
      ? 'scan from right for the dip'
      : s.phase === 'find-swap'
        ? 'find the next-bigger element'
        : s.phase === 'reverse'
          ? 'reverse the descending tail'
          : 'next permutation ready';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        phase: <span className="font-mono text-ink">{phaseLabel}</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={window} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        nums = [{s.nums.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<NextPermState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (idx: number | null) => (idx !== null && idx >= 0 && idx < s.nums.length ? s.nums[idx] : '—');
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="i (pivot)" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={at(s.i)} />
      <InspectorRow k="j (swap)" v={s.j ?? '—'} />
      <InspectorRow k="nums[j]" v={at(s.j)} />
      <InspectorRow k="reverse [l,r]" v={s.lo !== null && s.hi !== null ? `[${s.lo}, ${s.hi}]` : '—'} />
      <InspectorRow k="nums" v={`[${s.nums.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-next-permutation';
export const title = 'Next permutation';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'np1', label: '[1,2,3]', value: { nums: [1, 2, 3] } },
    { id: 'np2', label: '[1,3,5,4,2]', value: { nums: [1, 3, 5, 4, 2] } },
    { id: 'np3', label: '[3,2,1] (last)', value: { nums: [3, 2, 1] } },
  ] satisfies SampleInput<NextPermInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as NextPermState | undefined;
    return s ? { ok: true, label: `[${s.nums.join(',')}]` } : { ok: false, label: 'no frames' };
  },
};

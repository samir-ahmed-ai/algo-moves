import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, RailGroup, RailResult, RailStack, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';
import { ArrayBars, type BarTone } from '../../../../components/ArrayBars';

interface ThreeSumInput {
  nums: number[];
}

type Triplet = [number, number, number];

interface ThreeSumState {
  nums: number[]; // the working array (sorted after the sort phase)
  phase: 'sort' | 'scan';
  i: number | null; // fixed anchor index
  l: number | null; // left pointer
  r: number | null; // right pointer
  sum: number | null; // nums[i] + nums[l] + nums[r] when comparing
  // sort-phase highlight indices (selection-sort compare/min/swap markers)
  compare: [number, number] | null;
  minIdx: number | null;
  swap: [number, number] | null;
  sortedUpTo: number; // indices [0, sortedUpTo) are finalized/sorted
  results: Triplet[]; // triplets found so far
  done: boolean;
}

function record({ nums }: ThreeSumInput): Frame<ThreeSumState>[] {
  const a = nums.slice();
  const n = a.length;
  const results: Triplet[] = [];

  const { emit, frames } = createRecorder<ThreeSumState>(() => ({
    nums: a.slice(),
    phase: 'scan',
    i: null,
    l: null,
    r: null,
    sum: null,
    compare: null,
    minIdx: null,
    swap: null,
    sortedUpTo: 0,
    results: results.map((t) => [...t] as Triplet),
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `3Sum: find every unique triplet that sums to 0. Strategy: sort the array, then for each fixed anchor nums[i] walk two pointers (l from the left, r from the right) inward to find the remaining pair.`,
    { phase: 'sort', sortedUpTo: 0 },
  );

  // --- Sort phase (selection sort so each compare/swap is one teaching frame) ---
  for (let p = 0; p < n - 1; p++) {
    let m = p;
    emit(
      'SORT_SELECT',
      `min=${a[p]}`,
      `Sort phase: position ${p} is the next slot to fill. Tentatively the minimum of the unsorted region is nums[${p}] = ${a[p]}.`,
      { phase: 'sort', minIdx: m, sortedUpTo: p },
    );
    for (let q = p + 1; q < n; q++) {
      emit(
        'SORT_COMPARE',
        `${a[q]} ? ${a[m]}`,
        `Compare nums[${q}] = ${a[q]} against the current minimum nums[${m}] = ${a[m]}.`,
        { phase: 'sort', compare: [q, m], minIdx: m, sortedUpTo: p },
      );
      if (a[q] < a[m]) {
        m = q;
        emit(
          'SORT_NEWMIN',
          `min=${a[m]}`,
          `nums[${q}] = ${a[q]} is smaller, so it becomes the new minimum of the unsorted region.`,
          { phase: 'sort', minIdx: m, sortedUpTo: p },
        );
      }
    }
    if (m !== p) {
      const tmp = a[p];
      a[p] = a[m];
      a[m] = tmp;
      emit(
        'SORT_SWAP',
        `swap ${p}↔${m}`,
        `Swap the minimum into place: nums[${p}] ↔ nums[${m}]. Position ${p} is now sorted.`,
        { phase: 'sort', swap: [p, m], sortedUpTo: p + 1 },
      );
    } else {
      emit(
        'SORT_FIX',
        `fix ${p}`,
        `nums[${p}] = ${a[p]} is already the minimum of the unsorted region, so it stays put and position ${p} is sorted.`,
        { phase: 'sort', sortedUpTo: p + 1 },
      );
    }
  }
  emit(
    'SORTED',
    `[${a.join(',')}]`,
    `Array is sorted: [${a.join(', ')}]. Now we can use the two-pointer sweep, because a sorted order tells us which way to move when the sum is too small or too big.`,
    { phase: 'scan', sortedUpTo: n },
  );

  // --- Scan phase: fix nums[i], two pointers l=i+1, r=n-1 ---
  for (let i = 0; i < n - 2; i++) {
    if (i > 0 && a[i] === a[i - 1]) {
      emit(
        'SKIP_I',
        `dup ${a[i]}`,
        `nums[${i}] = ${a[i]} equals the previous anchor nums[${i - 1}], so fixing it again would only repeat triplets we already have. Skip this anchor.`,
        { phase: 'scan', i, sortedUpTo: n },
      );
      continue;
    }
    let l = i + 1;
    let r = n - 1;
    emit(
      'FIX_I',
      `anchor ${a[i]}`,
      `Fix the anchor nums[${i}] = ${a[i]}. Set l = ${l} (just right of the anchor) and r = ${r} (the last element); we need nums[l] + nums[r] = ${-a[i]}.`,
      { phase: 'scan', i, l, r, sortedUpTo: n },
    );

    while (l < r) {
      const sum = a[i] + a[l] + a[r];
      emit(
        'SUM',
        `sum=${sum}`,
        `Check the triple: nums[${i}] + nums[${l}] + nums[${r}] = ${a[i]} + ${a[l]} + ${a[r]} = ${sum}.`,
        { phase: 'scan', i, l, r, sum, sortedUpTo: n },
      );
      if (sum === 0) {
        results.push([a[i], a[l], a[r]]);
        emit(
          'FOUND',
          `[${a[i]},${a[l]},${a[r]}]`,
          `Sum is 0 — record the triplet [${a[i]}, ${a[l]}, ${a[r]}]. Then move both pointers inward (l++, r−−) to look for another pair with this anchor.`,
          { phase: 'scan', i, l, r, sum, sortedUpTo: n },
          'good',
        );
        l++;
        r--;
        while (l < r && a[l] === a[l - 1]) {
          emit(
            'SKIP_L',
            `dup l ${a[l]}`,
            `nums[${l}] = ${a[l]} repeats the value we just used on the left, which would give a duplicate triplet. Advance l past it.`,
            { phase: 'scan', i, l, r, sortedUpTo: n },
          );
          l++;
        }
        while (l < r && a[r] === a[r + 1]) {
          emit(
            'SKIP_R',
            `dup r ${a[r]}`,
            `nums[${r}] = ${a[r]} repeats the value we just used on the right, which would give a duplicate triplet. Retreat r past it.`,
            { phase: 'scan', i, l, r, sortedUpTo: n },
          );
          r--;
        }
      } else if (sum < 0) {
        emit(
          'MOVE_L',
          `${sum}<0`,
          `Sum ${sum} is below 0, so we need a larger value. Because the array is sorted, moving l rightward (l → ${l + 1}) increases the sum.`,
          { phase: 'scan', i, l, r, sum, sortedUpTo: n },
        );
        l++;
      } else {
        emit(
          'MOVE_R',
          `${sum}>0`,
          `Sum ${sum} is above 0, so we need a smaller value. Because the array is sorted, moving r leftward (r → ${r - 1}) decreases the sum.`,
          { phase: 'scan', i, l, r, sum, sortedUpTo: n },
        );
        r--;
      }
    }
  }

  emit(
    'DONE',
    `${results.length} triplet(s)`,
    results.length > 0
      ? `Done. Found ${results.length} unique triplet(s) that sum to 0: ${results.map((t) => `[${t.join(',')}]`).join(', ')}.`
      : `Done. No triplet sums to 0 for this input.`,
    { phase: 'scan', sortedUpTo: n, done: true },
    results.length > 0 ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ThreeSumState>) {
  const s = frame.state;

  const tone = (idx: number): BarTone => {
    if (s.phase === 'sort') {
      if (s.swap && (idx === s.swap[0] || idx === s.swap[1])) return 'swap';
      if (s.minIdx === idx) return 'min';
      if (s.compare && idx === s.compare[0]) return 'compare';
      if (idx < s.sortedUpTo) return 'sorted';
      return 'idle';
    }
    if (s.i === idx) return 'pivot';
    if (s.l === idx || s.r === idx) return 'compare';
    if (s.sum === 0 && (s.l === idx || s.r === idx)) return 'done';
    return 'idle';
  };

  const label = (idx: number): string => {
    const tags: string[] = [];
    if (s.phase === 'scan') {
      if (s.i === idx) tags.push('i');
      if (s.l === idx) tags.push('l');
      if (s.r === idx) tags.push('r');
    }
    return tags.length ? `${idx} ${tags.join('/')}` : `${idx}`;
  };

  const tripletItems = s.results.map((t) => `[${t.join(',')}]`);

  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="phase" v={s.phase} />
        <RailStat k="i" v={s.i ?? '—'} />
        <RailStat k="l" v={s.l ?? '—'} />
        <RailStat k="r" v={s.r ?? '—'} />
        {s.sum !== null && <RailStat k="sum" v={s.sum} tone={s.sum === 0 ? 'good' : 'accent'} />}
      </RailGroup>
      <RailStack label="triplets" items={tripletItems} />
      {s.done && (
        <RailResult
          label="answer"
          value={s.results.length > 0 ? `${s.results.length} found` : 'none'}
          tone={s.results.length > 0 ? 'good' : 'bad'}
        />
      )}
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayBars values={s.nums} tone={tone} label={label} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ThreeSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (idx: number | null) => (idx !== null && idx >= 0 && idx < s.nums.length ? s.nums[idx] : '—');
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="i (anchor)" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={at(s.i)} />
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="sum" v={s.sum ?? '—'} />
      <InspectorRow k="triplets" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-sorting-3sum';
export const title = '3Sum';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ts1', label: '[-1,0,1,2,-1,-4]', value: { nums: [-1, 0, 1, 2, -1, -4] } },
    { id: 'ts2', label: '[0,0,0,0]', value: { nums: [0, 0, 0, 0] } },
  ] satisfies SampleInput<ThreeSumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ThreeSumState | undefined;
    const count = s?.results.length ?? 0;
    return count > 0
      ? { ok: true, label: `${count} triplet${count === 1 ? '' : 's'}` }
      : { ok: false, label: 'no triplet' };
  },
};

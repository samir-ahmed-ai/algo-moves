import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface KthInput {
  nums: number[];
  k: number;
}

interface KthState {
  a: number[]; // live array (mutated by partition swaps)
  k: number;
  target: number; // index n-k that, once a value lands there, is the answer
  lo: number; // active search window low bound
  hi: number; // active search window high bound
  pivot: number | null; // value of the current pivot (a[hi] at partition start)
  pivotIdx: number | null; // index the pivot currently lives at
  i: number | null; // scanning pointer inside partition
  store: number | null; // boundary index where the next "<= pivot" value goes
  p: number | null; // final pivot position returned by a partition
  result: number | null; // the kth largest value, once found
  done: boolean;
}

function record({ nums, k }: KthInput): Frame<KthState>[] {
  const frames: Frame<KthState>[] = [];
  const a = nums.slice();
  const n = a.length;
  const target = n - k;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<KthState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        a: a.slice(),
        k,
        target,
        lo: 0,
        hi: n - 1,
        pivot: null,
        pivotIdx: null,
        i: null,
        store: null,
        p: null,
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `target=${target}`,
    `Find the ${k}th largest value via Quickselect. In fully sorted order the kth largest sits at index n − k = ${n} − ${k} = ${target}, so we hunt for whatever value ends up at index ${target} — without sorting the whole array.`,
    { lo: 0, hi: n - 1 },
  );

  let lo = 0;
  let hi = n - 1;
  let result: number | null = null;

  while (lo < hi) {
    // --- partition(a, lo, hi) ---
    const pivot = a[hi];
    let store = lo;
    emit(
      'PIVOT',
      `pivot=${pivot}`,
      `Partition the window [${lo}, ${hi}]. Take the last element a[${hi}] = ${pivot} as the pivot. Walk a "store" boundary (start ${store}) — everything left of it will be ≤ pivot.`,
      { lo, hi, pivot, pivotIdx: hi, store, i: lo },
    );

    for (let i = lo; i < hi; i++) {
      if (a[i] <= pivot) {
        if (i !== store) {
          [a[i], a[store]] = [a[store], a[i]];
          emit(
            'SWAP',
            `swap ${i}↔${store}`,
            `a[${i}] = ${a[store]} ≤ ${pivot}, so swap it to the boundary at index ${store} and advance the boundary. Small values pile up on the left.`,
            { lo, hi, pivot, pivotIdx: hi, i, store },
          );
        } else {
          emit(
            'KEEP',
            `keep ${i}`,
            `a[${i}] = ${a[i]} ≤ ${pivot} and it is already at the boundary ${store}, so just advance the boundary.`,
            { lo, hi, pivot, pivotIdx: hi, i, store },
          );
        }
        store++;
      } else {
        emit(
          'PASS',
          `pass ${i}`,
          `a[${i}] = ${a[i]} > ${pivot}, so it belongs on the right — leave it and keep the boundary at ${store}.`,
          { lo, hi, pivot, pivotIdx: hi, i, store },
        );
      }
    }

    [a[store], a[hi]] = [a[hi], a[store]];
    const p = store;
    emit(
      'PLACE',
      `pivot@${p}`,
      `Swap the pivot into the boundary slot ${p}. Now a[${p}] = ${pivot} is in its final sorted position: everything left is ≤ it, everything right is > it.`,
      { lo, hi, pivot, pivotIdx: p, p, store: null, i: null },
    );

    if (p === target) {
      result = a[p];
      emit(
        'FOUND',
        `${a[p]}`,
        `The pivot landed exactly on the target index ${target}, so a[${p}] = ${a[p]} is the ${k}th largest value. Done.`,
        { lo, hi, p, pivotIdx: p, result, done: true },
        'good',
      );
      return frames;
    }

    if (p < target) {
      lo = p + 1;
      emit(
        'RIGHT',
        `lo=${lo}`,
        `Pivot index ${p} < target ${target}, so the answer sits to the right. Discard the left side and search the window [${lo}, ${hi}].`,
        { lo, hi, p, pivotIdx: p },
      );
    } else {
      hi = p - 1;
      emit(
        'LEFT',
        `hi=${hi}`,
        `Pivot index ${p} > target ${target}, so the answer sits to the left. Discard the right side and search the window [${lo}, ${hi}].`,
        { lo, hi, p, pivotIdx: p },
      );
    }
  }

  result = a[lo];
  emit(
    'DONE',
    `${a[lo]}`,
    `The window collapsed to a single cell at index ${lo} = target ${target}, so a[${lo}] = ${a[lo]} is the ${k}th largest value.`,
    { lo, hi: lo, p: lo, result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<KthState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.lo >= 0) pointers.push({ i: s.lo, label: 'lo', tone: 'warn', place: 'above' });
  if (s.hi >= 0 && s.hi !== s.lo) pointers.push({ i: s.hi, label: 'hi', tone: 'warn', place: 'above' });
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'below' });
  if (s.store !== null) pointers.push({ i: s.store, label: 'store', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (s.result !== null && i === s.target) return 'found';
    if (s.pivotIdx === i) return 'mid';
    if (i === s.target) return 'hi';
    if (i >= s.lo && i <= s.hi) return 'in-window';
    return 'dead';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {' · '}target index = n − k ={' '}
        <span className="font-mono text-ink">{s.target}</span>
        {s.pivot !== null && s.result === null && (
          <>
            {' · '}pivot ={' '}
            <span className="font-mono text-ink">{s.pivot}</span>
          </>
        )}
      </div>
      <ArrayRow
        values={s.a}
        cellTone={tone}
        pointers={pointers}
        windowRange={s.lo <= s.hi ? [s.lo, s.hi] : null}
      />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        window [{s.lo}, {s.hi}] · searching index {s.target}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.k}th largest = {s.result}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<KthState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="target (n−k)" v={s.target} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="pivot" v={s.pivot ?? '—'} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="store" v={s.store ?? '—'} />
      <InspectorRow k="p (pivot idx)" v={s.p ?? '—'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-find-kth-largest';
export const title = 'Find Kth largest';

function computeKth(nums: number[], k: number): number {
  const a = nums.slice();
  const target = a.length - k;
  let lo = 0;
  let hi = a.length - 1;
  while (lo < hi) {
    const pivot = a[hi];
    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (a[i] <= pivot) {
        [a[i], a[store]] = [a[store], a[i]];
        store++;
      }
    }
    [a[store], a[hi]] = [a[hi], a[store]];
    const p = store;
    if (p === target) return a[p];
    if (p < target) lo = p + 1;
    else hi = p - 1;
  }
  return a[lo];
}

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'kth1', label: '[3,2,1,5,6,4], k=2', value: { nums: [3, 2, 1, 5, 6, 4], k: 2 } },
    { id: 'kth2', label: '[3,2,3,1,2,4,5,5], k=4 → 3', value: { nums: [3, 2, 3, 1, 2, 4, 5, 5], k: 4 } },
  ] satisfies SampleInput<KthInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as KthState | undefined;
    if (!s || s.result === null) return { ok: false, label: 'no result' };
    const expected = computeKth(s.a.slice(), s.k);
    return { ok: s.result === expected, label: `${s.k}th largest = ${s.result}` };
  },
};

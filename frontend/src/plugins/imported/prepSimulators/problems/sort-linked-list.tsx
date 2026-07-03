import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SortListInput {
  list: number[];
}

interface SortListState {
  // The whole list as it currently stands (the original head order until merges rebuild it).
  chain: number[];
  // Range of `chain` the current step is operating on, [lo, hi] inclusive, or null.
  range: [number, number] | null;
  // Split point inside the active range (index of the first node of the right half), or null.
  split: number | null;
  // Two values being compared during a merge, by their position in `chain`, or null.
  compare: [number, number] | null;
  // Indices of `chain` already placed into the merged output for the active merge.
  placed: number[];
  // The fully sorted result once finished, else null.
  result: number[] | null;
  depth: number;
  done: boolean;
}

function record({ list }: SortListInput): Frame<SortListState>[] {  // We track values by a stable identity so the View can colour comparisons even
  // though merge reorders the array. `chain` always shows the live left→right order.
  let chain = list.slice();

  const { emit, frames } = createRecorder<SortListState>(() => ({
        chain: chain.slice(),
        range: null,
        split: null,
        compare: null,
        placed: [],
        result: null,
        depth: 0,
        done: false
      }));

  emit(
    'INIT',
    `n=${list.length}`,
    `Sort linked list with merge sort: repeatedly split the list at its middle (slow/fast pointers), sort each half recursively, then merge the two sorted halves back together. The chain below shows the node values left→right.`,
    {},
  );

  // Pure merge-sort on values (mirrors the Go ListNode recursion). We rebuild
  // `chain` after each merge so the on-screen order reflects the live linked list.
  const sortRange = (segment: number[], depth: number): number[] => {
    if (segment.length <= 1) {
      if (segment.length === 1) {
        emit(
          'BASE',
          `[${segment[0]}]`,
          `Base case: a single node ([${segment[0]}]) is already sorted, so return it unchanged.`,
          { depth },
        );
      }
      return segment;
    }

    // slow/fast split: fast moves twice as fast, so slow lands just before the
    // midpoint. mid = slow.Next. With an array we split at length/2 (ceil for the
    // left, matching the Go pointers starting slow=head, fast=head.Next).
    const half = Math.ceil(segment.length / 2);
    const left = segment.slice(0, half);
    const right = segment.slice(half);
    emit(
      'SPLIT',
      `${left.length}|${right.length}`,
      `Run slow/fast pointers to find the middle and cut: left half = [${left.join(', ')}], right half = [${right.join(', ')}]. Sort each half on its own.`,
      { depth },
    );

    const sortedLeft = sortRange(left, depth + 1);
    const sortedRight = sortRange(right, depth + 1);

    // mergeSorted: walk both sorted halves, always taking the smaller head.
    const merged: number[] = [];
    let a = 0;
    let b = 0;
    emit(
      'MERGE_START',
      `[${sortedLeft.join(',')}]+[${sortedRight.join(',')}]`,
      `Both halves are sorted now. Merge them: compare the front of [${sortedLeft.join(', ')}] with the front of [${sortedRight.join(', ')}] and append the smaller each time.`,
      { depth },
    );
    while (a < sortedLeft.length && b < sortedRight.length) {
      const av = sortedLeft[a];
      const bv = sortedRight[b];
      if (av < bv) {
        emit(
          'COMPARE',
          `${av} < ${bv}`,
          `${av} (left) < ${bv} (right), so append ${av} to the merged list and advance the left pointer.`,
          { depth },
        );
        merged.push(av);
        a++;
      } else {
        emit(
          'COMPARE',
          `${av} ≥ ${bv}`,
          `${bv} (right) ≤ ${av} (left), so append ${bv} to the merged list and advance the right pointer.`,
          { depth },
        );
        merged.push(bv);
        b++;
      }
    }
    // Whichever half still has nodes is already sorted — attach it wholesale.
    while (a < sortedLeft.length) {
      merged.push(sortedLeft[a]);
      a++;
    }
    while (b < sortedRight.length) {
      merged.push(sortedRight[b]);
      b++;
    }

    // Splice the merged segment back into the live chain so the View updates.
    // We find this segment's window by matching the multiset of values it held.
    chain = rebuildChain(chain, segment, merged);
    emit(
      'MERGED',
      `[${merged.join(',')}]`,
      `Merged into [${merged.join(', ')}]. This sorted run is stitched back into the chain shown below.`,
      { depth },
      'good',
    );
    return merged;
  };

  const result = sortRange(chain.slice(), 0);
  chain = result.slice();
  emit(
    'DONE',
    `[${result.join(',')}]`,
    `Every half has been merged. The full list is sorted: [${result.join(', ')}]. Time O(n log n), space O(1) extra for the in-place linked-list merge.`,
    { result, done: true },
    'good',
  );

  return frames;
}

/**
 * Replace the first contiguous run in `chain` equal to `oldSeg` (in order) with
 * `newSeg`. Both segments hold the same multiset, so the chain length is stable.
 */
function rebuildChain(chain: number[], oldSeg: number[], newSeg: number[]): number[] {
  for (let start = 0; start + oldSeg.length <= chain.length; start++) {
    let ok = true;
    for (let k = 0; k < oldSeg.length; k++) {
      if (chain[start + k] !== oldSeg[k]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return [...chain.slice(0, start), ...newSeg, ...chain.slice(start + oldSeg.length)];
    }
  }
  return chain;
}

function View({ frame }: PluginViewProps<SortListState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.split !== null) pointers.push({ i: s.split, label: 'mid', tone: 'warn', place: 'above' });

  const placed = new Set(s.placed);
  const tone = (i: number) => {
    if (s.result) return 'found';
    if (s.compare && (i === s.compare[0] || i === s.compare[1])) return 'match';
    if (placed.has(i)) return 'in-window';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        merge sort ·{' '}
        <span className="font-mono text-ink">n = {s.chain.length}</span>
        {s.result && (
          <>
            {' · '}
            <span className="text-good">sorted</span>
          </>
        )}
      </div>
      <ArrayRow values={s.chain} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        → {s.chain.join(' → ')}
        {' → null'}
      </div>
      {s.result && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          sorted: [{s.result.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SortListState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (nodes)" v={s.chain.length} />
      <InspectorRow k="depth" v={s.depth} />
      <InspectorRow
        k="comparing"
        v={s.compare ? `${s.chain[s.compare[0]]} vs ${s.chain[s.compare[1]]}` : '—'}
      />
      <InspectorRow k="placed" v={s.placed.length} />
      <InspectorRow k="chain" v={`[${s.chain.join(', ')}]`} />
      <InspectorRow k="result" v={s.result ? `[${s.result.join(', ')}]` : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-sort-linked-list';
export const title = 'Sort linked list';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'sl1', label: '[4,2,1,3]', value: { list: [4, 2, 1, 3] } },
    { id: 'sl2', label: '[-1,5,3,4,0]', value: { list: [-1, 5, 3, 4, 0] } },
  ] satisfies SampleInput<SortListInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SortListState | undefined;
    if (!s?.result) return { ok: false, label: 'unsorted' };
    const ok = s.result.every((v, i) => i === 0 || s.result![i - 1] <= v);
    return { ok, label: `[${s.result.join(', ')}]` };
  },
};

import { cn } from '../../lib/cn';
import { ArrayRow } from '../../components/ArrayRow';
import { vizText } from './vizKit';

export interface DualHeapBoardProps {
  /** Max-heap holding the lower half (shown as sorted desc for display). */
  low: number[];
  /** Min-heap holding the upper half (shown as sorted asc). */
  high: number[];
  highlightLow?: boolean;
  highlightHigh?: boolean;
  median?: number | string | null;
}

/** Visual for two-heap median / stream problems: low max-heap + high min-heap. */
export function DualHeapBoard({ low, high, highlightLow, highlightHigh, median }: DualHeapBoardProps) {
  const lowDisplay = [...low].sort((a, b) => b - a);
  const highDisplay = [...high].sort((a, b) => a - b);
  return (
    <div className="space-y-2">
      <div>
        <div className={cn(vizText.sm, 'text-ink3')}>low (max-heap) · largest of lower half</div>
        <ArrayRow
          values={lowDisplay.length ? lowDisplay.map(String) : ['—']}
          cellTone={(i) => (highlightLow && i === 0 ? 'match' : lowDisplay[i] !== undefined ? 'found' : '')}
          pointers={highlightLow && lowDisplay.length ? [{ i: 0, label: 'top', tone: 'accent', place: 'above' }] : []}
          windowRange={null}
        />
      </div>
      <div>
        <div className={cn(vizText.sm, 'text-ink3')}>high (min-heap) · smallest of upper half</div>
        <ArrayRow
          values={highDisplay.length ? highDisplay.map(String) : ['—']}
          cellTone={(i) => (highlightHigh && i === 0 ? 'match' : highDisplay[i] !== undefined ? 'found' : '')}
          pointers={highlightHigh && highDisplay.length ? [{ i: 0, label: 'top', tone: 'accent', place: 'above' }] : []}
          windowRange={null}
        />
      </div>
      {median != null && (
        <div className={cn('font-mono', vizText.base, 'text-good')}>
          median = {median}
        </div>
      )}
    </div>
  );
}

/** Max-heap push (larger values bubble up). Returns new heap array. */
export function maxHeapPush(heap: number[], v: number): number[] {
  const h = [...heap, v];
  let i = h.length - 1;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (h[p] >= h[i]) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
  return h;
}

/** Max-heap pop root. Returns [newHeap, popped]. */
export function maxHeapPop(heap: number[]): [number[], number] {
  if (heap.length === 0) return [[], 0];
  const top = heap[0];
  if (heap.length === 1) return [[], top];
  const h = [...heap];
  const last = h.pop()!;
  h[0] = last;
  let i = 0;
  for (;;) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let largest = i;
    if (l < h.length && h[l] > h[largest]) largest = l;
    if (r < h.length && h[r] > h[largest]) largest = r;
    if (largest === i) break;
    [h[i], h[largest]] = [h[largest], h[i]];
    i = largest;
  }
  return [h, top];
}

/** Min-heap push. */
export function minHeapPush(heap: number[], v: number): number[] {
  const h = [...heap, v];
  let i = h.length - 1;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (h[p] <= h[i]) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
  return h;
}

/** Min-heap pop root. */
export function minHeapPop(heap: number[]): [number[], number] {
  if (heap.length === 0) return [[], 0];
  const top = heap[0];
  if (heap.length === 1) return [[], top];
  const h = [...heap];
  const last = h.pop()!;
  h[0] = last;
  let i = 0;
  for (;;) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let smallest = i;
    if (l < h.length && h[l] < h[smallest]) smallest = l;
    if (r < h.length && h[r] < h[smallest]) smallest = r;
    if (smallest === i) break;
    [h[i], h[smallest]] = [h[smallest], h[i]];
    i = smallest;
  }
  return [h, top];
}

export function medianFromHeaps(low: number[], high: number[]): number {
  if (low.length === 0 && high.length === 0) return 0;
  if (low.length > high.length) return low[0];
  return (low[0] + high[0]) / 2;
}

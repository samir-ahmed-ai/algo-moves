import type { Frame } from '../../core/types';
import { createRecorder } from './createRecorder';
import {
  maxHeapPop,
  maxHeapPush,
  medianFromHeaps,
  minHeapPop,
  minHeapPush,
} from './dualHeapBoard';

export interface DualHeapMedianState {
  low: number[];
  high: number[];
  op: string;
  added: number | null;
  median: number | null;
  highlightLow: boolean;
  highlightHigh: boolean;
  done: boolean;
  medians?: number[];
}

export interface DualHeapMedianOptions {
  initCaption: string;
  trackMedians?: boolean;
  doneCaption: (finalMedian: number | null, medians: number[]) => string;
}

/** Shared dual-heap median stream recorder for prep simulators. */
export function recordDualHeapMedian(
  nums: number[],
  options: DualHeapMedianOptions,
): Frame<DualHeapMedianState>[] {
  let low: number[] = [];
  let high: number[] = [];
  const medians: number[] = [];

  const { emit, frames } = createRecorder<DualHeapMedianState>(() => ({
    low: [...low],
    high: [...high],
    op: '',
    added: null,
    median: null,
    highlightLow: false,
    highlightHigh: false,
    done: false,
    ...(options.trackMedians ? { medians: medians.slice() } : {}),
  }));

  emit('INIT', 'dual heaps', options.initCaption, {});

  for (const v of nums) {
    emit('ADD', `push ${v} to low`, `Add ${v}: pushLow into max-heap low.`, { op: `add ${v}`, added: v, highlightLow: true });
    low = maxHeapPush(low, v);
    let moved: number;
    [low, moved] = maxHeapPop(low);
    high = minHeapPush(high, moved);
    emit(
      'MOVE',
      `move ${moved} to high`,
      `Pop max from low (${moved}) and pushHigh so every low value ≤ every high value.`,
      { op: `add ${v}`, added: v, highlightHigh: true },
    );
    if (high.length > low.length) {
      let back: number;
      [high, back] = minHeapPop(high);
      low = maxHeapPush(low, back);
      emit(
        'REBALANCE',
        `move ${back} to low`,
        `high has more elements — move smallest of high (${back}) back to low so |low| ≥ |high|.`,
        { op: `add ${v}`, added: v, highlightLow: true },
      );
    }
    const med = medianFromHeaps(low, high);
    if (options.trackMedians) medians.push(med);
    emit(
      'MEDIAN',
      `median ${med}`,
      `After ${v}: low size=${low.length}, high size=${high.length}. Median = ${med}.`,
      {
        op: `add ${v}`,
        added: v,
        median: med,
        ...(options.trackMedians ? { medians: medians.slice() } : {}),
      },
      'good',
    );
  }

  const finalMed = options.trackMedians ? (medians[medians.length - 1] ?? null) : medianFromHeaps(low, high);
  emit(
    'DONE',
    finalMed !== null ? `median ${finalMed}` : 'empty',
    options.doneCaption(finalMed, medians.slice()),
    {
      op: 'done',
      median: finalMed,
      done: true,
      ...(options.trackMedians ? { medians: medians.slice() } : {}),
    },
    'good',
  );
  return frames;
}

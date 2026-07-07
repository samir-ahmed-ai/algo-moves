import type { Frame } from '../../core/types';

export interface SortInput {
  values: number[];
}

export interface SortState {
  values: number[];
  compare: [number, number] | null;
  swap: [number, number] | null;
  sortedFrom: number;
  comparisons: number;
  swaps: number;
}

export type SortEmit = ReturnType<typeof createSortRecorder>['emit'];

/** Shared counters + snapshot state for sort visualizers. */
export function createSortRecorder(initial: number[]) {
  const values = initial.slice();
  const n = values.length;
  let comparisons = 0;
  let swaps = 0;
  let sortedFrom = n;
  const frames: Frame<SortState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    compare: [number, number] | null,
    swap: [number, number] | null,
    tone?: 'good' | 'bad',
  ) => {
    frames.push({
      move: { type, note, caption, ...(tone !== undefined ? { tone } : {}) },
      state: { values: values.slice(), compare, swap, sortedFrom, comparisons, swaps },
    });
  };

  return {
    values,
    n,
    comparisons,
    swaps,
    sortedFrom,
    frames,
    emit,
    incCompare: () => {
      comparisons++;
    },
    incSwap: () => {
      swaps++;
    },
    setSortedFrom: (v: number) => {
      sortedFrom = v;
    },
  };
}

/** Selection sort: scan suffix for minimum, swap to front. */
export interface SelectionSortState {
  values: number[];
  compare: number | null;
  minIdx: number | null;
  sortedUpto: number;
  comparisons: number;
  swaps: number;
}

export function createSelectionSortRecorder(initial: number[]) {
  const values = initial.slice();
  const n = values.length;
  let comparisons = 0;
  let swaps = 0;
  let sortedUpto = 0;
  const frames: Frame<SelectionSortState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    compare: number | null,
    minIdx: number | null,
    tone?: 'good' | 'bad',
  ) => {
    frames.push({
      move: { type, note, caption, ...(tone !== undefined ? { tone } : {}) },
      state: { values: values.slice(), compare, minIdx, sortedUpto, comparisons, swaps },
    });
  };

  return {
    values,
    n,
    frames,
    emit,
    incCompare: () => {
      comparisons++;
    },
    incSwap: () => {
      swaps++;
    },
    setSortedUpto: (v: number) => {
      sortedUpto = v;
    },
  };
}

/** Insertion sort: shift sorted prefix, insert key. */
export interface InsertionSortState {
  values: number[];
  key: number | null;
  keyIdx: number | null;
  compare: number | null;
  sortedUpto: number;
  comparisons: number;
  shifts: number;
}

export function createInsertionSortRecorder(initial: number[]) {
  const values = initial.slice();
  const n = values.length;
  let comparisons = 0;
  let shifts = 0;
  let sortedUpto = n > 0 ? 1 : 0;
  const frames: Frame<InsertionSortState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    key: number | null,
    keyIdx: number | null,
    compare: number | null,
    tone?: 'good' | 'bad',
  ) => {
    frames.push({
      move: { type, note, caption, ...(tone !== undefined ? { tone } : {}) },
      state: { values: values.slice(), key, keyIdx, compare, sortedUpto, comparisons, shifts },
    });
  };

  return {
    values,
    n,
    frames,
    emit,
    incCompare: () => {
      comparisons++;
    },
    incShift: () => {
      shifts++;
    },
    setSortedUpto: (v: number) => {
      sortedUpto = v;
    },
  };
}

// Merge sort and quick sort use divide-and-conquer state (runs/stacks) — keep inline record().

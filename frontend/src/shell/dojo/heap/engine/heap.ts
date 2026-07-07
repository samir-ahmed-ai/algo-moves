/**
 * Pure binary min-heap engine for the Top of the Heap dojo game.
 * The heap is a plain array (children of i live at 2i+1 / 2i+2); scripted
 * ops (insert / pop) auto-begin and the player repairs the invariant by hand:
 * sift up after an insert, sift down after a pop, settle when it holds.
 */

export type HeapOp = { kind: 'insert'; value: number } | { kind: 'pop' };

export interface HeapLevel {
  id: string;
  title: string;
  objective: string;
  lesson: string;
  /** Starting array — must already satisfy the min-heap invariant. */
  seed: number[];
  /** Scripted operations, worked through in order. */
  ops: HeapOp[];
  par: number;
}

export type HeapPhase =
  { kind: 'siftUp'; index: number } | { kind: 'siftDown'; index: number } | { kind: 'done' };

export interface HeapState {
  level: HeapLevel;
  heap: number[];
  /** Values popped off the root, in serve order. */
  served: number[];
  /** Fully completed ops; ops[opsDone] is in flight while a sift is active. */
  opsDone: number;
  phase: HeapPhase;
}

export type HeapMove = 'up' | 'left' | 'right' | 'settle';

export type HeapMoveErrorReason =
  'done' | 'atRoot' | 'invariantHolds' | 'mustSift' | 'wrongPhase' | 'noChild' | 'notSmaller';

export type HeapMoveResult =
  | { ok: true; state: HeapState; kind: 'swap' | 'settle'; index: number; servedNow: number[] }
  | { ok: false; reason: HeapMoveErrorReason; message: string };

export const parentIndex = (i: number): number => (i - 1) >> 1;
export const leftChildIndex = (i: number): number => 2 * i + 1;
export const rightChildIndex = (i: number): number => 2 * i + 2;

/** Tree depth of array slot i (root = 0). */
export function depthOf(i: number): number {
  let d = 0;
  let n = i + 1;
  while (n > 1) {
    n >>= 1;
    d += 1;
  }
  return d;
}

/** A swap up is due only while the parent is strictly bigger. */
export function canSiftUp(heap: readonly number[], i: number): boolean {
  return i > 0 && heap[parentIndex(i)]! > heap[i]!;
}

/** Index of the smaller existing child of i (left wins ties), or null for a leaf. */
export function smallerChildIndex(heap: readonly number[], i: number): number | null {
  const l = leftChildIndex(i);
  const r = rightChildIndex(i);
  if (l >= heap.length) return null;
  if (r >= heap.length) return l;
  return heap[r]! < heap[l]! ? r : l;
}

export function isMinHeap(heap: readonly number[]): boolean {
  for (let i = 1; i < heap.length; i += 1) {
    if (heap[parentIndex(i)]! > heap[i]!) return false;
  }
  return true;
}

export function opLabel(op: HeapOp): string {
  return op.kind === 'insert' ? `insert ${op.value}` : 'pop';
}

export function opsRemaining(state: HeapState): HeapOp[] {
  return state.level.ops.slice(state.opsDone);
}

export function totalPops(level: HeapLevel): number {
  return level.ops.filter((op) => op.kind === 'pop').length;
}

/** Slots the active chip is being compared against: parent up, children down. */
export function comparisonTargets(state: HeapState): number[] {
  const { heap, phase } = state;
  if (phase.kind === 'siftUp') return phase.index > 0 ? [parentIndex(phase.index)] : [];
  if (phase.kind === 'siftDown') {
    return [leftChildIndex(phase.index), rightChildIndex(phase.index)].filter(
      (c) => c < heap.length,
    );
  }
  return [];
}

/**
 * Begin ops until player input is required: an insert opens a sift-up phase,
 * a pop serves the root and opens a sift-down phase. Pops that leave nothing
 * to sift (size ≤ 1) complete on their own.
 */
function withOpsBegun(state: HeapState): HeapState {
  let { heap, served, opsDone } = state;
  const ops = state.level.ops;
  while (opsDone < ops.length) {
    const op = ops[opsDone]!;
    if (op.kind === 'insert') {
      heap = [...heap, op.value];
      return { ...state, heap, served, opsDone, phase: { kind: 'siftUp', index: heap.length - 1 } };
    }
    if (heap.length === 0) {
      opsDone += 1;
      continue;
    }
    served = [...served, heap[0]!];
    if (heap.length === 1) {
      heap = [];
      opsDone += 1;
      continue;
    }
    const next = heap.slice(0, -1);
    next[0] = heap[heap.length - 1]!;
    heap = next;
    return { ...state, heap, served, opsDone, phase: { kind: 'siftDown', index: 0 } };
  }
  return { ...state, heap, served, opsDone, phase: { kind: 'done' } };
}

export function createState(level: HeapLevel): HeapState {
  return withOpsBegun({
    level,
    heap: [...level.seed],
    served: [],
    opsDone: 0,
    phase: { kind: 'done' },
  });
}

function swapped(heap: readonly number[], a: number, b: number): number[] {
  const next = [...heap];
  const t = next[a]!;
  next[a] = next[b]!;
  next[b] = t;
  return next;
}

function err(reason: HeapMoveErrorReason, message: string): HeapMoveResult {
  return { ok: false, reason, message };
}

function completeOp(state: HeapState, settledAt: number): HeapMoveResult {
  const advanced = withOpsBegun({ ...state, opsDone: state.opsDone + 1 });
  return {
    ok: true,
    state: advanced,
    kind: 'settle',
    index: settledAt,
    servedNow: advanced.served.slice(state.served.length),
  };
}

export function applyMove(state: HeapState, move: HeapMove): HeapMoveResult {
  const { heap, phase } = state;
  if (phase.kind === 'done') {
    return err('done', 'All operations are done — the level is complete.');
  }
  const i = phase.index;
  const v = heap[i]!;

  if (phase.kind === 'siftUp') {
    if (move === 'left' || move === 'right') {
      return err(
        'wrongPhase',
        `${v} just arrived and sifts UP — swap with a bigger parent using u, not h/l.`,
      );
    }
    if (move === 'up') {
      if (i === 0) {
        return err('atRoot', `${v} is already the root — nothing sits above it; settle with ↵.`);
      }
      const p = parentIndex(i);
      const pv = heap[p]!;
      if (pv <= v) {
        return err(
          'invariantHolds',
          `Parent ${pv} ≤ ${v} — the invariant already holds; settle with ↵.`,
        );
      }
      return {
        ok: true,
        state: { ...state, heap: swapped(heap, i, p), phase: { kind: 'siftUp', index: p } },
        kind: 'swap',
        index: p,
        servedNow: [],
      };
    }
    // settle
    if (i > 0 && heap[parentIndex(i)]! > v) {
      const pv = heap[parentIndex(i)]!;
      return err(
        'mustSift',
        `${pv} > ${v} — a parent must never exceed its child; keep sifting with u.`,
      );
    }
    return completeOp(state, i);
  }

  // siftDown
  if (move === 'up') {
    return err(
      'wrongPhase',
      `${v} came from the last slot and sifts DOWN — swap with its smaller child using h or l.`,
    );
  }
  if (move === 'left' || move === 'right') {
    const c = move === 'left' ? leftChildIndex(i) : rightChildIndex(i);
    const other = move === 'left' ? rightChildIndex(i) : leftChildIndex(i);
    const side = move === 'left' ? 'left' : 'right';
    if (c >= heap.length) {
      const onlyChild = other < heap.length ? heap[other]! : null;
      return err(
        'noChild',
        onlyChild == null
          ? `${v} has no ${side} child — it is a leaf; settle with ↵.`
          : `${v} has no ${side} child — its only child is ${onlyChild}, on the other side.`,
      );
    }
    const cv = heap[c]!;
    if (other < heap.length && heap[other]! < cv) {
      return err(
        'notSmaller',
        `Swap with the smaller child (${heap[other]!}), not ${cv} — else ${cv} would sit above ${heap[other]!}.`,
      );
    }
    if (cv >= v) {
      return err(
        'invariantHolds',
        `Child ${cv} ≥ ${v} — the invariant already holds; settle with ↵.`,
      );
    }
    return {
      ok: true,
      state: { ...state, heap: swapped(heap, i, c), phase: { kind: 'siftDown', index: c } },
      kind: 'swap',
      index: c,
      servedNow: [],
    };
  }
  // settle
  const sc = smallerChildIndex(heap, i);
  if (sc !== null && heap[sc]! < v) {
    const key = sc === leftChildIndex(i) ? 'h' : 'l';
    return err(
      'mustSift',
      `${v} > ${heap[sc]!} — a parent must never exceed its child; keep sifting down with ${key}.`,
    );
  }
  return completeOp(state, i);
}

export function isComplete(state: HeapState): boolean {
  return state.phase.kind === 'done';
}

const ins = (value: number): HeapOp => ({ kind: 'insert', value });
const pop: HeapOp = { kind: 'pop' };

export const LEVELS: HeapLevel[] = [
  {
    id: 'hp-01',
    title: 'Rise up',
    objective: 'Run 3 inserts — sift each new value up until its parent is smaller.',
    lesson:
      'A min-heap keeps one promise: every parent ≤ its children. New values join at the next free array slot — the only spot that keeps the tree complete — then bubble up: while the parent is bigger, swap with u; the moment it is not, settle with ↵. Watch the strip below the tree: it is the same heap, and the parent of slot i lives at ⌊(i−1)/2⌋.',
    seed: [2, 5, 4],
    ops: [ins(1), ins(6), ins(3)],
    par: 8,
  },
  {
    id: 'hp-02',
    title: 'Serve the minimum',
    objective: 'Pop twice — serve the root, then repair the heap.',
    lesson:
      'The root is always the minimum — that is the whole point of a heap. Pop serves it, and the LAST array element jumps to the root so the tree stays complete. Now sift down: swap with the SMALLER child (h left, l right) while that child beats the node, then settle. Children of slot i live at 2i+1 and 2i+2.',
    seed: [1, 3, 2, 7, 4, 6, 5],
    ops: [pop, pop],
    par: 8,
  },
  {
    id: 'hp-03',
    title: 'Mixed shift',
    objective: 'Survive interleaved inserts and pops without breaking the invariant.',
    lesson:
      'This is a priority queue in the wild: work arrives (insert) and the most urgent job is taken (pop), in any order. Whatever the op, the repair is one local path — up after an insert, down after a pop — never the whole heap. That locality is why both ops cost O(log n).',
    seed: [3, 6, 4],
    ops: [ins(2), pop, ins(1), pop, ins(7)],
    par: 12,
  },
  {
    id: 'hp-04',
    title: 'Build it',
    objective: 'Insert 5 values into an empty heap.',
    lesson:
      'Every heap starts empty. The array fills strictly left to right — a heap never has holes, which is exactly why it fits in an array with no pointers at all. These arrivals come in descending order: the worst case, where each new value is a new minimum and climbs all the way to the root.',
    seed: [],
    ops: [ins(9), ins(7), ins(5), ins(3), ins(1)],
    par: 12,
  },
  {
    id: 'hp-05',
    title: 'Heap sort',
    objective: 'Pop everything — all 7 values, until the heap is empty.',
    lesson:
      'Pop the min, repair, repeat. Because every pop serves the smallest value left, the served strip comes out sorted — that is heap-sort. n pops at O(log n) each makes the whole sort O(n log n), powered by nothing but the invariant you have been defending.',
    seed: [1, 2, 3, 4, 5, 6, 7],
    ops: [pop, pop, pop, pop, pop, pop, pop],
    par: 16,
  },
];

export const LEVEL_IDS: string[] = LEVELS.map((l) => l.id);

export function getLevel(id: string): HeapLevel | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((l) => l.id === currentId);
  if (idx < 0 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1]!.id;
}

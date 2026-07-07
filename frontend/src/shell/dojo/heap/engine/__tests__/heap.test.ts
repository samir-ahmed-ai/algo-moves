import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  applyMove,
  canSiftUp,
  comparisonTargets,
  createState,
  depthOf,
  getLevel,
  isComplete,
  isMinHeap,
  leftChildIndex,
  nextLevelId,
  opLabel,
  parentIndex,
  rightChildIndex,
  smallerChildIndex,
  totalPops,
  type HeapLevel,
  type HeapMove,
  type HeapOp,
  type HeapState,
} from '../heap';

const ins = (value: number): HeapOp => ({ kind: 'insert', value });
const pop: HeapOp = { kind: 'pop' };

const level = (seed: number[], ops: HeapOp[], par = 99): HeapLevel => ({
  id: 'test',
  title: 'test',
  objective: '',
  lesson: '',
  seed,
  ops,
  par,
});

function mustApply(state: HeapState, move: HeapMove): HeapState {
  const result = applyMove(state, move);
  if (!result.ok) throw new Error(`expected ok ${move}: ${result.message}`);
  return result.state;
}

/** Optimal play: swap only while the invariant is broken, always via the smaller child. */
function solveLevel(lv: HeapLevel): { state: HeapState; actionsUsed: number } {
  let state = createState(lv);
  let actionsUsed = 0;
  let guard = 0;
  while (!isComplete(state)) {
    if ((guard += 1) > 300) throw new Error('solver did not terminate');
    const phase = state.phase;
    let move: HeapMove = 'settle';
    if (phase.kind === 'siftUp' && canSiftUp(state.heap, phase.index)) {
      move = 'up';
    } else if (phase.kind === 'siftDown') {
      const sc = smallerChildIndex(state.heap, phase.index);
      if (sc !== null && state.heap[sc]! < state.heap[phase.index]!) {
        move = sc === leftChildIndex(phase.index) ? 'left' : 'right';
      }
    }
    state = mustApply(state, move);
    actionsUsed += 1;
  }
  expect(isMinHeap(state.heap)).toBe(true);
  return { state, actionsUsed };
}

describe('array/tree duality helpers', () => {
  it('maps indices between parent and children', () => {
    expect(parentIndex(1)).toBe(0);
    expect(parentIndex(2)).toBe(0);
    expect(parentIndex(5)).toBe(2);
    expect(leftChildIndex(1)).toBe(3);
    expect(rightChildIndex(1)).toBe(4);
    expect(depthOf(0)).toBe(0);
    expect(depthOf(2)).toBe(1);
    expect(depthOf(6)).toBe(2);
  });

  it('canSiftUp only while the parent is strictly bigger', () => {
    expect(canSiftUp([5, 2], 1)).toBe(true);
    expect(canSiftUp([2, 5], 1)).toBe(false);
    expect(canSiftUp([2, 2], 1)).toBe(false);
    expect(canSiftUp([1], 0)).toBe(false);
  });

  it('smallerChildIndex picks the smaller child, left on ties, null for leaves', () => {
    expect(smallerChildIndex([9, 3, 7], 0)).toBe(1);
    expect(smallerChildIndex([9, 7, 3], 0)).toBe(2);
    expect(smallerChildIndex([9, 3, 3], 0)).toBe(1);
    expect(smallerChildIndex([9, 3], 0)).toBe(1);
    expect(smallerChildIndex([9, 3, 7], 1)).toBeNull();
  });

  it('isMinHeap validates the whole array', () => {
    expect(isMinHeap([1, 2, 3, 4])).toBe(true);
    expect(isMinHeap([1, 4, 2, 3])).toBe(false);
    expect(isMinHeap([])).toBe(true);
  });
});

describe('scripted op runner', () => {
  it('an insert appends at the next slot and opens a sift-up there', () => {
    const state = createState(level([2, 5, 4], [ins(1)]));
    expect(state.heap).toEqual([2, 5, 4, 1]);
    expect(state.phase).toEqual({ kind: 'siftUp', index: 3 });
    expect(comparisonTargets(state)).toEqual([1]);
  });

  it('a pop serves the root, moves the LAST element to the root, and opens a sift-down', () => {
    const state = createState(level([1, 3, 2, 7], [pop]));
    expect(state.served).toEqual([1]);
    expect(state.heap).toEqual([7, 3, 2]);
    expect(state.phase).toEqual({ kind: 'siftDown', index: 0 });
    expect(comparisonTargets(state)).toEqual([1, 2]);
  });

  it('a pop on a single-element heap completes with no sift', () => {
    const state = createState(level([7], [pop]));
    expect(state.served).toEqual([7]);
    expect(state.heap).toEqual([]);
    expect(isComplete(state)).toBe(true);
  });
});

describe('sift up validation', () => {
  const start = createState(level([2, 5, 4], [ins(1)])); // 1 at slot 3, parent 5

  it('accepts u while the parent is bigger and follows the chip upward', () => {
    const one = mustApply(start, 'up');
    expect(one.heap).toEqual([2, 1, 4, 5]);
    expect(one.phase).toEqual({ kind: 'siftUp', index: 1 });
    const two = mustApply(one, 'up');
    expect(two.heap).toEqual([1, 2, 4, 5]);
    expect(two.phase).toEqual({ kind: 'siftUp', index: 0 });
  });

  it('rejects u when the parent already satisfies the invariant', () => {
    const state = createState(level([2, 3, 4], [ins(5)])); // parent 3 ≤ 5
    const result = applyMove(state, 'up');
    expect(result).toMatchObject({ ok: false, reason: 'invariantHolds' });
    if (!result.ok) expect(result.message).toContain('Parent 3 ≤ 5');
  });

  it('rejects u at the root', () => {
    const atRoot = mustApply(mustApply(start, 'up'), 'up');
    expect(applyMove(atRoot, 'up')).toMatchObject({ ok: false, reason: 'atRoot' });
  });

  it('rejects an early settle while the parent still exceeds the chip', () => {
    const result = applyMove(start, 'settle');
    expect(result).toMatchObject({ ok: false, reason: 'mustSift' });
    if (!result.ok)
      expect(result.message).toContain('5 > 1 — a parent must never exceed its child');
  });

  it('rejects h/l during a sift-up', () => {
    expect(applyMove(start, 'left')).toMatchObject({ ok: false, reason: 'wrongPhase' });
    expect(applyMove(start, 'right')).toMatchObject({ ok: false, reason: 'wrongPhase' });
  });

  it('settles once the parent is ≤ the chip and completes the op', () => {
    const state = createState(level([2, 3, 4], [ins(5)]));
    const result = applyMove(state, 'settle');
    expect(result).toMatchObject({ ok: true, kind: 'settle' });
    if (result.ok) expect(isComplete(result.state)).toBe(true);
  });
});

describe('sift down validation', () => {
  // pop [1,3,2,7,4,6,5] → 5 at root over children 3 (left) and 2 (right)
  const start = createState(level([1, 3, 2, 7, 4, 6, 5], [pop]));

  it('rejects swapping with the bigger child, quoting the smaller one', () => {
    const result = applyMove(start, 'left'); // left child 3, but smaller is 2
    expect(result).toMatchObject({ ok: false, reason: 'notSmaller' });
    if (!result.ok) expect(result.message).toContain('Swap with the smaller child (2), not 3');
  });

  it('accepts swapping with the smaller child and follows the chip down', () => {
    const one = mustApply(start, 'right');
    expect(one.heap).toEqual([2, 3, 5, 7, 4, 6]);
    expect(one.phase).toEqual({ kind: 'siftDown', index: 2 });
  });

  it('rejects a swap toward a missing child', () => {
    const one = mustApply(start, 'right'); // 5 now at slot 2 with only a left child (6)
    expect(applyMove(one, 'right')).toMatchObject({ ok: false, reason: 'noChild' });
  });

  it('rejects a swap when the child is not smaller than the node', () => {
    const one = mustApply(start, 'right'); // 5 at slot 2, left child 6 ≥ 5
    const result = applyMove(one, 'left');
    expect(result).toMatchObject({ ok: false, reason: 'invariantHolds' });
    if (!result.ok) expect(result.message).toContain('6 ≥ 5');
  });

  it('rejects u during a sift-down', () => {
    expect(applyMove(start, 'up')).toMatchObject({ ok: false, reason: 'wrongPhase' });
  });

  it('rejects an early settle while a smaller child exists', () => {
    const result = applyMove(start, 'settle');
    expect(result).toMatchObject({ ok: false, reason: 'mustSift' });
    if (!result.ok) expect(result.message).toContain('5 > 2');
  });

  it('settles a leaf or invariant-holding node and reports newly served values', () => {
    const one = mustApply(start, 'right');
    const result = applyMove(one, 'settle'); // 5 ≤ its only child 6
    expect(result).toMatchObject({ ok: true, kind: 'settle' });
    if (result.ok) {
      expect(isComplete(result.state)).toBe(true);
      expect(result.state.served).toEqual([1]);
    }
  });

  it('a settle that begins a follow-up pop surfaces the newly served root', () => {
    const state = createState(level([1, 3, 2], [pop, pop]));
    // pop 1 → last element 2 takes the root over child 3; invariant already holds.
    const settled = applyMove(state, 'settle');
    expect(settled).toMatchObject({ ok: true });
    if (settled.ok) {
      expect(settled.servedNow).toEqual([2]);
      expect(settled.state.served).toEqual([1, 2]);
    }
  });

  it('rejects every move once all ops are done', () => {
    const done = createState(level([1], []));
    expect(isComplete(done)).toBe(true);
    expect(applyMove(done, 'up')).toMatchObject({ ok: false, reason: 'done' });
    expect(applyMove(done, 'settle')).toMatchObject({ ok: false, reason: 'done' });
  });
});

describe('levels', () => {
  it('exposes exactly the five registry level ids in order', () => {
    expect(LEVEL_IDS).toEqual(['hp-01', 'hp-02', 'hp-03', 'hp-04', 'hp-05']);
    expect(nextLevelId('hp-04')).toBe('hp-05');
    expect(nextLevelId('hp-05')).toBeNull();
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))('%s seed is a valid min-heap', (_id, lv) => {
    expect(isMinHeap(lv.seed)).toBe(true);
  });

  it('matches the designed op mixes', () => {
    expect(getLevel('hp-01')!.ops.filter((o) => o.kind === 'insert')).toHaveLength(3);
    expect(totalPops(getLevel('hp-02')!)).toBe(2);
    const mixed = getLevel('hp-03')!.ops.map((o) => o.kind);
    expect(mixed).toContain('insert');
    expect(mixed).toContain('pop');
    expect(getLevel('hp-04')!.seed).toEqual([]);
    expect(getLevel('hp-04')!.ops).toHaveLength(5);
    expect(getLevel('hp-05')!.ops.every((o) => o.kind === 'pop')).toBe(true);
    expect(opLabel(ins(5))).toBe('insert 5');
    expect(opLabel(pop)).toBe('pop');
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: an optimal playthrough completes within par',
    (_id, lv) => {
      const { state, actionsUsed } = solveLevel(lv);
      expect(isComplete(state)).toBe(true);
      expect(actionsUsed).toBeLessThanOrEqual(lv.par);
      expect(state.served).toHaveLength(totalPops(lv));
      expect(state.opsDone).toBe(lv.ops.length);
    },
  );

  it('hp-05 pops everything: the served strip ends fully sorted and the heap empty', () => {
    const lv = getLevel('hp-05')!;
    const { state } = solveLevel(lv);
    expect(state.heap).toEqual([]);
    expect(state.served).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const sorted = [...state.served].sort((a, b) => a - b);
    expect(state.served).toEqual(sorted);
  });
});

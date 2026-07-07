import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  createState,
  edgeKey,
  getLevel,
  isComplete,
  minUnsettled,
  neighbors,
  nextLevelId,
  referenceRun,
  settleNode,
  shortestPath,
  shortestPathEdges,
  type SignalLevel,
  type SignalState,
} from '../signal';

function settleOk(level: SignalLevel, state: SignalState, key: number): SignalState {
  const result = settleNode(level, state, key);
  if (!result.ok) throw new Error(`expected settle of ${key} to succeed: ${result.reason}`);
  return result.state;
}

const dj01 = getLevel('dj-01')!;
const dj02 = getLevel('dj-02')!;
const dj05 = getLevel('dj-05')!;

describe('level catalog', () => {
  it('has exactly 5 levels with the expected ids', () => {
    expect(LEVEL_IDS).toEqual(['dj-01', 'dj-02', 'dj-03', 'dj-04', 'dj-05']);
  });

  it('chains levels via nextLevelId', () => {
    expect(nextLevelId('dj-01')).toBe('dj-02');
    expect(nextLevelId('dj-05')).toBeNull();
    expect(nextLevelId('nope')).toBeNull();
  });

  it('uses unique keycap digits 1..9 per level and valid edge endpoints', () => {
    for (const level of LEVELS) {
      const keys = level.nodes.map((n) => n.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const k of keys) expect(k).toBeGreaterThanOrEqual(1);
      for (const k of keys) expect(k).toBeLessThanOrEqual(9);
      for (const e of level.edges) {
        expect(keys).toContain(e.a);
        expect(keys).toContain(e.b);
        expect(e.w).toBeGreaterThan(0);
      }
      expect(keys).toContain(level.source);
      expect(keys).toContain(level.target);
    }
  });
});

describe('initial state', () => {
  it('starts the source at 0 and everything else at ∞, nothing settled', () => {
    const state = createState(dj01);
    expect(state.dist[1]).toBe(0);
    expect(state.dist[2]).toBe(Infinity);
    expect(state.dist[4]).toBe(Infinity);
    expect(state.settled).toEqual([]);
    expect(minUnsettled(dj01, state)).toEqual({ keys: [1], dist: 0 });
  });
});

describe('relaxation math', () => {
  it('settling the source relaxes its out-edges with correct old/new distances', () => {
    const result = settleNode(dj02, createState(dj02), 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byTo = new Map(result.relaxations.map((r) => [r.to, r]));
    expect(byTo.get(2)).toMatchObject({ oldDist: Infinity, newDist: 2, improved: true });
    expect(byTo.get(3)).toMatchObject({ oldDist: Infinity, newDist: 4, improved: true });
    expect(byTo.get(4)).toMatchObject({ oldDist: Infinity, newDist: 9, improved: true });
    expect(result.state.pred[2]).toBe(1);
    expect(result.state.pred[4]).toBe(1);
  });

  it('records non-improving relax attempts without changing dist or pred', () => {
    let state = createState(dj02);
    state = settleOk(dj02, state, 1);
    state = settleOk(dj02, state, 2); // dist(4): 9 → 5, pred 4 = 2
    const result = settleNode(dj02, state, 3); // 4 + 4 = 8, not < 5
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const relax = result.relaxations.find((r) => r.to === 4)!;
    expect(relax).toMatchObject({ oldDist: 5, newDist: 5, improved: false });
    expect(result.state.dist[4]).toBe(5);
    expect(result.state.pred[4]).toBe(2);
  });

  it('never relaxes into already-settled nodes', () => {
    let state = createState(dj01);
    state = settleOk(dj01, state, 1);
    const result = settleNode(dj01, state, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.relaxations.every((r) => r.to !== 1)).toBe(true);
  });

  it('lists neighbors on both sides of an undirected edge', () => {
    expect(
      neighbors(dj01, 2)
        .map((n) => n.to)
        .sort(),
    ).toEqual([1, 3]);
  });
});

describe('the min rule', () => {
  it('rejects a reached but non-minimal node, quoting both distances', () => {
    // dj-02 after the source settles: dist(3)=4 while dist(2)=2.
    let state = createState(dj02);
    state = settleOk(dj02, state, 1);
    const wrong = settleNode(dj02, state, 3);
    expect(wrong).toMatchObject({ ok: false, reason: 'notMin', dist: 4, minKey: 2, minDist: 2 });
    expect(settleNode(dj02, state, 2).ok).toBe(true);
  });

  it('rejects an unreached (∞) node and points at the current minimum', () => {
    const state = createState(dj01);
    const result = settleNode(dj01, state, 4);
    expect(result).toMatchObject({ ok: false, reason: 'unreached', minKey: 1, minDist: 0 });
  });

  it('treats an already-settled node as a no-op reason', () => {
    let state = createState(dj01);
    state = settleOk(dj01, state, 1);
    expect(settleNode(dj01, state, 1)).toEqual({ ok: false, reason: 'settled' });
  });

  it('accepts ANY member of a tie set (dj-05: Elm and Fir both at 2)', () => {
    const state = settleOk(dj05, createState(dj05), 1);
    const min = minUnsettled(dj05, state);
    expect(min).toEqual({ keys: [2, 4], dist: 2 });
    expect(settleNode(dj05, state, 2).ok).toBe(true);
    expect(settleNode(dj05, state, 4).ok).toBe(true);
  });

  it('accepts the later tie set too (dj-05: Ivy and Yew at 7)', () => {
    let state = createState(dj05);
    for (const key of [1, 2, 4, 5]) state = settleOk(dj05, state, key);
    const min = minUnsettled(dj05, state);
    expect(min).toEqual({ keys: [6, 8], dist: 7 });
    expect(settleNode(dj05, state, 6).ok).toBe(true);
    expect(settleNode(dj05, state, 8).ok).toBe(true);
  });
});

describe('dj-01 exact distances', () => {
  it('settles 1,2,3,4 with distances 0,2,5,9', () => {
    const { order, state } = referenceRun(dj01);
    expect(order).toEqual([1, 2, 3, 4]);
    expect(state.dist).toEqual({ 1: 0, 2: 2, 3: 5, 4: 9 });
    expect(isComplete(dj01, state)).toBe(true);
  });
});

describe('dj-02 the tempting shortcut', () => {
  it('reaches exact final distances 0,2,4,5', () => {
    const { state } = referenceRun(dj02);
    expect(state.dist).toEqual({ 1: 0, 2: 2, 3: 4, 4: 5 });
  });

  it("improves the target's label from 9 to 5 BEFORE the target settles", () => {
    let state = createState(dj02);
    state = settleOk(dj02, state, 1);
    expect(state.dist[4]).toBe(9); // tentative via the direct wire
    expect(state.settled).not.toContain(4);
    state = settleOk(dj02, state, 2);
    expect(state.dist[4]).toBe(5); // improved by the detour
    expect(state.settled).not.toContain(4); // still not settled
    expect(state.pred[4]).toBe(2);
  });

  it('tracebacks the detour 1 → 2 → 4, total 5', () => {
    const { state } = referenceRun(dj02);
    expect(shortestPath(dj02, state)).toEqual([1, 2, 4]);
    expect(state.dist[4]).toBe(5);
    expect(shortestPathEdges(dj02, state)).toEqual(new Set([edgeKey(1, 2), edgeKey(2, 4)]));
  });
});

describe('path traceback', () => {
  it('dj-04 avoids the cheap first edge: 1 → 3 → 4 → 6 → 7, total 9', () => {
    const dj04 = getLevel('dj-04')!;
    const { state } = referenceRun(dj04);
    expect(shortestPath(dj04, state)).toEqual([1, 3, 4, 6, 7]);
    expect(state.dist[7]).toBe(9);
  });

  it('dj-05 routes 1 → 2 → 5 → 6 → 9, total 9', () => {
    const { state } = referenceRun(dj05);
    expect(shortestPath(dj05, state)).toEqual([1, 2, 5, 6, 9]);
    expect(state.dist[9]).toBe(9);
  });

  it('returns an empty path when the traceback does not reach the source', () => {
    const state = createState(dj02);
    expect(shortestPath(dj02, state)).toEqual([]);
  });
});

describe('par = reference settles on every level', () => {
  it.each(LEVELS.map((level) => [level.id, level] as const))(
    '%s par matches the reference run and completes at the target',
    (_id, level) => {
      const { order, state } = referenceRun(level);
      expect(order.length).toBe(level.par);
      expect(order[0]).toBe(level.source);
      expect(order[order.length - 1]).toBe(level.target);
      expect(isComplete(level, state)).toBe(true);
      expect(shortestPath(level, state)[0]).toBe(level.source);
    },
  );
});

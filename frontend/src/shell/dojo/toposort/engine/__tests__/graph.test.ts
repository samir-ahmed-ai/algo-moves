import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  createPlayState,
  getLevel,
  inDegrees,
  isComplete,
  isStuck,
  layerOf,
  lockNode,
  nextLevelId,
  readyIndices,
  unmetPrereq,
  type TopoLevel,
  type TopoPlayState,
} from '../graph';

const diamond = getLevel('ts-02')!;

function ready(state: TopoPlayState): number[] {
  return readyIndices(state.level.nodes, state.level.edges, new Set(state.locked));
}

/** Run Kahn's by always locking the first ready node. */
function runKahn(level: TopoLevel): TopoPlayState {
  let state = createPlayState(level);
  while (!isComplete(state) && !isStuck(state)) {
    state = lockNode(state, ready(state)[0]!);
  }
  return state;
}

describe('toposort engine', () => {
  it('computes in-degrees on the diamond', () => {
    expect(inDegrees(diamond.nodes, diamond.edges, new Set())).toEqual([0, 1, 1, 2]);
    expect(inDegrees(diamond.nodes, diamond.edges, new Set([0]))).toEqual([0, 0, 0, 2]);
    expect(inDegrees(diamond.nodes, diamond.edges, new Set([0, 1]))).toEqual([0, 0, 0, 1]);
    expect(inDegrees(diamond.nodes, diamond.edges, new Set([0, 1, 2]))).toEqual([0, 0, 0, 0]);
  });

  it('evolves the ready set correctly through a full lock sequence', () => {
    let state = createPlayState(diamond);
    expect(ready(state)).toEqual([0]);
    state = lockNode(state, 0);
    expect(ready(state)).toEqual([1, 2]);
    state = lockNode(state, 2);
    expect(ready(state)).toEqual([1]);
    state = lockNode(state, 1);
    expect(ready(state)).toEqual([3]);
    state = lockNode(state, 3);
    expect(ready(state)).toEqual([]);
    expect(isComplete(state)).toBe(true);
    expect(state.locked).toEqual([0, 2, 1, 3]);
  });

  it('lockNode ignores nodes that are not ready or already locked', () => {
    const fresh = createPlayState(diamond);
    expect(lockNode(fresh, 3)).toBe(fresh);
    const one = lockNode(fresh, 0);
    expect(lockNode(one, 0)).toBe(one);
  });

  it('layers every edge source strictly earlier than its target (acyclic levels)', () => {
    for (const level of LEVELS.filter((l) => !l.cyclic)) {
      const layers = layerOf(level.nodes, level.edges);
      for (const [from, to] of level.edges) {
        expect(layers[from], `${level.id} edge ${from}->${to}`).toBeLessThan(layers[to]!);
      }
    }
  });

  it('fully locks every acyclic level by repeatedly taking ready nodes', () => {
    for (const level of LEVELS.filter((l) => !l.cyclic)) {
      const state = runKahn(level);
      expect(isComplete(state), level.id).toBe(true);
      expect(isStuck(state)).toBe(false);
    }
  });

  it('gets stuck on the cyclic level with exactly the cycle {2,3,4} remaining', () => {
    const level = getLevel('ts-05')!;
    const state = runKahn(level);
    expect(isComplete(state)).toBe(false);
    expect(isStuck(state)).toBe(true);
    const remaining = level.nodes
      .map((_, i) => i)
      .filter((i) => !state.locked.includes(i))
      .sort((a, b) => a - b);
    expect(remaining).toEqual([2, 3, 4]);
  });

  it('unmetPrereq returns a real unlocked prerequisite', () => {
    const fresh = createPlayState(diamond);
    const p = unmetPrereq(fresh, 3);
    expect(p).not.toBeNull();
    expect(diamond.edges.some(([from, to]) => to === 3 && from === p)).toBe(true);
    const later = lockNode(lockNode(fresh, 0), 1);
    expect(unmetPrereq(later, 3)).toBe(2);
    expect(unmetPrereq(later, 2)).toBeNull();
  });

  it('keeps par achievable on every level', () => {
    for (const level of LEVELS) {
      const state = runKahn(level);
      const actions = state.locked.length + (level.cyclic ? 1 : 0);
      expect(actions, level.id).toBeLessThanOrEqual(level.par);
    }
  });

  it('exposes exactly six levels with working lookups', () => {
    expect(LEVEL_IDS).toEqual(['ts-01', 'ts-02', 'ts-03', 'ts-04', 'ts-05', 'ts-06']);
    expect(getLevel('nope')).toBeUndefined();
    expect(nextLevelId('ts-01')).toBe('ts-02');
    expect(nextLevelId('ts-06')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  applyUnion,
  applyUnionWithParent,
  componentSize,
  createDsu,
  createLevelDsu,
  edgeAnswer,
  find,
  getLevel,
  isConnected,
  judgeUnionPress,
  nextLevelId,
  rootOf,
  unionBySizeParent,
  type DsuState,
  type UfLevel,
} from '../dsu';

/** Play a whole level optimally; returns actions used (one per op). */
function runOptimal(level: UfLevel): { state: DsuState; actions: number } {
  let state = createLevelDsu(level);
  for (const op of level.ops) {
    if (op.type === 'connected') {
      // Answering correctly does not change the DSU.
      expect(typeof isConnected(state, op.a, op.b)).toBe('boolean');
    } else if (op.type === 'union') {
      const winner = unionBySizeParent(state, op.a, op.b);
      expect(winner, `${level.id} union(${op.a},${op.b}) must merge two trees`).not.toBeNull();
      const judged = judgeUnionPress(state, op.a, op.b, winner!);
      expect(judged.ok, `${level.id} pressing ${winner} for union(${op.a},${op.b})`).toBe(true);
      state = applyUnion(state, op.a, op.b);
    } else {
      state = edgeAnswer(state, op.a, op.b) === 'u' ? applyUnion(state, op.a, op.b) : state;
    }
  }
  return { state, actions: level.ops.length };
}

describe('dsu core', () => {
  it('find follows parent pointers iteratively to the root', () => {
    // 3 -> 1 -> 0 -> 0, 2 -> 2
    const parent = [0, 0, 2, 1];
    expect(find(parent, 3)).toBe(0);
    expect(find(parent, 1)).toBe(0);
    expect(find(parent, 0)).toBe(0);
    expect(find(parent, 2)).toBe(2);
  });

  it('createDsu makes n singleton roots of size 1', () => {
    const s = createDsu(4);
    expect(s.parent).toEqual([0, 1, 2, 3]);
    expect(s.size).toEqual([1, 1, 1, 1]);
    expect(isConnected(s, 0, 3)).toBe(false);
  });

  it('applyUnion merges sizes and connects, and is immutable', () => {
    const s0 = createDsu(4);
    const s1 = applyUnion(s0, 0, 1);
    expect(s0.parent).toEqual([0, 1, 2, 3]);
    expect(isConnected(s1, 0, 1)).toBe(true);
    expect(componentSize(s1, 1)).toBe(2);
    const s2 = applyUnion(s1, 2, 0);
    // {2} size 1 under {0,1} size 2 → root stays 0.
    expect(rootOf(s2, 2)).toBe(0);
    expect(componentSize(s2, 2)).toBe(3);
    // Already-connected union is a no-op.
    expect(applyUnion(s2, 1, 2)).toBe(s2);
  });

  it('unionBySizeParent picks the larger root, a-side root on ties', () => {
    let s = createDsu(6);
    expect(unionBySizeParent(s, 0, 1)).toBe(0); // tie → a's root
    expect(unionBySizeParent(s, 1, 0)).toBe(1);
    s = applyUnion(s, 0, 1); // {0,1} root 0
    expect(unionBySizeParent(s, 2, 0)).toBe(0); // 1 vs 2 → bigger root 0
    expect(unionBySizeParent(s, 0, 2)).toBe(0);
    expect(unionBySizeParent(s, 0, 1)).toBeNull(); // same tree
  });

  it('applyUnionWithParent honors the chosen winner on ties', () => {
    const s = createDsu(2);
    const t = applyUnionWithParent(s, 1, 0);
    expect(rootOf(t, 0)).toBe(1);
    expect(t.size[1]).toBe(2);
  });
});

describe('judgeUnionPress', () => {
  // {0,1,2} root 0 size 3 · {3,4} root 3 size 2 · {5} size 1
  const base = (() => {
    let s = createDsu(6);
    s = applyUnion(s, 0, 1);
    s = applyUnion(s, 1, 2);
    s = applyUnion(s, 3, 4);
    return s;
  })();

  it('accepts the larger root and rejects the smaller with sizes named', () => {
    expect(judgeUnionPress(base, 0, 3, 0)).toEqual({ ok: true, winner: 0, loser: 3 });
    expect(judgeUnionPress(base, 0, 3, 3)).toEqual({
      ok: false,
      reason: 'smaller',
      pressedSize: 2,
      otherRoot: 0,
      otherSize: 3,
    });
  });

  it('rejects a non-root press and names its actual root', () => {
    expect(judgeUnionPress(base, 0, 3, 4)).toEqual({ ok: false, reason: 'not-root', root: 3 });
    expect(judgeUnionPress(base, 0, 3, 2)).toEqual({ ok: false, reason: 'not-root', root: 0 });
  });

  it('rejects an island outside both trees', () => {
    expect(judgeUnionPress(base, 0, 3, 5)).toEqual({ ok: false, reason: 'outside' });
  });

  it('accepts either root on a size tie', () => {
    const s = createDsu(4);
    expect(judgeUnionPress(s, 0, 1, 0)).toEqual({ ok: true, winner: 0, loser: 1 });
    expect(judgeUnionPress(s, 0, 1, 1)).toEqual({ ok: true, winner: 1, loser: 0 });
  });
});

describe('levels', () => {
  it('exposes exactly five levels with working lookups', () => {
    expect(LEVEL_IDS).toEqual(['uf-01', 'uf-02', 'uf-03', 'uf-04', 'uf-05']);
    expect(getLevel('nope')).toBeUndefined();
    expect(nextLevelId('uf-01')).toBe('uf-02');
    expect(nextLevelId('uf-05')).toBeNull();
  });

  it('uf-01 pre-bridges give the expected roots and sizes', () => {
    const s = createLevelDsu(getLevel('uf-01')!);
    expect([0, 1, 2].map((i) => rootOf(s, i))).toEqual([0, 0, 0]);
    expect([3, 4].map((i) => rootOf(s, i))).toEqual([3, 3]);
    expect(rootOf(s, 5)).toBe(5);
    expect(componentSize(s, 2)).toBe(3);
    expect(componentSize(s, 4)).toBe(2);
    expect(componentSize(s, 5)).toBe(1);
  });

  it('uf-01 queries have the intended yes/no pattern', () => {
    const level = getLevel('uf-01')!;
    const s = createLevelDsu(level);
    const answers = level.ops.map((op) => isConnected(s, op.a, op.b));
    expect(answers).toEqual([true, false, true, false, true]);
  });

  it('uf-02 teaches size ordering including a tie case', () => {
    const level = getLevel('uf-02')!;
    let s = createLevelDsu(level);
    // Op 1: union(3,4) is a 1v1 tie — both roots accepted.
    expect(judgeUnionPress(s, 3, 4, 3).ok).toBe(true);
    expect(judgeUnionPress(s, 3, 4, 4).ok).toBe(true);
    s = applyUnion(s, 3, 4);
    // Op 2: {0,1,2} size 3 beats {3,4} size 2.
    expect(unionBySizeParent(s, 0, 3)).toBe(0);
    expect(judgeUnionPress(s, 0, 3, 3)).toMatchObject({ ok: false, reason: 'smaller' });
    s = applyUnion(s, 0, 3);
    s = applyUnion(s, 5, 6);
    // Op 4: {5,6} size 2 under the size-5 tree rooted at 0.
    expect(unionBySizeParent(s, 6, 0)).toBe(0);
  });

  it("uf-04's exact edge feed has cycles at ops 4 and 6 only", () => {
    const level = getLevel('uf-04')!;
    let s = createLevelDsu(level);
    const answers: ('c' | 'u')[] = [];
    for (const op of level.ops) {
      expect(op.type).toBe('edge');
      const a = edgeAnswer(s, op.a, op.b);
      answers.push(a);
      if (a === 'u') s = applyUnion(s, op.a, op.b);
    }
    expect(answers).toEqual(['u', 'u', 'u', 'c', 'u', 'c']);
    expect(componentSize(s, 0)).toBe(5);
  });

  it('every union op merges two distinct trees when reached in order', () => {
    for (const level of LEVELS) {
      let s = createLevelDsu(level);
      for (const op of level.ops) {
        if (op.type === 'union') {
          expect(
            unionBySizeParent(s, op.a, op.b),
            `${level.id} union(${op.a},${op.b})`,
          ).not.toBeNull();
          s = applyUnion(s, op.a, op.b);
        } else if (op.type === 'edge' && edgeAnswer(s, op.a, op.b) === 'u') {
          s = applyUnion(s, op.a, op.b);
        }
      }
    }
  });

  it('an optimal run of each level lands within par', () => {
    for (const level of LEVELS) {
      const { actions } = runOptimal(level);
      expect(actions, level.id).toBeLessThanOrEqual(level.par);
    }
  });

  it('uf-05 mixes all three op types and ends fully connected', () => {
    const level = getLevel('uf-05')!;
    const types = new Set(level.ops.map((o) => o.type));
    expect(types).toEqual(new Set(['connected', 'union', 'edge']));
    const { state } = runOptimal(level);
    expect(componentSize(state, 0)).toBe(level.islands.length);
  });
});

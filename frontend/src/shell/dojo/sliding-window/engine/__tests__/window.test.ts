import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  applyMove,
  bruteForceBest,
  canonicalActions,
  createState,
  forcedMove,
  getLevel,
  isDone,
  isValidWindow,
  meterValue,
  nextLevelId,
  runCanonical,
  windowCounts,
  windowSum,
  type WindowLevel,
  type WindowState,
} from '../window';

const minSum = getLevel('sw-01')!; // [2,3,1,2,4,3,2,1], S=7
const fruits = getLevel('sw-03')!; // [0,0,1,1,0,2,2,1,2], K=2

function stateAt(level: WindowLevel, l: number, r: number): WindowState {
  return { level, l, r, best: null };
}

describe('sliding-window engine', () => {
  it('meters the window: sum for min-sum, distinct kinds for max-distinct', () => {
    expect(windowSum(stateAt(minSum, 0, 3))).toBe(8);
    expect(meterValue(stateAt(minSum, 0, 3))).toBe(8);
    expect(meterValue(stateAt(fruits, 0, 5))).toBe(3);
    expect(windowCounts(stateAt(fruits, 0, 4))).toEqual(
      new Map([
        [0, 3],
        [1, 2],
      ]),
    );
    // Empty window (l = r + 1): sum 0, zero kinds.
    expect(windowSum(stateAt(minSum, 4, 3))).toBe(0);
    expect(meterValue(stateAt(fruits, 4, 3))).toBe(0);
  });

  it('forces grow when a min-sum window is invalid and shrink when valid', () => {
    expect(isValidWindow(stateAt(minSum, 0, 2))).toBe(false); // 2+3+1 = 6 < 7
    expect(forcedMove(stateAt(minSum, 0, 2))).toBe('grow');
    expect(isValidWindow(stateAt(minSum, 0, 3))).toBe(true); // 8 ≥ 7
    expect(forcedMove(stateAt(minSum, 0, 3))).toBe('shrink');
    // Valid at the right end still shrinks — only a forced grow can finish.
    expect(forcedMove(stateAt(minSum, 3, 7))).toBe('shrink'); // 2+4+3+2+1 = 12 ≥ 7
    expect(forcedMove(stateAt(minSum, 5, 7))).toBe('done'); // 3+2+1 = 6 < 7, R at end
  });

  it('forces grow when a max-distinct window is valid and shrink when invalid', () => {
    expect(forcedMove(stateAt(fruits, 0, 4))).toBe('grow'); // 2 kinds ≤ 2
    expect(forcedMove(stateAt(fruits, 0, 5))).toBe('shrink'); // 3 kinds > 2
    expect(forcedMove(stateAt(fruits, 5, 8))).toBe('done'); // {🍒,🍌} at the end
    expect(forcedMove(stateAt(fruits, 1, 8))).toBe('shrink'); // 3 kinds, even at the end
  });

  it('rejects the non-forced move and reports what was forced', () => {
    const invalid = stateAt(minSum, 0, 0);
    expect(applyMove(invalid, 'shrink')).toEqual({ ok: false, forced: 'grow' });
    const valid = stateAt(minSum, 0, 3);
    expect(applyMove(valid, 'grow')).toEqual({ ok: false, forced: 'shrink' });
    const done = stateAt(minSum, 5, 7);
    expect(applyMove(done, 'grow')).toEqual({ ok: false, forced: 'done' });
    expect(applyMove(done, 'shrink')).toEqual({ ok: false, forced: 'done' });
  });

  it('applies forced moves by advancing exactly one pointer rightward', () => {
    const grown = applyMove(stateAt(minSum, 0, 0), 'grow');
    expect(grown.ok && grown.state.l === 0 && grown.state.r === 1).toBe(true);
    const shrunk = applyMove(stateAt(minSum, 0, 3), 'shrink');
    expect(shrunk.ok && shrunk.state.l === 1 && shrunk.state.r === 3).toBe(true);
  });

  it('records the best window only on strict improvement', () => {
    // Entering [0..3] (sum 8) for the first time is a best.
    const first = applyMove({ level: minSum, l: 0, r: 2, best: null }, 'grow');
    expect(first.ok && first.improved).toBe(true);
    expect(first.ok && first.state.best).toEqual({ l: 0, r: 3, len: 4 });
    // A same-length valid window later is not an improvement.
    const tie = applyMove({ level: minSum, l: 0, r: 3, best: { l: 9, r: 12, len: 4 } }, 'shrink');
    expect(tie.ok && tie.improved).toBe(false); // [1..3] sum 6 is invalid anyway
    const sameLen = applyMove({ level: minSum, l: 1, r: 3, best: { l: 0, r: 3, len: 4 } }, 'grow');
    expect(sameLen.ok && sameLen.improved).toBe(false); // [1..4] sum 10, len 4 ties
    // A shorter valid window wins on min-sum.
    const shorter = applyMove(
      { level: minSum, l: 1, r: 4, best: { l: 0, r: 3, len: 4 } },
      'shrink',
    );
    expect(shorter.ok && shorter.improved).toBe(true); // [2..4] sum 7, len 3
    expect(shorter.ok && shorter.state.best).toEqual({ l: 2, r: 4, len: 3 });
    // A longer valid window wins on max-distinct.
    const longer = applyMove({ level: fruits, l: 0, r: 3, best: { l: 0, r: 3, len: 4 } }, 'grow');
    expect(longer.ok && longer.improved).toBe(true); // [0..4] still 2 kinds, len 5
    expect(longer.ok && longer.state.best).toEqual({ l: 0, r: 4, len: 5 });
  });

  it('seeds the initial window and best at creation', () => {
    const a = createState(minSum);
    expect([a.l, a.r]).toEqual([0, 0]);
    expect(a.best).toBeNull(); // 2 < 7 — nothing to record yet
    const b = createState(fruits);
    expect(b.best).toEqual({ l: 0, r: 0, len: 1 }); // one 🍎 is already legal
  });

  it('finds the brute-force optimum on every level by following the rule', () => {
    for (const level of LEVELS) {
      const { state } = runCanonical(level);
      expect(isDone(state), level.id).toBe(true);
      expect(state.best, level.id).not.toBeNull();
      expect(state.best!.len, level.id).toBe(bruteForceBest(level));
    }
  });

  it('keeps par exactly equal to the canonical move count on every level', () => {
    for (const level of LEVELS) {
      expect(canonicalActions(level), level.id).toBe(level.par);
    }
  });

  it('never moves a pointer backward across a canonical run', () => {
    for (const level of LEVELS) {
      let state = createState(level);
      for (;;) {
        const forced = forcedMove(state);
        if (forced === 'done') break;
        const result = applyMove(state, forced);
        expect(result.ok).toBe(true);
        if (!result.ok) break;
        expect(result.state.l).toBeGreaterThanOrEqual(state.l);
        expect(result.state.r).toBeGreaterThanOrEqual(state.r);
        expect(result.state.l).toBeLessThanOrEqual(result.state.r + 1);
        state = result.state;
      }
      expect(state.r).toBe(level.values.length - 1);
    }
  });

  it('maps every fruit level value to an emoji', () => {
    for (const level of LEVELS.filter((l) => l.mode === 'max-distinct')) {
      expect(level.fruits, level.id).toBeDefined();
      for (const v of level.values) {
        expect(level.fruits![v], `${level.id} value ${v}`).toBeTypeOf('string');
      }
    }
  });

  it('exposes exactly five levels with working lookups', () => {
    expect(LEVEL_IDS).toEqual(['sw-01', 'sw-02', 'sw-03', 'sw-04', 'sw-05']);
    expect(getLevel('nope')).toBeUndefined();
    expect(nextLevelId('sw-01')).toBe('sw-02');
    expect(nextLevelId('sw-05')).toBeNull();
  });
});

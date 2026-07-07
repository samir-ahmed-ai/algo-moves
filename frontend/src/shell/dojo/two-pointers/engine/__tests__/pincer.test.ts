import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  claimValidity,
  createState,
  crossed,
  getLevel,
  moveValidity,
  nextLevelId,
  noPairValidity,
  pairExists,
  simulateCanonical,
  sumAt,
  type PincerLevel,
} from '../pincer';

const level = (values: number[], target: number, par = 99): PincerLevel => ({
  id: 'test',
  title: 'test',
  objective: '',
  lesson: '',
  values,
  target,
  par,
});

describe('moveValidity', () => {
  const lv = level([1, 4, 6, 9, 12, 20], 15);

  it('allows only L→right when the sum is too small', () => {
    const state = { l: 0, r: 4 }; // 1 + 12 = 13 < 15
    expect(sumAt(lv, state)).toBe(13);
    expect(moveValidity(lv, state, 'l')).toEqual({ ok: true, state: { l: 1, r: 4 } });
    expect(moveValidity(lv, state, 'h')).toEqual({ ok: false, reason: 'wrongWay' });
  });

  it('allows only R→left when the sum is too big', () => {
    const state = createState(lv); // 1 + 20 = 21 > 15
    expect(sumAt(lv, state)).toBe(21);
    expect(moveValidity(lv, state, 'h')).toEqual({ ok: true, state: { l: 0, r: 4 } });
    expect(moveValidity(lv, state, 'l')).toEqual({ ok: false, reason: 'wrongWay' });
  });

  it('rejects both moves when the sum hits the target', () => {
    const state = { l: 2, r: 3 }; // 6 + 9 = 15
    expect(moveValidity(lv, state, 'l')).toEqual({ ok: false, reason: 'needClaim' });
    expect(moveValidity(lv, state, 'h')).toEqual({ ok: false, reason: 'needClaim' });
  });

  it('rejects both moves once the pointers have met', () => {
    const state = { l: 3, r: 3 };
    expect(moveValidity(lv, state, 'l')).toEqual({ ok: false, reason: 'crossed' });
    expect(moveValidity(lv, state, 'h')).toEqual({ ok: false, reason: 'crossed' });
  });

  it('permits the move that makes the pointers meet', () => {
    const lvNoPair = level([2, 9], 12); // 2 + 9 = 11 < 12
    const moved = moveValidity(lvNoPair, createState(lvNoPair), 'l');
    expect(moved).toEqual({ ok: true, state: { l: 1, r: 1 } });
    if (moved.ok) expect(crossed(moved.state)).toBe(true);
  });
});

describe('claimValidity', () => {
  const lv = level([1, 4, 6, 9, 12, 20], 15);

  it('accepts a claim only on an exact sum', () => {
    expect(claimValidity(lv, { l: 2, r: 3 })).toEqual({ ok: true }); // 6 + 9
    expect(claimValidity(lv, { l: 0, r: 4 })).toEqual({ ok: false, reason: 'tooSmall' });
    expect(claimValidity(lv, { l: 0, r: 5 })).toEqual({ ok: false, reason: 'tooBig' });
  });

  it('rejects a claim after the pointers meet', () => {
    expect(claimValidity(lv, { l: 3, r: 3 })).toEqual({ ok: false, reason: 'crossed' });
  });
});

describe('noPairValidity', () => {
  const lv = level([1, 4, 6, 9, 12, 20], 15);

  it('accepts x only once the pointers have met or crossed', () => {
    expect(noPairValidity(lv, { l: 3, r: 3 })).toEqual({ ok: true });
    expect(noPairValidity(lv, { l: 4, r: 3 })).toEqual({ ok: true });
    expect(noPairValidity(lv, { l: 0, r: 4 })).toEqual({ ok: false, reason: 'notCrossed' });
  });

  it('calls out an x pressed while the pair sits under the pointers', () => {
    expect(noPairValidity(lv, { l: 2, r: 3 })).toEqual({ ok: false, reason: 'pairHere' });
  });
});

describe('levels', () => {
  it('exposes exactly the five registry level ids in order', () => {
    expect(LEVEL_IDS).toEqual(['tp-01', 'tp-02', 'tp-03', 'tp-04', 'tp-05']);
    expect(getLevel('tp-03')?.values).toHaveLength(8);
    expect(nextLevelId('tp-04')).toBe('tp-05');
    expect(nextLevelId('tp-05')).toBeNull();
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))('%s values are sorted ascending', (_id, lv) => {
    for (let i = 1; i < lv.values.length; i++) {
      expect(lv.values[i]!).toBeGreaterThanOrEqual(lv.values[i - 1]!);
    }
  });

  it('sizes the boards per the design (6, 8, 8, 9, 12)', () => {
    expect(LEVELS.map((lv) => lv.values.length)).toEqual([6, 8, 8, 9, 12]);
  });

  it('tp-03 has no pair; every other level has one', () => {
    for (const lv of LEVELS) expect(pairExists(lv)).toBe(lv.id !== 'tp-03');
  });

  it('tp-04 contains duplicates with the pair adjacent near the middle', () => {
    const lv = getLevel('tp-04')!;
    expect(new Set(lv.values).size).toBeLessThan(lv.values.length);
    const run = simulateCanonical(lv);
    expect(run.outcome).toBe('pair');
    expect(run.state.r - run.state.l).toBe(1);
    const mid = (lv.values.length - 1) / 2;
    expect(Math.abs((run.state.l + run.state.r) / 2 - mid)).toBeLessThanOrEqual(1);
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: the canonical run terminates correctly within par',
    (_id, lv) => {
      const run = simulateCanonical(lv);
      expect(run.actions).toBeLessThanOrEqual(lv.par);
      if (pairExists(lv)) {
        expect(run.outcome).toBe('pair');
        expect(claimValidity(lv, run.state)).toEqual({ ok: true });
        expect(lv.values[run.state.l]! + lv.values[run.state.r]!).toBe(lv.target);
      } else {
        expect(run.outcome).toBe('noPair');
        expect(crossed(run.state)).toBe(true);
        expect(noPairValidity(lv, run.state)).toEqual({ ok: true });
      }
    },
  );
});

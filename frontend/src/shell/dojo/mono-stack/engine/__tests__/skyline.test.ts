import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  bruteForceNextGreater,
  canPush,
  computePar,
  createState,
  getLevel,
  inputDone,
  isComplete,
  mustPop,
  needsSweep,
  nextLevelId,
  popResolve,
  pushNext,
  simulate,
  stackTop,
  sweepOne,
  type SkylineLevel,
} from '../skyline';

const level = (heights: number[], par = 99): SkylineLevel => ({
  id: 'test',
  title: 'test',
  objective: '',
  lesson: '',
  heights,
  par,
});

describe('validity rules', () => {
  it('refuses to pop an empty stack', () => {
    const state = createState(level([3, 5]));
    expect(mustPop(state)).toBe(false);
    expect(canPush(state)).toBe(true);
    expect(popResolve(state)).toEqual({ ok: false, reason: 'empty' });
  });

  it('refuses to pop when the top is tall enough (>= incoming)', () => {
    const lv = level([5, 5, 3]);
    let state = createState(lv);
    const p1 = pushNext(state);
    if (!p1.ok) throw new Error('push refused');
    state = p1.state;
    // Tie: 5 on top, incoming 5 — strictly greater is required.
    expect(mustPop(state)).toBe(false);
    expect(popResolve(state)).toEqual({ ok: false, reason: 'topTallEnough', top: 0 });
    const p2 = pushNext(state);
    if (!p2.ok) throw new Error('push refused');
    state = p2.state;
    // Taller top: 5 on top, incoming 3.
    expect(popResolve(state)).toEqual({ ok: false, reason: 'topTallEnough', top: 1 });
  });

  it('refuses to push while the top is strictly shorter than the incoming bar', () => {
    const lv = level([2, 6]);
    const p1 = pushNext(createState(lv));
    if (!p1.ok) throw new Error('push refused');
    const state = p1.state;
    expect(mustPop(state)).toBe(true);
    expect(canPush(state)).toBe(false);
    expect(pushNext(state)).toEqual({ ok: false, reason: 'mustPop', top: 0 });
  });

  it('records the popped bar’s resolution against the incoming bar', () => {
    const lv = level([2, 6]);
    const p1 = pushNext(createState(lv));
    if (!p1.ok) throw new Error('push refused');
    const popped = popResolve(p1.state);
    if (!popped.ok) throw new Error('pop refused');
    expect(popped.resolved).toBe(0);
    expect(popped.by).toBe(1);
    expect(popped.state.answers[0]).toBe(1);
    expect(popped.state.pops).toBe(1);
    expect(popped.state.stack).toEqual([]);
  });

  it('refuses pop and push once every bar has been pushed', () => {
    const lv = level([4]);
    const p1 = pushNext(createState(lv));
    if (!p1.ok) throw new Error('push refused');
    const state = p1.state;
    expect(inputDone(state)).toBe(true);
    expect(pushNext(state)).toEqual({ ok: false, reason: 'inputDone' });
    expect(popResolve(state)).toEqual({ ok: false, reason: 'inputDone' });
  });

  it('keeps the stack non-increasing bottom→top through any legal sequence', () => {
    for (const lv of LEVELS) {
      let state = createState(lv);
      while (!inputDone(state)) {
        while (mustPop(state)) {
          const popped = popResolve(state);
          if (!popped.ok) throw new Error('pop refused');
          state = popped.state;
        }
        const pushed = pushNext(state);
        if (!pushed.ok) throw new Error('push refused');
        state = pushed.state;
        for (let i = 1; i < state.stack.length; i += 1) {
          expect(lv.heights[state.stack[i]!]!).toBeLessThanOrEqual(
            lv.heights[state.stack[i - 1]!]!,
          );
        }
      }
    }
  });
});

describe('end sweep', () => {
  it('sweeps top-down, resolving each waiting bar to none', () => {
    const lv = level([9, 7, 4]);
    let state = createState(lv);
    for (let i = 0; i < 3; i += 1) {
      const pushed = pushNext(state);
      if (!pushed.ok) throw new Error('push refused');
      state = pushed.state;
    }
    expect(needsSweep(state)).toBe(true);
    expect(sweepOne(createState(lv))).toBeNull();
    const order: number[] = [];
    let swept = sweepOne(state);
    while (swept) {
      order.push(swept.resolved);
      state = swept.state;
      swept = sweepOne(state);
    }
    expect(order).toEqual([2, 1, 0]);
    expect(state.answers).toEqual(['none', 'none', 'none']);
    expect(isComplete(state)).toBe(true);
  });

  it('ms-02 never pops: the whole skyline waits for the sweep', () => {
    const lv = getLevel('ms-02')!;
    let state = createState(lv);
    while (!inputDone(state)) {
      expect(mustPop(state)).toBe(false);
      const pushed = pushNext(state);
      if (!pushed.ok) throw new Error('push refused');
      state = pushed.state;
    }
    expect(state.pops).toBe(0);
    expect(state.stack).toEqual([0, 1, 2, 3, 4]);
    expect(state.answers.every((a) => a === null)).toBe(true);
    expect(needsSweep(state)).toBe(true);
    const final = simulate(lv);
    expect(final.answers.every((a) => a === 'none')).toBe(true);
  });
});

describe('levels', () => {
  it('exposes exactly the five registry level ids in order', () => {
    expect(LEVEL_IDS).toEqual(['ms-01', 'ms-02', 'ms-03', 'ms-04', 'ms-05']);
    expect(nextLevelId('ms-04')).toBe('ms-05');
    expect(nextLevelId('ms-05')).toBeNull();
    expect(getLevel('nope')).toBeUndefined();
  });

  it('sizes the skylines per the design (5, 5, 5, 8, 10)', () => {
    expect(LEVELS.map((lv) => lv.heights.length)).toEqual([5, 5, 5, 8, 10]);
  });

  it('ms-01 is strictly increasing and ms-02 strictly decreasing', () => {
    const rising = getLevel('ms-01')!.heights;
    const falling = getLevel('ms-02')!.heights;
    for (let i = 1; i < rising.length; i += 1) {
      expect(rising[i]!).toBeGreaterThan(rising[i - 1]!);
    }
    for (let i = 1; i < falling.length; i += 1) {
      expect(falling[i]!).toBeLessThan(falling[i - 1]!);
    }
  });

  it('ms-03 is the classic block and ms-04 carries the days theme', () => {
    expect(getLevel('ms-03')!.heights).toEqual([2, 1, 2, 4, 3]);
    expect(getLevel('ms-04')!.theme).toBe('days');
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: simulated resolutions match the brute-force next-greater answers',
    (_id, lv) => {
      const final = simulate(lv);
      expect(final.answers).toEqual(bruteForceNextGreater(lv.heights));
      expect(isComplete(final)).toBe(true);
    },
  );

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: par equals the exact pushes + pops of the one-pass run',
    (_id, lv) => {
      const final = simulate(lv);
      expect(final.pushes + final.pops).toBe(lv.par);
      expect(computePar(lv.heights)).toBe(lv.par);
    },
  );

  it('every level starts with a pushable bar and an empty stack', () => {
    for (const lv of LEVELS) {
      const state = createState(lv);
      expect(stackTop(state)).toBeUndefined();
      expect(canPush(state)).toBe(true);
    }
  });
});

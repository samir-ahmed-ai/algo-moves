import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  createState,
  declareAbsent,
  discard,
  discardLeft,
  discardRight,
  getLevel,
  mid,
  nextLevelId,
  probe,
  rangeEmpty,
  simulateOptimal,
  targetIndex,
  type BisectLevel,
  type BisectState,
} from '../search';

const level = (
  values: number[],
  target: number,
  mode: BisectLevel['mode'] = 'find',
  par = 99,
): BisectLevel => ({
  id: 'test',
  title: 'test',
  objective: '',
  lesson: '',
  values,
  target,
  mode,
  par,
});

const at = (lo: number, hi: number, extra: Partial<BisectState> = {}): BisectState => ({
  lo,
  hi,
  probedMid: null,
  revealed: [],
  candidate: null,
  ...extra,
});

describe('mid', () => {
  it('floors the midpoint', () => {
    expect(mid(0, 6)).toBe(3);
    expect(mid(0, 14)).toBe(7);
    expect(mid(8, 14)).toBe(11);
    expect(mid(3, 4)).toBe(3);
    expect(mid(5, 5)).toBe(5);
  });
});

describe('probe', () => {
  const lv = level([3, 8, 14, 23, 31, 42, 57], 14);

  it('flips the middle of the active range and remembers it', () => {
    const result = probe(lv, createState(lv));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.index).toBe(3);
    expect(result.value).toBe(23);
    expect(result.outcome).toBe('revealed');
    expect(result.state.probedMid).toBe(3);
    expect(result.state.revealed).toContain(3);
  });

  it('auto-finds on an equal flip in find mode', () => {
    const result = probe(lv, at(2, 2));
    expect(result).toMatchObject({ ok: true, outcome: 'found', index: 2, value: 14 });
  });

  it('marks a candidate instead of finishing in lower-bound mode', () => {
    const lb = level([4, 12, 12, 12, 27], 12, 'lowerBound');
    const result = probe(lb, createState(lb));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('candidate');
    expect(result.state.candidate).toBe(2);
  });

  it('keeps the leftmost candidate across probes', () => {
    const lb = level([4, 12, 12, 12, 27], 12, 'lowerBound');
    const result = probe(lb, at(0, 1, { candidate: 2 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // arr[0] = 4 !== 12 → plain reveal keeps the earlier candidate
    expect(result.state.candidate).toBe(2);
  });

  it('rejects probing an empty range or an already-probed range', () => {
    expect(probe(lv, at(4, 3))).toEqual({ ok: false, reason: 'empty' });
    expect(probe(lv, at(0, 6, { probedMid: 3, revealed: [3] }))).toEqual({
      ok: false,
      reason: 'alreadyProbed',
    });
  });
});

describe('discard', () => {
  const lv = level([3, 8, 14, 23, 31, 42, 57], 14);

  it('requires a probe first', () => {
    expect(discard(lv, createState(lv), 'l')).toEqual({ ok: false, reason: 'notProbed' });
    expect(discard(lv, createState(lv), 'h')).toEqual({ ok: false, reason: 'notProbed' });
  });

  it('detects a wrong-direction discard both ways', () => {
    // arr[3] = 23 > 14 — the target can't be on the right, so l is wrong.
    expect(discardLeft(lv, at(0, 6, { probedMid: 3, revealed: [3] }))).toEqual({
      ok: false,
      reason: 'wrongDirection',
    });
    // arr[1] = 8 < 14 — the target can't be on the left, so h is wrong.
    expect(discardRight(lv, at(0, 2, { probedMid: 1, revealed: [1] }))).toEqual({
      ok: false,
      reason: 'wrongDirection',
    });
  });

  it('narrows the range in the dictated direction and clears the probe', () => {
    const right = discardRight(lv, at(0, 6, { probedMid: 3, revealed: [3] }));
    expect(right.ok).toBe(true);
    if (right.ok) {
      expect(right.state).toMatchObject({ lo: 0, hi: 2, probedMid: null });
      expect(right.outcome).toBe('narrowed');
    }
    const left = discardLeft(lv, at(0, 2, { probedMid: 1, revealed: [1] }));
    expect(left.ok).toBe(true);
    if (left.ok) expect(left.state).toMatchObject({ lo: 2, hi: 2, probedMid: null });
  });

  it('rejects discarding an empty range', () => {
    expect(discard(lv, at(4, 3), 'l')).toEqual({ ok: false, reason: 'empty' });
  });

  it('forbids l after an equal probe in lower-bound mode', () => {
    const lb = level([4, 12, 12, 12, 27], 12, 'lowerBound');
    const state = at(0, 4, { probedMid: 2, revealed: [2], candidate: 2 });
    expect(discardLeft(lb, state)).toEqual({ ok: false, reason: 'keepLeft' });
  });

  it('auto-completes lower-bound when the range empties with a candidate', () => {
    const lb = level([12, 12, 27], 12, 'lowerBound');
    const state = at(0, 0, { probedMid: 0, revealed: [0, 1], candidate: 0 });
    const result = discardRight(lb, state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('lowerBoundComplete');
    expect(rangeEmpty(result.state)).toBe(true);
    expect(result.state.candidate).toBe(0);
  });
});

describe('declareAbsent', () => {
  const lv = level([3, 8, 14, 23, 31, 42, 57], 99);

  it('accepts x only once the range is empty', () => {
    expect(declareAbsent(lv, at(4, 3))).toEqual({ ok: true });
    expect(declareAbsent(lv, at(0, 6))).toEqual({ ok: false, reason: 'notEmpty' });
    expect(declareAbsent(lv, at(2, 2))).toEqual({ ok: false, reason: 'notEmpty' });
  });

  it('never accepts x in lower-bound mode', () => {
    const lb = level([4, 12, 12, 27], 12, 'lowerBound');
    expect(declareAbsent(lb, at(0, 3, { candidate: 1 }))).toEqual({
      ok: false,
      reason: 'lowerBound',
    });
    expect(declareAbsent(lb, at(0, 3))).toEqual({ ok: false, reason: 'notEmpty' });
    expect(declareAbsent(lb, at(4, 3))).toEqual({ ok: false, reason: 'lowerBound' });
  });
});

describe('levels', () => {
  it('exposes exactly the five registry level ids in order', () => {
    expect(LEVEL_IDS).toEqual(['bs-01', 'bs-02', 'bs-03', 'bs-04', 'bs-05']);
    expect(nextLevelId('bs-04')).toBe('bs-05');
    expect(nextLevelId('bs-05')).toBeNull();
    expect(getLevel('bs-99')).toBeUndefined();
  });

  it('sizes the decks per the design (7, 15, 15, 13, 31)', () => {
    expect(LEVELS.map((lv) => lv.values.length)).toEqual([7, 15, 15, 13, 31]);
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))('%s values are sorted ascending', (_id, lv) => {
    for (let i = 1; i < lv.values.length; i++) {
      expect(lv.values[i]!).toBeGreaterThanOrEqual(lv.values[i - 1]!);
    }
  });

  it('bs-03 has an absent target; every other level contains it', () => {
    for (const lv of LEVELS) {
      expect(targetIndex(lv) === -1).toBe(lv.id === 'bs-03');
    }
  });

  it('bs-04 is the only lower-bound level and carries duplicate targets', () => {
    for (const lv of LEVELS) expect(lv.mode === 'lowerBound').toBe(lv.id === 'bs-04');
    const lv = getLevel('bs-04')!;
    expect(lv.values.filter((v) => v === lv.target).length).toBeGreaterThan(1);
  });

  it('bs-04 optimal play lands on the FIRST occurrence', () => {
    const lv = getLevel('bs-04')!;
    const run = simulateOptimal(lv);
    expect(run.outcome).toBe('lowerBound');
    expect(run.index).toBe(targetIndex(lv));
    expect(lv.values[run.index! - 1]).not.toBe(lv.target);
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: the optimal run terminates correctly within par',
    (_id, lv) => {
      const run = simulateOptimal(lv);
      expect(run.actions).toBeLessThanOrEqual(lv.par);
      if (lv.mode === 'lowerBound') {
        expect(run.outcome).toBe('lowerBound');
        expect(run.index).toBe(targetIndex(lv));
      } else if (targetIndex(lv) === -1) {
        expect(run.outcome).toBe('absent');
        expect(run.index).toBeNull();
      } else {
        expect(run.outcome).toBe('found');
        expect(lv.values[run.index!]).toBe(lv.target);
      }
    },
  );

  it('bosses are honest: bs-01 and bs-05 need every allowed action at par', () => {
    expect(simulateOptimal(getLevel('bs-01')!).actions).toBe(5);
    expect(simulateOptimal(getLevel('bs-05')!).actions).toBe(9);
  });
});

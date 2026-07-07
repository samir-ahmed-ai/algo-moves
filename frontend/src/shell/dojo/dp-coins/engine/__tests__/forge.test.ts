import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_IDS,
  bestCandidates,
  candidatesAt,
  createDp,
  currentCell,
  fillValidity,
  getLevel,
  greedyCount,
  nextLevelId,
  simulateCanonical,
  solveReference,
  stampInfinityValidity,
  traceback,
  type DpCell,
} from '../forge';

describe('table basics', () => {
  it('creates a table with only dp[0] = 0 pre-filled', () => {
    const dp = createDp(getLevel('dc-01')!);
    expect(dp).toHaveLength(7);
    expect(dp[0]).toBe(0);
    expect(dp.slice(1).every((c) => c === null)).toBe(true);
    expect(currentCell(dp)).toBe(1);
  });

  it('currentCell walks left to right and reports -1 when full', () => {
    const dp: DpCell[] = [0, 1, 1];
    expect(currentCell(dp)).toBe(-1);
    expect(currentCell([0, 1, null])).toBe(2);
  });
});

describe('candidates', () => {
  // Coins {1,3,4}, table filled through dp[5] (reference values for n=6).
  const dp: DpCell[] = [0, 1, 2, 1, 1, 2, null];

  it('lists every fitting coin with its reference', () => {
    expect(candidatesAt(dp, 6, [1, 3, 4])).toEqual([
      { coin: 1, ref: 5, candidate: 3 },
      { coin: 3, ref: 3, candidate: 2 },
      { coin: 4, ref: 2, candidate: 3 },
    ]);
  });

  it('bestCandidates keeps only the minimum finite candidates', () => {
    expect(bestCandidates(dp, 6, [1, 3, 4])).toEqual([{ coin: 3, ref: 3, candidate: 2 }]);
  });

  it('bestCandidates is empty when every reference is unreachable', () => {
    const gaps: DpCell[] = [0, Infinity, 1, null]; // coins {2,5} at cell 3
    expect(bestCandidates(gaps, 3, [2, 5])).toEqual([]);
  });

  it('excludes coins larger than the cell', () => {
    expect(candidatesAt([0, null], 1, [2, 5])).toEqual([]);
  });
});

describe('fillValidity', () => {
  const dp: DpCell[] = [0, 1, 2, 1, 1, 2, null]; // coins {1,3,4}, at cell 6

  it('accepts the minimum candidate and returns its value and reference', () => {
    expect(fillValidity(dp, 6, 3, [1, 3, 4])).toEqual({ ok: true, value: 2, ref: 3 });
  });

  it('rejects a suboptimal coin quoting both candidates', () => {
    const result = fillValidity(dp, 6, 4, [1, 3, 4]);
    expect(result).toEqual({
      ok: false,
      reason: 'suboptimal',
      chosen: { coin: 4, ref: 2, candidate: 3 },
      best: { coin: 3, ref: 3, candidate: 2 },
    });
  });

  it('rejects a coin larger than the cell', () => {
    expect(fillValidity([0, null], 1, 5, [2, 5])).toEqual({ ok: false, reason: 'doesntFit' });
  });

  it('rejects a coin whose reference is ∞ when a finite path exists', () => {
    const gaps: DpCell[] = [0, Infinity, 1, Infinity, 2, 1, 3, 2, null]; // {2,5} at cell 8
    const result = fillValidity(gaps, 8, 5, [2, 5]);
    expect(result).toEqual({
      ok: false,
      reason: 'unreachableRef',
      best: { coin: 2, ref: 6, candidate: 4 },
    });
  });

  it('demands the stamp when no coin reaches the cell', () => {
    const gaps: DpCell[] = [0, Infinity, 1, null]; // {2,5} at cell 3
    expect(fillValidity(gaps, 3, 2, [2, 5])).toEqual({ ok: false, reason: 'mustStamp' });
  });

  it('accepts any coin on a tie', () => {
    // Coins {2,3} at cell 5: via 2 → 1+dp[3]=2, via 3 → 1+dp[2]=2.
    const dp2: DpCell[] = [0, Infinity, 1, 1, 2, null];
    expect(fillValidity(dp2, 5, 2, [2, 3])).toEqual({ ok: true, value: 2, ref: 3 });
    expect(fillValidity(dp2, 5, 3, [2, 3])).toEqual({ ok: true, value: 2, ref: 2 });
  });
});

describe('stampInfinityValidity', () => {
  it('accepts the stamp only when every candidate is unreachable', () => {
    const gaps: DpCell[] = [0, Infinity, 1, null]; // {2,5} at cell 3
    expect(stampInfinityValidity(gaps, 3, [2, 5])).toEqual({ ok: true });
  });

  it('rejects the stamp on a reachable cell, quoting the proof', () => {
    const dp: DpCell[] = [0, 1, 2, 1, 1, 2, null];
    expect(stampInfinityValidity(dp, 6, [1, 3, 4])).toEqual({
      ok: false,
      best: { coin: 3, ref: 3, candidate: 2 },
    });
  });
});

describe('reference solver and levels', () => {
  it('exposes exactly the five registry level ids in order', () => {
    expect(LEVEL_IDS).toEqual(['dc-01', 'dc-02', 'dc-03', 'dc-04', 'dc-05']);
    expect(nextLevelId('dc-04')).toBe('dc-05');
    expect(nextLevelId('dc-05')).toBeNull();
    expect(getLevel('nope')).toBeUndefined();
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: the canonical run reproduces the reference table exactly',
    (_id, lv) => {
      const run = simulateCanonical(lv);
      expect(run.dp).toEqual(solveReference(lv.coins, lv.n));
      expect(currentCell(run.dp)).toBe(-1);
    },
  );

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: par equals n and the canonical run achieves it (one action per cell)',
    (_id, lv) => {
      expect(lv.par).toBe(lv.n);
      expect(simulateCanonical(lv).actions).toBe(lv.par);
    },
  );

  it('dc-01: greedy REALLY loses — 4+1+1 = 3 coins vs DP’s 3+3 = 2', () => {
    const lv = getLevel('dc-01')!;
    const greedy = greedyCount(lv.coins, lv.n);
    const optimal = solveReference(lv.coins, lv.n)[lv.n]!;
    expect(greedy).toBe(3);
    expect(optimal).toBe(2);
    expect(greedy).toBeGreaterThan(optimal);
    expect(traceback(simulateCanonical(lv).dp, lv.coins, lv.n)?.coins.sort()).toEqual([3, 3]);
  });

  it('dc-03: cells 1 and 3 are exactly the unreachable ones', () => {
    const lv = getLevel('dc-03')!;
    const dp = solveReference(lv.coins, lv.n);
    const unreachable = dp.flatMap((v, i) => (Number.isFinite(v) ? [] : [i]));
    expect(unreachable).toEqual([1, 3]);
  });

  it.each(LEVELS.map((lv) => [lv.id, lv] as const))(
    '%s: dp[n] is finite and the traceback coins sum to n with dp[n] coins',
    (_id, lv) => {
      const { dp } = simulateCanonical(lv);
      const value = dp[lv.n];
      expect(Number.isFinite(value)).toBe(true);
      const trace = traceback(dp, lv.coins, lv.n);
      expect(trace).not.toBeNull();
      expect(trace!.coins.reduce((a, b) => a + b, 0)).toBe(lv.n);
      expect(trace!.coins).toHaveLength(value as number);
      expect(trace!.cells[0]).toBe(lv.n);
      expect(trace!.cells[trace!.cells.length - 1]).toBe(0);
      expect(trace!.coins.every((c) => lv.coins.includes(c))).toBe(true);
    },
  );

  it('coins are ascending single-digit denominations (they double as keycaps)', () => {
    for (const lv of LEVELS) {
      for (let i = 0; i < lv.coins.length; i++) {
        const c = lv.coins[i]!;
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(9);
        if (i > 0) expect(c).toBeGreaterThan(lv.coins[i - 1]!);
      }
    }
  });

  it('greedy fails somewhere along dc-04 too (the {1,3,4} trap persists)', () => {
    const lv = getLevel('dc-04')!;
    const dp = solveReference(lv.coins, lv.n);
    const anyGap = Array.from({ length: lv.n }, (_, k) => k + 1).some(
      (amount) => greedyCount(lv.coins, amount) > dp[amount]!,
    );
    expect(anyGap).toBe(true);
  });

  it('traceback returns null for an unreachable target', () => {
    expect(traceback([0, Infinity], [2], 1)).toBeNull();
  });
});

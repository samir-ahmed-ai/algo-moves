import { describe, expect, it } from 'vitest';
import {
  createVelocityTracker,
  diffTokens,
  hashString,
  mulberry32,
  mutateCode,
  seededShuffle,
} from './gameShared';

describe('mulberry32', () => {
  it('is deterministic per seed and in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(43)()).not.toBe(mulberry32(42)());
  });
});

describe('seededShuffle', () => {
  it('permutes without losing elements, stable per seed', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = seededShuffle(src, mulberry32(7));
    const s2 = seededShuffle(src, mulberry32(7));
    expect(s1).toEqual(s2);
    expect([...s1].sort((a, b) => a - b)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('mutateCode', () => {
  const loop = 'for i := 0; i < len(nums); i++ {\n\tsum += nums[i]\n}';

  it('produces a single plausible mutant that differs from the source', () => {
    const out = mutateCode(loop, 1, new Set());
    expect(out).not.toBeNull();
    expect(out).not.toBe(loop);
  });

  it('is deterministic per seed', () => {
    expect(mutateCode(loop, 5, new Set())).toBe(mutateCode(loop, 5, new Set()));
  });

  it('respects the exclude set so a lie never equals a truth', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 12; seed++) {
      const out = mutateCode(loop, seed, seen);
      if (out !== null) {
        expect(seen.has(out)).toBe(false);
        seen.add(out);
      }
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it('never edits inside string literals', () => {
    const code = 'return "i < 10"';
    for (let seed = 0; seed < 20; seed++) {
      const out = mutateCode(code, seed, new Set());
      if (out) expect(out).toContain('"i < 10"');
    }
  });

  it('returns null when nothing safe applies', () => {
    expect(mutateCode('}', 1, new Set())).toBeNull();
  });

  it('can harvest identifiers from sibling pieces', () => {
    const out = mutateCode('return left', 3, new Set(), ['right := mid + 1']);
    expect(out).not.toBeNull();
  });
});

describe('diffTokens', () => {
  it('marks only the changed tokens on both sides', () => {
    const { a, b } = diffTokens('if left < right {', 'if left <= right {');
    expect(a.filter((t) => t.changed).map((t) => t.text)).toEqual(['<']);
    expect(b.filter((t) => t.changed).map((t) => t.text)).toEqual(['<=']);
  });

  it('reassembles the originals losslessly', () => {
    const x = 'for i := 0; i < n; i++ {\n\tsum += a[i]\n}';
    const y = 'for i := 1; i < n; i++ {\n\tsum += a[i]\n}';
    const { a, b } = diffTokens(x, y);
    expect(a.map((t) => t.text).join('')).toBe(x);
    expect(b.map((t) => t.text).join('')).toBe(y);
  });

  it('marks nothing when strings match', () => {
    const { a, b } = diffTokens('return sum', 'return sum');
    expect(a.some((t) => t.changed)).toBe(false);
    expect(b.some((t) => t.changed)).toBe(false);
  });
});

describe('createVelocityTracker', () => {
  it('reports px/ms over the trailing window', () => {
    const v = createVelocityTracker(80);
    v.push(0, 0);
    v.push(50, 50);
    v.push(100, 100);
    expect(v.velocity()).toBeCloseTo(1, 1);
  });

  it('returns 0 with fewer than 2 samples and after reset', () => {
    const v = createVelocityTracker();
    expect(v.velocity()).toBe(0);
    v.push(10, 1);
    expect(v.velocity()).toBe(0);
    v.push(20, 2);
    v.reset();
    expect(v.velocity()).toBe(0);
  });
});

describe('hashString', () => {
  it('is stable and spreads distinct inputs', () => {
    expect(hashString('two-sum')).toBe(hashString('two-sum'));
    expect(hashString('two-sum')).not.toBe(hashString('three-sum'));
  });
});

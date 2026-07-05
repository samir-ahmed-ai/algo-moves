import { describe, expect, it } from 'vitest';
import {
  orbitArcFraction,
  orbitPoint,
  orbitT,
  orbitTFromX,
  orbitTickIndices,
  truncateOrbitText,
} from './MoveOrbit';

describe('orbitPoint', () => {
  it('hits the arc endpoints and a raised apex', () => {
    expect(orbitPoint(0)).toEqual({ x: 40, y: 132 });
    expect(orbitPoint(1)).toEqual({ x: 960, y: 132 });
    const apex = orbitPoint(0.5);
    expect(apex.x).toBe(500);
    expect(apex.y).toBeLessThan(80);
  });
});

describe('orbitT', () => {
  it('spreads frames across the tick band', () => {
    expect(orbitT(0, 10)).toBeCloseTo(0.06);
    expect(orbitT(9, 10)).toBeCloseTo(0.94);
    expect(orbitT(0, 1)).toBe(0.5);
  });
});

describe('orbitTickIndices', () => {
  it('keeps every frame under the cap', () => {
    expect(orbitTickIndices(5)).toEqual([0, 1, 2, 3, 4]);
  });

  it('decimates long runs but always keeps the last frame', () => {
    const ticks = orbitTickIndices(500, 72);
    expect(ticks.length).toBeLessThanOrEqual(73);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(499);
  });
});

describe('orbitArcFraction', () => {
  it('is monotonic and hits 0.5 at the symmetric apex', () => {
    expect(orbitArcFraction(0)).toBe(0);
    expect(orbitArcFraction(1)).toBeCloseTo(1);
    expect(orbitArcFraction(0.5)).toBeCloseTo(0.5, 2);
    expect(orbitArcFraction(0.3)).toBeLessThan(orbitArcFraction(0.7));
  });
});

describe('orbitTFromX', () => {
  it('inverts the arc x coordinate', () => {
    for (const t of [0.1, 0.35, 0.5, 0.8]) {
      expect(orbitTFromX(orbitPoint(t).x)).toBeCloseTo(t, 2);
    }
  });
});

describe('truncateOrbitText', () => {
  it('ellipsizes past the cap and keeps short text intact', () => {
    expect(truncateOrbitText('short', 10)).toBe('short');
    expect(truncateOrbitText('a'.repeat(30), 10)).toBe(`${'a'.repeat(9)}…`);
  });
});

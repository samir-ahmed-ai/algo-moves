import { describe, expect, it } from 'vitest';
import {
  fitOrbitFontSize,
  fitOrbitMultilineLayout,
  orbitLineDy,
  orbitPathLength,
  orbitTextBudget,
  orbitTextSpan,
  truncateOrbitText,
  wrapOrbitLines,
  wrapOrbitTwoLines,
} from './orbitArc';
import { orbitArcFraction, orbitPoint, orbitT, orbitTFromX, orbitTickIndices } from './MoveOrbit';

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

describe('orbitTextBudget', () => {
  it('gives center captions the full arc and shoulders a short band', () => {
    const total = orbitPathLength();
    expect(orbitTextBudget('center')).toBeCloseTo(total, 1);
    expect(orbitTextBudget('side')).toBeCloseTo(total * 0.18, 1);
    expect(orbitTextBudget('center')).toBeGreaterThan(orbitTextBudget('side'));
  });
});

describe('orbitTextSpan', () => {
  it('anchors center captions at the arc start', () => {
    const span = orbitTextSpan('center');
    expect(span.startOffset).toBe('0%');
    expect(span.textAnchor).toBe('start');
    expect(span.budget).toBe(orbitPathLength());
  });
});

describe('fitOrbitFontSize', () => {
  it('starts large and steps down until the text fits', () => {
    const lengths = new Map<number, number>([
      [24, 500],
      [23, 480],
      [22, 440],
    ]);
    expect(fitOrbitFontSize((s) => lengths.get(s) ?? 0, 24, 20, 450)).toBe(22);
    expect(fitOrbitFontSize((s) => lengths.get(s) ?? 0, 24, 20, 600)).toBe(24);
  });
});

describe('wrapOrbitLines', () => {
  it('wraps on word boundaries within the arc budget', () => {
    const measure = (line: string) => line.length * 10;
    expect(wrapOrbitLines('one two three four', measure, 100)).toEqual(['one two', 'three four']);
  });
});

describe('wrapOrbitTwoLines', () => {
  it('splits long text into two balanced lines', () => {
    const measure = (line: string) => line.length * 10;
    expect(wrapOrbitTwoLines('one two three four', measure, 100)).toEqual([
      'one two',
      'three four',
    ]);
  });

  it('keeps a short caption on one line', () => {
    const measure = (line: string) => line.length * 10;
    expect(wrapOrbitTwoLines('short', measure, 100)).toEqual(['short']);
  });
});

describe('fitOrbitMultilineLayout', () => {
  it('keeps max font on one line when it fits', () => {
    const measureLine = (line: string) => line.length * 10;
    const layout = fitOrbitMultilineLayout(measureLine, 'short', 28, 14, 100, 2);
    expect(layout.fontSize).toBe(28);
    expect(layout.lines).toEqual([{ text: 'short', stretch: true }]);
  });

  it('wraps before shrinking when one line is too wide at max', () => {
    const measureLine = (line: string) => line.length * 10;
    const layout = fitOrbitMultilineLayout(measureLine, 'aa bb cc dd', 28, 14, 50, 2);
    expect(layout.fontSize).toBe(28);
    expect(layout.lines.map((l) => l.text)).toEqual(['aa bb', 'cc dd']);
  });
});

describe('orbitLineDy', () => {
  it('stacks center lines upward and side lines downward', () => {
    expect(orbitLineDy('center', -17, 0, 2, 20)).toBeLessThan(orbitLineDy('center', -17, 1, 2, 20));
    expect(orbitLineDy('side', 16, 0, 2, 20)).toBeLessThan(orbitLineDy('side', 16, 1, 2, 20));
  });
});

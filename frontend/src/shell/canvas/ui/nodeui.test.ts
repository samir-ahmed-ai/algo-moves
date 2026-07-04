import { describe, expect, it } from 'vitest';
import {
  computeVizFitLayout,
  difficultyTone,
  resolveMeasureSize,
  resolveVizStageMeasureSize,
} from './nodeui';

describe('difficultyTone', () => {
  it('maps known difficulties to semantic tones', () => {
    expect(difficultyTone('easy')).toBe('good');
    expect(difficultyTone('Easy')).toBe('good');
    expect(difficultyTone('medium')).toBe('accent');
    expect(difficultyTone('hard')).toBe('bad');
  });

  it('defaults to accent for medium and unknown values', () => {
    expect(difficultyTone(undefined)).toBe('accent');
    expect(difficultyTone('')).toBe('accent');
    expect(difficultyTone('medium')).toBe('accent');
    expect(difficultyTone('unknown')).toBe('accent');
  });
});

describe('computeVizFitLayout', () => {
  it('upscales small boards to fill the container', () => {
    const fit = computeVizFitLayout(172, 200, 600, 700, 16, 8);
    expect(fit.scale).toBeGreaterThan(1);
    expect(fit.h).toBeLessThanOrEqual(700 - 32);
    expect(fit.w).toBeLessThanOrEqual(600 - 32);
  });

  it('quantizes upscale to eighth steps without exceeding the fit', () => {
    const fit = computeVizFitLayout(400, 400, 500, 500, 16, 8);
    expect(fit.scale).toBe(1.125);
    expect(fit.w).toBeLessThanOrEqual(500 - 32);
    expect(fit.h).toBeLessThanOrEqual(500 - 32);
  });

  it('caps default upscale so tiny boards stay crisp', () => {
    const fit = computeVizFitLayout(100, 100, 900, 900);
    expect(fit.scale).toBe(1.5);
  });

  it('downscales oversized boards', () => {
    const fit = computeVizFitLayout(800, 800, 400, 400, 16, 8);
    expect(fit.scale).toBeLessThan(1);
    expect(fit.w).toBeLessThanOrEqual(400 - 32);
    expect(fit.h).toBeLessThanOrEqual(400 - 32);
  });

  it('keeps identity scale when the conceded measurement pixel overshoots an exact fit', () => {
    // true intrinsic 400 measured as 401 (scrollWidth+1) in a 408px container (availW 400)
    const fit = computeVizFitLayout(401, 300, 408, 400, 4);
    expect(fit.scale).toBe(1);
    expect(fit.w).toBe(400);
  });
});

describe('resolveVizStageMeasureSize', () => {
  it('uses full stage width and main animation height only', () => {
    expect(resolveVizStageMeasureSize(524, 160)).toEqual({ w: 524, h: 160 });
  });
});

describe('resolveMeasureSize', () => {
  function createMainMock(mainH: number): HTMLElement {
    let width = '160px';
    let height = '160px';
    return {
      style: {
        get width() {
          return width;
        },
        set width(value: string) {
          width = value;
        },
        get height() {
          return height;
        },
        set height(value: string) {
          height = value;
        },
        maxWidth: '',
      },
      get scrollWidth() {
        return width === 'max-content' ? 160 : 160;
      },
      get scrollHeight() {
        return height === 'max-content' ? mainH : mainH;
      },
      classList: { contains: () => false },
      querySelectorAll: () => [],
    } as unknown as HTMLElement;
  }

  function createStageMock(opts: {
    clampedScrollW: number;
    intrinsicW: number;
    intrinsicH?: number;
    mainH?: number;
  }): HTMLElement {
    let width = '400px';
    let height = '80px';
    let maxWidth = '400px';
    const main = createMainMock(opts.mainH ?? opts.intrinsicH ?? 80);

    return {
      classList: {
        contains: (name: string) => name === 'board-area' || name === 'viz-stage',
      },
      get scrollWidth() {
        return width === 'max-content' ? opts.intrinsicW : opts.clampedScrollW;
      },
      get scrollHeight() {
        return height === 'max-content' ? (opts.intrinsicH ?? 80) : (opts.intrinsicH ?? 80);
      },
      style: {
        get width() {
          return width;
        },
        set width(value: string) {
          width = value;
        },
        get height() {
          return height;
        },
        set height(value: string) {
          height = value;
        },
        get maxWidth() {
          return maxWidth;
        },
        set maxWidth(value: string) {
          maxWidth = value;
        },
      },
      querySelectorAll: (sel: string) => (sel === '.viz-stage-main' ? [main] : []),
      querySelector: (sel: string) => (sel === '.viz-stage-main' ? main : null),
      matches: () => false,
    } as unknown as HTMLElement;
  }

  it('prefers intrinsic width for viz-stage over clamped scrollWidth', () => {
    const stage = createStageMock({ clampedScrollW: 400, intrinsicW: 524 });
    const { w } = resolveMeasureSize(stage, 400);
    // +1: scrollWidth truncates fractional widths; the measure concedes the pixel
    expect(w).toBe(525);
  });

  it('uses viz-stage-main height instead of inflated stage scrollHeight', () => {
    const stage = createStageMock({
      clampedScrollW: 400,
      intrinsicW: 524,
      intrinsicH: 220,
      mainH: 160,
    });
    const { w, h } = resolveMeasureSize(stage, 400);
    expect(w).toBe(525);
    expect(h).toBe(160);
  });

  it('feeds oversized viz-stage width into downscale fit math', () => {
    const stage = createStageMock({ clampedScrollW: 400, intrinsicW: 524, intrinsicH: 80, mainH: 80 });
    const { w, h } = resolveMeasureSize(stage, 400);
    const fit = computeVizFitLayout(w, h, 400, 400, 4);
    expect(fit.scale).toBeLessThan(1);
    expect(fit.w).toBeLessThanOrEqual(400 - 8);
  });
});

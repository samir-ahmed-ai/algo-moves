import { describe, expect, it } from 'vitest';
import { computeVizFitLayout, difficultyTone } from './nodeui';

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

  it('rounds upscale to quarter steps instead of flooring to 1', () => {
    const fit = computeVizFitLayout(400, 400, 500, 500, 16, 8);
    expect(fit.scale).toBe(1.25);
  });

  it('downscales oversized boards', () => {
    const fit = computeVizFitLayout(800, 800, 400, 400, 16, 8);
    expect(fit.scale).toBeLessThan(1);
    expect(fit.w).toBeLessThanOrEqual(400 - 32);
    expect(fit.h).toBeLessThanOrEqual(400 - 32);
  });
});

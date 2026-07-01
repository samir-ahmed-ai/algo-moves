import { describe, it, expect } from 'vitest';
import { getWavyEdgePath } from './wavyPath';

describe('getWavyEdgePath', () => {
  it('returns a path and midpoint label anchor', () => {
    const [path, labelX, labelY] = getWavyEdgePath(0, 0, 100, 0, { waves: 2, amplitude: 8 });
    expect(path.startsWith('M 0 0')).toBe(true);
    expect(path.includes('L')).toBe(true);
    expect(labelX).toBeGreaterThan(40);
    expect(labelX).toBeLessThan(60);
    expect(Math.abs(labelY)).toBeLessThan(12);
  });
});

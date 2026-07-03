import { describe, expect, it } from 'vitest';
import { decodeProblemDrag, encodeProblemDrag, PROBLEM_DND_KEY } from './problemDnD';

describe('problemDnD', () => {
  it('round-trips problem id in drag payload', () => {
    expect(encodeProblemDrag('binary-search')).toBe('binary-search');
    expect(decodeProblemDrag('  two-sum ')).toBe('two-sum');
    expect(decodeProblemDrag('')).toBeNull();
    expect(PROBLEM_DND_KEY).toBe('application/algomove-problem');
  });
});

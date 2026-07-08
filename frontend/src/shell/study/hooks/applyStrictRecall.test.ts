import { describe, expect, it } from 'vitest';
import { applyStrictRecall } from './useRecallDraftHandler';

const reference = `package main

func solve(n int) int {
\treturn n + 1
}
`;

describe('applyStrictRecall', () => {
  it('passes the raw value through when strict mode is off', () => {
    expect(applyStrictRecall(reference, 'anything at all', false)).toBe('anything at all');
  });

  it('keeps a correct in-progress prefix when strict mode is on', () => {
    const partial = reference.split('\n').slice(0, 3).join('\n') + '\n\tretur';
    expect(applyStrictRecall(reference, partial, true)).toBe(partial);
  });

  it('resets the attempt to empty on a mistake when strict mode is on', () => {
    const wrong = reference.split('\n').slice(0, 3).join('\n') + '\n\treturx';
    expect(applyStrictRecall(reference, wrong, true)).toBe('');
  });
});

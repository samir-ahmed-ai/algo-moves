import { describe, expect, it } from 'vitest';
import { exampleInputIndex, stepExampleInput } from './exampleInputNav';

const inputs = [
  { id: 'a', label: 'Small' },
  { id: 'b', label: 'Medium' },
  { id: 'c', label: 'Large' },
];

describe('exampleInputIndex', () => {
  it('returns the matching index', () => {
    expect(exampleInputIndex(inputs, 'b')).toBe(1);
  });

  it('falls back to 0 for unknown ids', () => {
    expect(exampleInputIndex(inputs, 'missing')).toBe(0);
  });
});

describe('stepExampleInput', () => {
  it('steps forward and backward within bounds', () => {
    expect(stepExampleInput(inputs, 'b', -1)?.id).toBe('a');
    expect(stepExampleInput(inputs, 'b', 1)?.id).toBe('c');
  });

  it('returns undefined at the first and last input', () => {
    expect(stepExampleInput(inputs, 'a', -1)).toBeUndefined();
    expect(stepExampleInput(inputs, 'c', 1)).toBeUndefined();
  });
});

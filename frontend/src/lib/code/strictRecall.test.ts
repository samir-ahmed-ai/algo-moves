import { describe, expect, it } from 'vitest';
import { strictRecallDraft } from './strictRecall';

const reference = `package main

func solve(n int) int {
\treturn n + 1
}
`;

describe('strictRecallDraft', () => {
  it('passes through an empty draft unchanged', () => {
    expect(strictRecallDraft(reference, '')).toBe('');
  });

  it('accepts a matching prefix on the current line', () => {
    const refLines = reference.split('\n');
    const partial = refLines.slice(0, 3).join('\n') + '\n\tretur';
    expect(strictRecallDraft(reference, partial)).toBe(partial);
  });

  it('clears the attempt on wrong char on current line', () => {
    const refLines = reference.split('\n');
    const bad = refLines.slice(0, 3).join('\n') + '\n\treturx';
    expect(strictRecallDraft(reference, bad)).toBe('');
  });

  it('clears the attempt on wrong completed line', () => {
    const draft = `package main

func solve(n int) int {
\treturn n + 2
}
`;
    expect(strictRecallDraft(reference, draft)).toBe('');
  });

  it('clears the attempt when draft has extra lines beyond reference', () => {
    const draft = `${reference}extra line\n`;
    expect(strictRecallDraft(reference, draft)).toBe('');
  });

  it('passes through a full match', () => {
    expect(strictRecallDraft(reference, reference)).toBe(reference);
  });
});

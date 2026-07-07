import { describe, expect, it } from 'vitest';
import { cycleRecallReveal, isRecallRevealMode, recallRevealLabel, toRecallProgressState } from './recallProgress';

describe('toRecallProgressState', () => {
  it('attaches reveal mode to a computed progress snapshot', () => {
    expect(
      toRecallProgressState({ completedLines: [1], currentLine: 2, matchedPrefixLen: 3 }, 'dim'),
    ).toEqual({
      completedLines: [1],
      currentLine: 2,
      matchedPrefixLen: 3,
      reveal: 'dim',
    });
  });
});

describe('recall reveal helpers', () => {
  it('cycles through reveal modes', () => {
    expect(cycleRecallReveal('full')).toBe('dim');
    expect(cycleRecallReveal('hidden')).toBe('full');
  });

  it('validates reveal mode values', () => {
    expect(isRecallRevealMode('blur')).toBe(true);
    expect(isRecallRevealMode('nope')).toBe(false);
  });

  it('labels reveal modes for the UI', () => {
    expect(recallRevealLabel('hidden')).toBe('Hidden');
  });
});

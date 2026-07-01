import { describe, expect, it } from 'vitest';
import { compatibilityLabel, isMatch } from './logic';

describe('mind-meld logic', () => {
  it('detects matching picks', () => {
    expect(isMatch(0, 0)).toBe(true);
    expect(isMatch(1, 1)).toBe(true);
  });

  it('detects mismatched picks', () => {
    expect(isMatch(0, 1)).toBe(false);
    expect(isMatch(1, 0)).toBe(false);
  });

  it('labels high sync as two peas in a pod', () => {
    expect(compatibilityLabel(10, 10)).toBe('Two peas in a pod 🫛');
    expect(compatibilityLabel(8, 10)).toBe('Two peas in a pod 🫛');
  });

  it('labels middling sync as pretty in tune', () => {
    expect(compatibilityLabel(5, 10)).toBe('Pretty in tune 💫');
    expect(compatibilityLabel(7, 10)).toBe('Pretty in tune 💫');
  });

  it('labels low sync as opposites attract', () => {
    expect(compatibilityLabel(4, 10)).toBe('Opposites attract ✨');
    expect(compatibilityLabel(0, 10)).toBe('Opposites attract ✨');
  });

  it('handles a zero-length quiz gracefully', () => {
    expect(compatibilityLabel(0, 0)).toBe('Opposites attract ✨');
  });
});

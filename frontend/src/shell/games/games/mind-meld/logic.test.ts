import { describe, expect, it } from 'vitest';
import { compatibilityKey, isMatch } from './logic';

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
    expect(compatibilityKey(10, 10)).toBe('twoPeas');
    expect(compatibilityKey(8, 10)).toBe('twoPeas');
  });

  it('labels middling sync as pretty in tune', () => {
    expect(compatibilityKey(5, 10)).toBe('prettyInTune');
    expect(compatibilityKey(7, 10)).toBe('prettyInTune');
  });

  it('labels low sync as opposites attract', () => {
    expect(compatibilityKey(4, 10)).toBe('opposites');
    expect(compatibilityKey(0, 10)).toBe('opposites');
  });

  it('handles a zero-length quiz gracefully', () => {
    expect(compatibilityKey(0, 0)).toBe('opposites');
  });
});

import { describe, expect, it } from 'vitest';
import {
  compatibilityKey,
  compatibilityKeyFromRatio,
  groupSyncPercent,
  isMatch,
  pluralityAgreement,
} from './logic';

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

  it('maps ratios to compatibility keys directly', () => {
    expect(compatibilityKeyFromRatio(1)).toBe('twoPeas');
    expect(compatibilityKeyFromRatio(0.8)).toBe('twoPeas');
    expect(compatibilityKeyFromRatio(0.5)).toBe('prettyInTune');
    expect(compatibilityKeyFromRatio(0.49)).toBe('opposites');
    expect(compatibilityKeyFromRatio(0)).toBe('opposites');
  });
});

describe('mind-meld group sync math', () => {
  it('scores a unanimous round as full agreement', () => {
    expect(pluralityAgreement([0, 0, 0])).toBe(1);
    expect(pluralityAgreement([1, 1, 1, 1])).toBe(1);
  });

  it('scores a dead split as half agreement', () => {
    expect(pluralityAgreement([0, 1])).toBe(0.5);
    expect(pluralityAgreement([0, 0, 1, 1])).toBe(0.5);
  });

  it('takes the plurality option when the group leans one way', () => {
    // 3 of 4 picked option a.
    expect(pluralityAgreement([0, 0, 0, 1])).toBe(0.75);
  });

  it('ignores undecided picks when measuring agreement', () => {
    // Two answered, both agree; the null is not counted against them.
    expect(pluralityAgreement([0, 0, null])).toBe(1);
    expect(pluralityAgreement([0, 1, null])).toBe(0.5);
  });

  it('scores an all-empty round as zero', () => {
    expect(pluralityAgreement([])).toBe(0);
    expect(pluralityAgreement([null, null])).toBe(0);
  });

  it('matches 2-player intuition: matched round is 100%, split is 50%', () => {
    expect(pluralityAgreement([0, 0])).toBe(1);
    expect(pluralityAgreement([0, 1])).toBe(0.5);
  });

  it('averages plurality agreement across rounds into a whole percent', () => {
    // Round 1 unanimous (1.0), round 2 split (0.5) → mean 0.75 → 75%.
    expect(groupSyncPercent([[0, 0, 0], [0, 1]])).toBe(75);
  });

  it('rounds the averaged percentage to the nearest integer', () => {
    // (1.0 + 0.5 + 0.75) / 3 = 0.75 → 75%.
    expect(groupSyncPercent([[0, 0], [0, 1], [0, 0, 0, 1]])).toBe(75);
    // (1.0 + 0.6667) / 2 = 0.8333 → 83%.
    expect(groupSyncPercent([[0, 0, 0], [0, 0, 1]])).toBe(83);
  });

  it('skips unanswered rounds so partial games read fairly', () => {
    expect(groupSyncPercent([[0, 0], [], [null, null]])).toBe(100);
  });

  it('returns zero when nothing was answered at all', () => {
    expect(groupSyncPercent([])).toBe(0);
    expect(groupSyncPercent([[], [null]])).toBe(0);
  });
});

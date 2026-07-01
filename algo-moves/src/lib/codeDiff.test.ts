import { describe, expect, it } from 'vitest';
import { diffChangedLines, matchScore } from './codeDiff';

describe('diffChangedLines', () => {
  it('flags only inserted line and after-context, not entire tail incorrectly', () => {
    const ref = 'a\nb\nc\nd';
    const draft = 'a\nx\nc\nd';
    const { draft: draftChanged, reference: refChanged } = diffChangedLines(ref, draft);
    expect(draftChanged.has(2)).toBe(true);
    expect(draftChanged.has(3)).toBe(false);
    expect(draftChanged.has(4)).toBe(false);
    expect(refChanged.has(2)).toBe(true);
    expect(refChanged.has(3)).toBe(false);
  });

  it('ignores trailing blank-line trim differences when content matches', () => {
    const ref = 'func main() {\n}\n';
    const draft = 'func main() {\n}';
    expect(diffChangedLines(ref, draft).draft.size).toBe(0);
    expect(matchScore(ref, draft)).toBe(100);
  });

  it('returns 100% for identical sources', () => {
    const code = 'package main\n\nfunc solve() int {\n\treturn 42\n}';
    expect(matchScore(code, code)).toBe(100);
    expect(diffChangedLines(code, code).draft.size).toBe(0);
  });

  it('scores partial matches below 100', () => {
    const ref = 'one\ntwo\nthree';
    const draft = 'one\nTWO\nthree';
    expect(matchScore(ref, draft)).toBeLessThan(100);
    expect(matchScore(ref, draft)).toBeGreaterThan(0);
  });
});

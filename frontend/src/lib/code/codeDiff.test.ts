import { describe, expect, it } from 'vitest';
import { computeRecallProgress, diffChangedLines, matchScore } from './codeDiff';

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

  it('ignores indentation differences by default but flags them when ignoreWhitespace is false', () => {
    const ref = 'func f() {\n\treturn 1\n}';
    const draft = 'func f() {\n  return 1\n}';
    expect(matchScore(ref, draft)).toBe(100);
    expect(diffChangedLines(ref, draft).draft.size).toBe(0);

    expect(matchScore(ref, draft, false)).toBeLessThan(100);
    expect(diffChangedLines(ref, draft, false).draft.has(2)).toBe(true);
  });
});

describe('computeRecallProgress', () => {
  const ref = 'func main() {\n\tx := 1\n\treturn x\n}';

  it('reports the first line as current with an empty draft', () => {
    const progress = computeRecallProgress(ref, '');
    expect(progress.completedLines).toEqual([]);
    expect(progress.currentLine).toBe(1);
    expect(progress.matchedPrefixLen).toBe(0);
    expect(progress.total).toBe(4);
  });

  it('marks prior lines complete and tracks the in-progress prefix on the current line', () => {
    const draft = 'func main() {\n\tx :=';
    const progress = computeRecallProgress(ref, draft);
    expect(progress.completedLines).toEqual([1]);
    expect(progress.currentLine).toBe(2);
    expect(progress.matchedPrefixLen).toBe('x :='.length);
  });

  it('advances to the next line once the current line matches exactly', () => {
    const draft = 'func main() {\n\tx := 1';
    const progress = computeRecallProgress(ref, draft);
    expect(progress.completedLines).toEqual([1, 2]);
    expect(progress.currentLine).toBe(3);
    expect(progress.matchedPrefixLen).toBe(0);
  });

  it('reports no current line once every line is recalled', () => {
    const progress = computeRecallProgress(ref, ref);
    expect(progress.completedLines).toEqual([1, 2, 3, 4]);
    expect(progress.currentLine).toBeNull();
    expect(progress.matchedPrefixLen).toBe(0);
  });

  it('handles an empty reference', () => {
    const progress = computeRecallProgress('', '');
    expect(progress.total).toBe(0);
    expect(progress.currentLine).toBeNull();
    expect(progress.completedLines).toEqual([]);
  });

  it('does not report phantom progress or a bogus prefix when the draft overruns the reference', () => {
    const progress = computeRecallProgress('a\nb', 'a\nb\nc\nd');
    expect(progress.completedLines).toEqual([1, 2]);
    expect(progress.currentLine).toBeNull();
    expect(progress.matchedPrefixLen).toBe(0);
    expect(progress.total).toBe(2);
  });

  it('stops at the first diverging completed line instead of trusting the index', () => {
    const progress = computeRecallProgress('a\nb\nc', 'X\nY\nZ');
    expect(progress.completedLines).toEqual([]);
    expect(progress.currentLine).toBe(1);
    expect(progress.matchedPrefixLen).toBe(0);
  });

  it('treats an indentation-only completed line as diverging when ignoreWhitespace is false', () => {
    const wsRef = 'func main() {\n\tx := 1\n\treturn x\n}';
    const progress = computeRecallProgress(wsRef, 'func main() {\n  x := 1', false);
    expect(progress.completedLines).toEqual([1]);
    expect(progress.currentLine).toBe(2);
  });
});

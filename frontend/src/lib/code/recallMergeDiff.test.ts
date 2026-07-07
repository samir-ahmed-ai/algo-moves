import { describe, expect, it } from 'vitest';
import { buildRecallMergeReconfigure, recallMergeDiff } from './recallMergeDiff';

describe('buildRecallMergeReconfigure', () => {
  it('always includes recall trim diff override', () => {
    const opts = buildRecallMergeReconfigure({ mergeCollapse: false });
    expect(opts.diffConfig?.override).toBe(recallMergeDiff);
    expect(opts.collapseUnchanged).toBeUndefined();
  });

  it('includes collapseUnchanged when mergeCollapse is true', () => {
    const opts = buildRecallMergeReconfigure({ mergeCollapse: true });
    expect(opts.collapseUnchanged).toEqual({ margin: 3, minSize: 4 });
  });
});

describe('recallMergeDiff', () => {
  it('returns no changes when lines differ only in leading/trailing whitespace', () => {
    const ref = 'func main() {\n\treturn 42\n}';
    const draft = '  func main() {\n\treturn 42  \n}\n';
    expect(recallMergeDiff(ref, draft)).toEqual([]);
  });

  it('returns no changes for identical sources', () => {
    const code = 'package main\n\nfunc solve() int {\n\treturn 42\n}';
    expect(recallMergeDiff(code, code)).toEqual([]);
  });

  it('flags lines with different content after trim', () => {
    const ref = 'one\ntwo\nthree';
    const draft = 'one\nTWO\nthree';
    const changes = recallMergeDiff(ref, draft);
    expect(changes.length).toBeGreaterThan(0);
    const coversLine2 = changes.some((c) => c.fromA <= 4 && c.toA >= 4);
    expect(coversLine2).toBe(true);
  });

  it('treats tab vs space indentation as equal after line trim', () => {
    const ref = 'func f() {\n\treturn 1\n}';
    const draft = 'func f() {\n  return 1\n}';
    expect(recallMergeDiff(ref, draft)).toEqual([]);
  });

  it('flags inserted lines', () => {
    const ref = 'a\nb';
    const draft = 'a\nx\nb';
    const changes = recallMergeDiff(ref, draft);
    expect(changes.length).toBe(1);
    expect(changes[0]!.fromA).toBe(2);
    expect(changes[0]!.toA).toBe(2);
    expect(changes[0]!.fromB).toBe(2);
    expect(changes[0]!.toB).toBe(4);
  });

  it('flags deleted lines', () => {
    const ref = 'a\nx\nb';
    const draft = 'a\nb';
    const changes = recallMergeDiff(ref, draft);
    expect(changes.length).toBe(1);
    expect(changes[0]!.fromA).toBe(2);
    expect(changes[0]!.toA).toBe(4);
    expect(changes[0]!.fromB).toBe(2);
    expect(changes[0]!.toB).toBe(2);
  });

  it('ignores trailing blank-line differences', () => {
    const ref = 'line\n';
    const draft = 'line';
    expect(recallMergeDiff(ref, draft)).toEqual([]);
  });

  it('handles CRLF line endings', () => {
    const ref = 'a\r\nb\r\n';
    const draft = 'a\nb';
    expect(recallMergeDiff(ref, draft)).toEqual([]);
  });

  it('handles empty documents', () => {
    expect(recallMergeDiff('', '')).toEqual([]);
  });

  it('treats whitespace-only lines as equal after trim', () => {
    const ref = 'a\n   \nb';
    const draft = 'a\n\t\nb';
    expect(recallMergeDiff(ref, draft)).toEqual([]);
  });

  it('clamps change ranges to document length', () => {
    const ref = 'only';
    const draft = 'only\nextra';
    const changes = recallMergeDiff(ref, draft);
    expect(changes.length).toBe(1);
    expect(changes[0]!.fromB).toBeLessThanOrEqual(draft.length);
    expect(changes[0]!.toB).toBeLessThanOrEqual(draft.length);
  });
});

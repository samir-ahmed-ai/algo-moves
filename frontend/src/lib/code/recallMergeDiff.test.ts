import { describe, expect, it } from 'vitest';
import { buildRecallMergeReconfigure, recallMergeDiff } from './recallMergeDiff';

describe('buildRecallMergeReconfigure', () => {
  it('always includes a recall diff override', () => {
    const opts = buildRecallMergeReconfigure({ mergeCollapse: false });
    expect(typeof opts.diffConfig?.override).toBe('function');
    expect(opts.collapseUnchanged).toBeUndefined();
  });

  it('override ignores whitespace by default', () => {
    const opts = buildRecallMergeReconfigure({});
    const ref = 'func f() {\n\treturn 1\n}';
    const draft = 'func f() {\n  return 1\n}';
    expect(opts.diffConfig?.override?.(ref, draft)).toEqual([]);
  });

  it('override highlights whitespace when ignoreWhitespace is false', () => {
    const opts = buildRecallMergeReconfigure({ ignoreWhitespace: false });
    const ref = 'func f() {\n\treturn 1\n}';
    const draft = 'func f() {\n  return 1\n}';
    expect(opts.diffConfig?.override?.(ref, draft)?.length).toBeGreaterThan(0);
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

  it('highlights leading/trailing whitespace differences when ignoreWhitespace is false', () => {
    const ref = 'func main() {\n\treturn 42\n}';
    const draft = '  func main() {\n\treturn 42  \n}';
    expect(recallMergeDiff(ref, draft, false).length).toBeGreaterThan(0);
  });

  it('highlights tab vs space indentation when ignoreWhitespace is false', () => {
    const ref = 'func f() {\n\treturn 1\n}';
    const draft = 'func f() {\n  return 1\n}';
    const changes = recallMergeDiff(ref, draft, false);
    expect(changes.length).toBeGreaterThan(0);
    const coversLine2 = changes.some((c) => c.fromA <= 11 && c.toA >= 11);
    expect(coversLine2).toBe(true);
  });

  it('still ignores CRLF vs LF even when ignoreWhitespace is false', () => {
    const ref = 'a\r\nb\r\nc';
    const draft = 'a\nb\nc';
    expect(recallMergeDiff(ref, draft, false)).toEqual([]);
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

  it('handles bulk insert then delete — ranges stay clamped', () => {
    const ref = 'base';
    const bulkLines = Array.from({ length: 100 }, (_, i) => `line${i}`).join('\n');
    const draftWithBulk = `${ref}\n${bulkLines}`;
    const insertChanges = recallMergeDiff(ref, draftWithBulk);
    for (const c of insertChanges) {
      expect(c.fromB).toBeGreaterThanOrEqual(0);
      expect(c.toB).toBeLessThanOrEqual(draftWithBulk.length);
    }
    const deleteChanges = recallMergeDiff(ref, ref);
    expect(deleteChanges).toEqual([]);
  });

  it('does not push a lone trailing `return`/`}` down to a distant reference match', () => {
    const ref = [
      'func Constructor() Cache {',
      '\th, t := &node{}, &node{}',
      '\th.next, t.prev = t, h',
      '\treturn Cache{cap: 1}',
      '}',
      '',
      'func (c *Cache) remove(n *node) {',
      '\tn.prev.next = n.next',
      '}',
      '',
      'func (c *Cache) Put(k, v int) {',
      '\tif ok {',
      '\t\tc.moveHead(n)',
      '\t\treturn',
      '\t}',
      '\tx := 1',
      '}',
    ].join('\n');
    const draft = [
      'func Constructor() Cache {',
      '\th, t := &node{}, &node{}',
      '\th.next, t.prev = t, h',
      '\treturn',
      '}',
    ].join('\n');

    const changes = recallMergeDiff(ref, draft);

    // Offset of the draft's bare `return` line (leading tab included).
    const draftReturnStart = draft.indexOf('\treturn');

    // Bug: a reference-only spacer (pure removed, fromB === toB) anchored at/before the
    // draft `return` while spanning many reference lines — jammed into the middle and
    // pushing the typed line down. The big removed block must sit at the end instead.
    const middleSpacer = changes.find(
      (c) => c.fromB === c.toB && c.fromB <= draftReturnStart && c.toA - c.fromA > 40,
    );
    expect(middleSpacer).toBeUndefined();

    // The large reference span should align to the end of the draft (gap at the bottom).
    const bigRefChange = changes.find((c) => c.toA - c.fromA > 40);
    expect(bigRefChange).toBeDefined();
    expect(bigRefChange!.toB).toBe(draft.length);
  });

  it('handles rapid insert/delete cycle without out-of-bounds ranges', () => {
    const ref = 'start\nmiddle\nend';
    let draft = ref;
    for (let i = 0; i < 20; i++) {
      draft = `${draft}\ninserted${i}`;
      for (const c of recallMergeDiff(ref, draft)) {
        expect(c.fromA).toBeGreaterThanOrEqual(0);
        expect(c.toA).toBeLessThanOrEqual(ref.length);
        expect(c.fromB).toBeGreaterThanOrEqual(0);
        expect(c.toB).toBeLessThanOrEqual(draft.length);
      }
      draft = ref;
      expect(recallMergeDiff(ref, draft)).toEqual([]);
    }
  });
});

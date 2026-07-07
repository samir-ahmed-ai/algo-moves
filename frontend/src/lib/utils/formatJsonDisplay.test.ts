import { describe, expect, it } from 'vitest';
import { formatJsonDisplay, looksLikeJson } from './formatJsonDisplay';

describe('formatJsonDisplay', () => {
  it('returns empty string for nullish values', () => {
    expect(formatJsonDisplay(null)).toBe('');
    expect(formatJsonDisplay(undefined)).toBe('');
  });

  it('pretty-prints objects and arrays', () => {
    expect(formatJsonDisplay({ n: 5, edges: [[0, 1]] })).toBe(
      '{\n  "n": 5,\n  "edges": [\n    [\n      0,\n      1\n    ]\n  ]\n}',
    );
    expect(formatJsonDisplay([1, 2, 3])).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it('pretty-prints compact JSON strings', () => {
    expect(formatJsonDisplay('{"a":1,"b":[2,3]}')).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });

  it('returns non-JSON strings unchanged', () => {
    expect(formatJsonDisplay('MST 16')).toBe('MST 16');
    expect(formatJsonDisplay('tree=[1,2,3]')).toBe('tree=[1,2,3]');
  });

  it('returns invalid JSON strings unchanged', () => {
    expect(formatJsonDisplay('{not json')).toBe('{not json');
  });

  it('falls back to String for non-serializable values', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(formatJsonDisplay(circular)).toBe('[object Object]');
  });
});

describe('looksLikeJson', () => {
  it('detects JSON-like strings', () => {
    expect(looksLikeJson('{"a":1}')).toBe(true);
    expect(looksLikeJson('[1,2]')).toBe(true);
    expect(looksLikeJson('  {"a":1}  ')).toBe(true);
  });

  it('rejects plain text outputs', () => {
    expect(looksLikeJson('MST 16')).toBe(false);
    expect(looksLikeJson('true')).toBe(false);
  });
});

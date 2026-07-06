import { Chunk } from '@codemirror/merge';
import { Text } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { mapPointerLine } from './recallPointer';

function text(s: string): Text {
  return Text.of(s.split('\n'));
}

describe('mapPointerLine', () => {
  it('line mode clamps the same line number into the target doc', () => {
    const a = text('a\nb\nc');
    const b = text('x\ny');
    expect(mapPointerLine(1, 'line', [], a, b, 'aToB')).toBe(1);
    expect(mapPointerLine(3, 'line', [], a, b, 'aToB')).toBe(2);
  });

  it('diff mode tracks unchanged lines before any chunk', () => {
    // a: "one\ntwo\nthree"  b: "one\ntwo\nTHREE" -> chunk only on line 3
    const a = text('one\ntwo\nthree');
    const b = text('one\ntwo\nTHREE');
    const chunks = Chunk.build(a, b);
    expect(mapPointerLine(1, 'diff', chunks, a, b, 'aToB')).toBe(1);
    expect(mapPointerLine(2, 'diff', chunks, a, b, 'aToB')).toBe(2);
  });

  it('diff mode maps a changed line onto the corresponding changed range', () => {
    const a = text('one\ntwo\nthree');
    const b = text('one\ntwo\nTHREE');
    const chunks = Chunk.build(a, b);
    expect(mapPointerLine(3, 'diff', chunks, a, b, 'aToB')).toBe(3);
    expect(mapPointerLine(3, 'diff', chunks, b, a, 'bToA')).toBe(3);
  });

  it('diff mode maps lines after an insertion by the correct offset', () => {
    // b has an extra line inserted after line 1
    const a = text('one\ntwo\nthree');
    const b = text('one\nINSERTED\ntwo\nthree');
    const chunks = Chunk.build(a, b);
    expect(mapPointerLine(1, 'diff', chunks, a, b, 'aToB')).toBe(1);
    expect(mapPointerLine(2, 'diff', chunks, a, b, 'aToB')).toBe(3);
    expect(mapPointerLine(3, 'diff', chunks, a, b, 'aToB')).toBe(4);
  });

  it('diff mode maps the reverse (bToA) direction for an insertion', () => {
    const a = text('one\ntwo\nthree');
    const b = text('one\nINSERTED\ntwo\nthree');
    const chunks = Chunk.build(a, b);
    expect(mapPointerLine(2, 'diff', chunks, b, a, 'bToA')).toBe(2);
    expect(mapPointerLine(3, 'diff', chunks, b, a, 'bToA')).toBe(2);
    expect(mapPointerLine(4, 'diff', chunks, b, a, 'bToA')).toBe(3);
  });

  it('clamps out-of-range input and output lines', () => {
    const a = text('one\ntwo');
    const b = text('x');
    expect(mapPointerLine(50, 'line', [], a, b, 'aToB')).toBe(1);
    expect(mapPointerLine(0, 'line', [], a, b, 'aToB')).toBe(1);
  });
});

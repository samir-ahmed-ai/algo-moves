import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearPendingProblemDrop,
  consumePendingProblemDrop,
  peekPendingProblemDrop,
  setPendingProblemDrop,
} from './pendingProblemDrop';

describe('pendingProblemDrop', () => {
  beforeEach(() => {
    clearPendingProblemDrop();
  });

  it('stores and consumes a drop for the matching item id', () => {
    setPendingProblemDrop('binary-search', { x: 120, y: 80 });
    expect(peekPendingProblemDrop('binary-search')?.position).toEqual({ x: 120, y: 80 });
    expect(consumePendingProblemDrop('binary-search')).toEqual({ x: 120, y: 80 });
    expect(consumePendingProblemDrop('binary-search')).toBeNull();
  });

  it('ignores consume when item id does not match', () => {
    setPendingProblemDrop('a', { x: 1, y: 2 });
    expect(consumePendingProblemDrop('b')).toBeNull();
    expect(consumePendingProblemDrop('a')).toEqual({ x: 1, y: 2 });
  });
});

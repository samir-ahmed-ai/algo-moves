import { describe, it, expect } from 'vitest';
import { applyMotion, isWalkable } from '../vimMotions';

const grid = [
  '#####',
  '#.@.#',
  '#...#',
  '#####',
];

describe('vimMotions', () => {
  it('detects walkable cells', () => {
    expect(isWalkable(grid, 1, 2)).toBe(true);
    expect(isWalkable(grid, 0, 0)).toBe(false);
  });

  it('moves with h/j/k/l', () => {
    expect(applyMotion(grid, [1, 2], { kind: 'l', count: 1 })).toEqual([1, 3]);
    expect(applyMotion(grid, [1, 2], { kind: 'j', count: 1 })).toEqual([2, 2]);
  });

  it('blocks wall collision', () => {
    expect(applyMotion(grid, [1, 1], { kind: 'h', count: 1 })).toBeNull();
  });

  it('jumps with $ to end of line', () => {
    expect(applyMotion(grid, [2, 2], { kind: '$', count: 1 })).toEqual([2, 3]);
  });

  it('finds character with f', () => {
    const g = ['######', '#..x.#', '######'];
    expect(applyMotion(g, [1, 1], { kind: 'f', count: 1, char: 'x' })).toEqual([1, 3]);
  });

  it('word motion w jumps gap', () => {
    const g = ['##########', '#.@..##....#', '##########'];
    expect(applyMotion(g, [1, 2], { kind: 'w', count: 1 })).toEqual([1, 7]);
  });
});

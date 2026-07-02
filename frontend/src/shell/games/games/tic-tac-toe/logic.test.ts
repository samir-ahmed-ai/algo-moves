import { describe, expect, it } from 'vitest';
import {
  autoMoveIndex,
  currentMark,
  emptyBoard,
  isFull,
  WIN_LINES,
  winner,
  winningLine,
  type Board,
} from './logic';

const b = (cells: string): Board =>
  cells.split('').map((ch) => (ch === 'X' ? 'X' : ch === 'O' ? 'O' : null));

describe('tic-tac-toe logic', () => {
  it('exposes all eight winning lines', () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  it('detects a row win', () => {
    expect(winner(b('XXX' + 'OO.' + '...'))).toBe('X');
    expect(winner(b('...' + 'OOO' + '...'))).toBe('O');
    expect(winner(b('...' + '...' + 'XXX'))).toBe('X');
  });

  it('detects a column win', () => {
    expect(winner(b('X..' + 'X..' + 'X..'))).toBe('X');
    expect(winner(b('.O.' + '.O.' + '.O.'))).toBe('O');
    expect(winner(b('..X' + '..X' + '..X'))).toBe('X');
  });

  it('detects both diagonals', () => {
    expect(winner(b('X..' + '.X.' + '..X'))).toBe('X');
    expect(winner(b('..O' + '.O.' + 'O..'))).toBe('O');
  });

  it('returns null with no winner', () => {
    expect(winner(emptyBoard())).toBeNull();
    expect(winner(b('XO.' + '.X.' + '..O'))).toBeNull();
  });

  it('detects a full board (draw)', () => {
    const draw = b('XOX' + 'XOO' + 'OXX');
    expect(winner(draw)).toBeNull();
    expect(isFull(draw)).toBe(true);
  });

  it('reports a partial board as not full', () => {
    expect(isFull(emptyBoard())).toBe(false);
    expect(isFull(b('XOX' + 'XO.' + 'OXX'))).toBe(false);
  });

  it('alternates turn order X then O', () => {
    expect(currentMark(emptyBoard())).toBe('X');
    expect(currentMark(b('X..' + '...' + '...'))).toBe('O');
    expect(currentMark(b('XO.' + '...' + '...'))).toBe('X');
    expect(currentMark(b('XOX' + '...' + '...'))).toBe('O');
  });

  it('returns the completed winning triple', () => {
    expect(winningLine(b('XXX' + 'OO.' + '...'))).toEqual([0, 1, 2]);
    expect(winningLine(b('X..' + 'X..' + 'X..'))).toEqual([0, 3, 6]);
    expect(winningLine(b('X..' + '.X.' + '..X'))).toEqual([0, 4, 8]);
    expect(winningLine(b('..O' + '.O.' + 'O..'))).toEqual([2, 4, 6]);
  });

  it('has no winning triple without a winner', () => {
    expect(winningLine(emptyBoard())).toBeNull();
    expect(winningLine(b('XO.' + '.X.' + '..O'))).toBeNull();
  });

  it('auto-skip picks the lowest empty cell', () => {
    expect(autoMoveIndex(emptyBoard())).toBe(0);
    expect(autoMoveIndex(b('XO.' + '...' + '...'))).toBe(2);
    expect(autoMoveIndex(b('XOX' + 'O..' + '...'))).toBe(4);
  });

  it('auto-skip returns -1 when there is nothing to play', () => {
    expect(autoMoveIndex(b('XOX' + 'XOO' + 'OXX'))).toBe(-1); // full draw
    expect(autoMoveIndex(b('XXX' + 'OO.' + '...'))).toBe(-1); // already won
  });
});

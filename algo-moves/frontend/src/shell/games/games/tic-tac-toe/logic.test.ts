import { describe, expect, it } from 'vitest';
import { currentMark, emptyBoard, isFull, WIN_LINES, winner, type Board } from './logic';

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
});

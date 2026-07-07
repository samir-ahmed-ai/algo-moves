import { describe, expect, it } from 'vitest';
import { getVimLevel } from '../../engine';
import {
  MAZE_GRID_GAP,
  MAZE_NODE_CHROME,
  computeMazeFillCellSize,
  fitMazeCellSize,
  mazeBoardDimensions,
  mazeCellFontSize,
  mazeNodeSize,
} from './mazeMetrics';

describe('mazeMetrics', () => {
  it('includes grid gaps in board dimensions', () => {
    const grid = getVimLevel('basic-02')!.grid;
    const board = mazeBoardDimensions(grid, 30);
    expect(board.cols).toBe(7);
    expect(board.rows).toBe(7);
    expect(board.w).toBe(7 * 30 + 6 * MAZE_GRID_GAP);
    expect(board.h).toBe(7 * 30 + 6 * MAZE_GRID_GAP);
  });

  it('includes maze shell chrome in node size for basic-02', () => {
    const grid = getVimLevel('basic-02')!.grid;
    const board = mazeBoardDimensions(grid, 30);
    const node = mazeNodeSize(grid, 30);
    const { padX, padTop, title, padBottom } = MAZE_NODE_CHROME;

    expect(node.w).toBe(board.w + padX);
    expect(node.h).toBe(board.h + padTop + title + padBottom);
    expect(node.w).toBeGreaterThan(7 * 30);
  });

  it('fitMazeCellSize shrinks cells for narrow inner width', () => {
    const grid = getVimLevel('basic-02')!.grid;
    expect(fitMazeCellSize(grid, 200, 30)).toBeLessThan(30);
    expect(fitMazeCellSize(grid, 200, 30)).toBeGreaterThanOrEqual(16);
  });

  describe('computeMazeFillCellSize', () => {
    it('returns a cell size that fits the board in the given inner area', () => {
      const grid = getVimLevel('basic-01')!.grid; // 5×5
      const { cols, rows } = mazeBoardDimensions(grid, 1);
      const innerW = 1197;
      const innerH = 677;
      const cell = computeMazeFillCellSize(grid, innerW, innerH);
      const gapX = (cols - 1) * MAZE_GRID_GAP;
      const gapY = (rows - 1) * MAZE_GRID_GAP;
      expect(cols * cell + gapX).toBeLessThanOrEqual(innerW);
      expect(rows * cell + gapY).toBeLessThanOrEqual(innerH);
    });

    it('scales up on large inner areas compared to small ones', () => {
      const grid = getVimLevel('basic-01')!.grid;
      const small = computeMazeFillCellSize(grid, 200, 200);
      const large = computeMazeFillCellSize(grid, 1197, 677);
      expect(large).toBeGreaterThan(small);
    });

    it('uses the height constraint for tall grids', () => {
      const grid = getVimLevel('basic-02')!.grid; // 7×7
      const innerW = 1197;
      const innerH = 677;
      const cell = computeMazeFillCellSize(grid, innerW, innerH);
      const { cols, rows } = mazeBoardDimensions(grid, 1);
      expect(rows * cell + (rows - 1) * MAZE_GRID_GAP).toBeLessThanOrEqual(innerH);
      expect(cols * cell + (cols - 1) * MAZE_GRID_GAP).toBeLessThanOrEqual(innerW);
    });

    it('never returns less than minCell', () => {
      const grid = getVimLevel('basic-02')!.grid;
      const cell = computeMazeFillCellSize(grid, 10, 10);
      expect(cell).toBeGreaterThanOrEqual(16);
    });

    it('mazeCellFontSize scales with cell size', () => {
      expect(mazeCellFontSize(30)).toBeGreaterThan(16);
      expect(mazeCellFontSize(100)).toBeGreaterThan(mazeCellFontSize(30));
    });
  });
});

import { describe, expect, it } from 'vitest';
import { getVimLevel } from '../../engine';
import {
  MAZE_GRID_GAP,
  MAZE_NODE_CHROME,
  computeStudioCellSize,
  fitMazeCellSize,
  mazeBoardDimensions,
  mazeNodeSize,
} from './mazeMetrics';
import { HUD_PANEL_WIDTH } from './orbitSlots';

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

  it('computeStudioCellSize scales down for short viewports', () => {
    const grid = getVimLevel('basic-02')!.grid;
    const full = computeStudioCellSize(grid, 1280, 900, { hudW: HUD_PANEL_WIDTH });
    const short = computeStudioCellSize(grid, 1280, 360, { hudW: HUD_PANEL_WIDTH });
    expect(short).toBeLessThanOrEqual(full);
  });

  it('computeStudioCellSize scales up on large full-page viewports', () => {
    const grid = getVimLevel('basic-02')!.grid;
    const compact = computeStudioCellSize(grid, 480, 640, { hudW: HUD_PANEL_WIDTH });
    const spacious = computeStudioCellSize(grid, 1600, 1000, { hudW: HUD_PANEL_WIDTH });
    expect(spacious).toBeGreaterThan(compact);
    expect(spacious).toBeGreaterThan(30);
  });
});

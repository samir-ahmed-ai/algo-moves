import type { MazeGrid } from '../../engine';

/** Cell size in px — keep in sync with MazeBoard default. */
export const MAZE_CELL_SIZE = 30;

/** Largest maze cell when the studio has room to grow (full-page viewports). */
export const MAX_STUDIO_CELL_SIZE = 56;

/** Grid gap in px — matches `--space-1` (0.25rem @ 16px root) and MazeBoard inline gap. */
export const MAZE_GRID_GAP = 4;

/** MazeNode shell chrome — keep in sync with MazeNode.tsx (p-3, accent bar, pl-2, title). */
export const MAZE_NODE_CHROME = {
  /** p-3 left + accent bar + pl-2 + p-3 right */
  padX: 12 + 3 + 8 + 12,
  padTop: 12,
  /** title line (~0.6875rem) + mb-0.5 */
  title: 15,
  padBottom: 12,
} as const;

export function mazeBoardDimensions(grid: MazeGrid, cellSize = MAZE_CELL_SIZE) {
  const cols = grid.reduce((m, row) => Math.max(m, row.length), 0);
  const rows = grid.length;
  const gapX = Math.max(0, cols - 1) * MAZE_GRID_GAP;
  const gapY = Math.max(0, rows - 1) * MAZE_GRID_GAP;
  return {
    cols,
    rows,
    w: cols * cellSize + gapX,
    h: rows * cellSize + gapY,
  };
}

/** React Flow maze node size (board + shell chrome). */
export function mazeNodeSize(grid: MazeGrid, cellSize = MAZE_CELL_SIZE): { w: number; h: number } {
  const board = mazeBoardDimensions(grid, cellSize);
  const { padX, padTop, title, padBottom } = MAZE_NODE_CHROME;
  return {
    w: board.w + padX,
    h: board.h + padTop + title + padBottom,
  };
}

/** Largest cell size (flow-space px) used when the maze node fills the canvas. */
export const MAX_FILL_CELL_SIZE = 160;

/** Glyph size inside a maze cell, scaled to cell dimensions. */
export function mazeCellFontSize(cellSize: number): number {
  return Math.max(18, Math.round(cellSize * 0.64));
}

/**
 * Compute the largest cell size (flow-space px) so the board fits within the maze
 * node's inner content area when the node is in fill mode.
 */
export function computeMazeFillCellSize(
  grid: MazeGrid,
  innerW: number,
  innerH: number,
  maxCell = MAX_FILL_CELL_SIZE,
  minCell = 16,
): number {
  const { cols, rows } = mazeBoardDimensions(grid, 1);
  if (cols <= 0 || rows <= 0) return minCell;

  let lo = minCell;
  let hi = maxCell;
  let best = minCell;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const gapX = Math.max(0, cols - 1) * MAZE_GRID_GAP;
    const gapY = Math.max(0, rows - 1) * MAZE_GRID_GAP;
    if (cols * mid + gapX <= innerW && rows * mid + gapY <= innerH) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

/** Pick a cell size so the board fits within a max inner width (e.g. narrow viewports). */
export function fitMazeCellSize(
  grid: MazeGrid,
  maxInnerW: number,
  maxCellSize = MAZE_CELL_SIZE,
): number {
  const cols = grid.reduce((m, row) => Math.max(m, row.length), 0);
  if (cols <= 0) return maxCellSize;
  const gapX = Math.max(0, cols - 1) * MAZE_GRID_GAP;
  const fit = Math.floor((maxInnerW - gapX) / cols);
  return Math.max(16, Math.min(maxCellSize, fit));
}

/** Reserve space for floating chrome when fitting the studio stack to the viewport. */
export const VIM_FIT_CHROME_TOP = 56;
export const VIM_FIT_CHROME_BOTTOM = 104;

function studioStackSize(
  grid: MazeGrid,
  cell: number,
  hudW: number,
  hudH: number,
  gap: number,
): { w: number; h: number } {
  const maze = mazeNodeSize(grid, cell);
  return { w: Math.max(hudW, maze.w), h: hudH + gap + maze.h };
}

/** Pick the largest cell size so HUD + maze fit the React Flow viewport (scales up on full-page). */
export function computeStudioCellSize(
  grid: MazeGrid,
  viewportW: number,
  viewportH: number,
  opts: {
    hudW?: number;
    hudH?: number;
    gap?: number;
    maxCell?: number;
    minCell?: number;
    pad?: number;
  } = {},
): number {
  const {
    hudW = 422,
    hudH = 176,
    gap = 24,
    maxCell = MAX_STUDIO_CELL_SIZE,
    minCell = 16,
    pad = 0.12,
  } = opts;

  if (viewportW <= 0 || viewportH <= 0) return MAZE_CELL_SIZE;

  const insetX = viewportW * pad * 2;
  const insetY = viewportH * pad * 2 + VIM_FIT_CHROME_TOP + VIM_FIT_CHROME_BOTTOM;
  const availW = Math.max(0, viewportW - insetX);
  const availH = Math.max(0, viewportH - insetY);

  let lo = minCell;
  let hi = maxCell;
  let best = minCell;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const stack = studioStackSize(grid, mid, hudW, hudH, gap);
    if (stack.w <= availW && stack.h <= availH) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

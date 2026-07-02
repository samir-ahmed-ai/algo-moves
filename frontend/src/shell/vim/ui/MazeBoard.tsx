import type { MazeGrid, Pos } from '../engine/vimMotions';
import { MAZE_CELL_SIZE, MAZE_GRID_GAP, mazeBoardDimensions, mazeNodeSize } from '../canvas/layout/mazeMetrics';

export { mazeBoardDimensions, mazeNodeSize, MAZE_CELL_SIZE, MAZE_GRID_GAP };

export interface MazeBoardProps {
  grid: MazeGrid;
  cursor: Pos;
  goal: Pos;
  visited: Set<string>;
  shake?: boolean;
  complete?: boolean;
  showHint?: boolean;
  hint?: string;
  cellSize?: number;
}

function cellKey(r: number, c: number) {
  return `${r},${c}`;
}

export function MazeBoard({
  grid,
  cursor,
  goal,
  visited,
  shake = false,
  complete = false,
  showHint = false,
  hint,
  cellSize = MAZE_CELL_SIZE,
}: MazeBoardProps) {
  const cols = grid.reduce((m, row) => Math.max(m, row.length), 0);
  const [cr, cc] = cursor;
  const [gr, gc] = goal;

  return (
    <div className="relative inline-block max-w-full">
      <div
        className={`grid-board vim-maze-board ${complete ? 'vim-maze-board--complete' : ''}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gap: MAZE_GRID_GAP,
        }}
        role="application"
        aria-label="Vim maze board"
      >
        {grid.flatMap((row, r) =>
          Array.from({ length: cols }, (_, c) => {
            const ch = row[c] ?? '#';
            const isWall = ch === '#';
            const isCursor = r === cr && c === cc;
            const isGoal = r === gr && c === gc;
            const wasVisited = visited.has(cellKey(r, c));

            let tone = 'land';
            if (isWall) tone = 'water';
            else if (wasVisited && !isCursor) tone = 'visited';
            if (isGoal && !isCursor) tone = 'path';

            let display = '';
            if (isWall) display = '';
            else if (isCursor) display = '█';
            else if (isGoal) display = '★';
            else if (ch === '@') display = '';
            else if (ch !== '.' && ch !== '#') display = ch;

            return (
              <div
                key={cellKey(r, c)}
                className={`grid-cell vim-maze-cell ${tone} ${isCursor ? 'vim-maze-cursor active' : ''} ${shake && isCursor ? 'vim-maze-cursor--shake' : ''}`}
                style={{ width: cellSize, height: cellSize }}
              >
                <span className={isCursor ? 'vim-maze-cursor-glyph' : undefined}>{display}</span>
              </div>
            );
          }),
        )}
      </div>
      {showHint && hint ? (
        <div className="mt-2 max-w-xs rounded border border-edge bg-panel2/90 px-2 py-1 text-[11px] text-ink2">
          <span className="font-medium text-accent">Hint:</span> {hint}
        </div>
      ) : null}
    </div>
  );
}

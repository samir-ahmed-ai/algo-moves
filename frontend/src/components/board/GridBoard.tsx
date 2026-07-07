export interface GridBoardProps {
  grid: (number | string)[][];
  /** Per-cell class suffix → `.grid-cell.<tone>` (water | land | blocked | active | visited | path). */
  cellTone?: (r: number, c: number) => string;
  label?: (r: number, c: number) => string | number;
  /** Cell the algorithm is currently looking at (ring highlight). */
  active?: [number, number] | null;
  cellSize?: number;
  onCellClick?: (r: number, c: number) => void;
}

/**
 * Generic grid/matrix board for grid-traversal (islands, flood fill) and 2-D DP
 * problems. Cells tint by `cellTone`; the `active` cell gets a ring.
 */
export function GridBoard({
  grid,
  cellTone,
  label,
  active = null,
  cellSize = 44,
  onCellClick,
}: GridBoardProps) {
  const cols = grid[0]?.length ?? 0;
  return (
    <div
      className="grid-board"
      style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
      role="img"
      aria-label="grid board"
    >
      {grid.flatMap((row, r) =>
        row.map((v, c) => {
          const isActive = active && active[0] === r && active[1] === c;
          return (
            <div
              key={`${r}-${c}`}
              className={`grid-cell ${cellTone?.(r, c) ?? ''} ${isActive ? 'active' : ''} ${onCellClick ? 'nodrag' : ''}`}
              style={{
                width: cellSize,
                height: cellSize,
                cursor: onCellClick ? 'pointer' : undefined,
              }}
              onClick={onCellClick ? () => onCellClick(r, c) : undefined}
            >
              {label ? label(r, c) : v}
            </div>
          );
        }),
      )}
    </div>
  );
}

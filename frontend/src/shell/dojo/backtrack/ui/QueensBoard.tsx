import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { isAttacked, isBlockedCell, safeColumns } from '../engine/queens';
import { useBacktrackGame } from '../BacktrackGameProvider';

const ATTACK_TINT = 'color-mix(in srgb, var(--bad) 12%, transparent)';
const ATTACK_DOT = 'color-mix(in srgb, var(--bad) 55%, transparent)';
const SAFE_RING = 'inset 0 0 0 2px color-mix(in srgb, var(--good) 55%, transparent)';

export function QueensBoard() {
  const { level, state, cursorCol, activeRow, shake, showHint, complete } = useBacktrackGame();
  const { n } = level;

  const queenIndexAt = useMemo(() => {
    const map = new Map<string, number>();
    state.queens.forEach(([r, c], i) => map.set(`${r},${c}`, i));
    return map;
  }, [state.queens]);

  const preCount = level.prePlaced?.length ?? 0;
  const safeCols = useMemo(
    () =>
      showHint && activeRow != null
        ? new Set(safeColumns(state.queens, activeRow, n, level.blocked))
        : null,
    [showHint, activeRow, state.queens, n, level.blocked],
  );

  const cellSize = 'min(9vmin, 3.5rem)';

  return (
    <div
      role="grid"
      aria-label={`${n} by ${n} chessboard`}
      className={cn(
        'grid shrink-0 overflow-hidden rounded-[var(--radius)] border border-edge shadow-theme-sm',
        complete && 'vim-maze-board--complete',
      )}
      style={{
        gridTemplateColumns: `repeat(${n}, ${cellSize})`,
        gridAutoRows: cellSize,
      }}
    >
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        const queenIndex = queenIndexAt.get(`${r},${c}`);
        const hasQueen = queenIndex !== undefined;
        const prePlaced = hasQueen && queenIndex < preCount;
        const blocked = isBlockedCell(level, r, c);
        const attacked = !hasQueen && !blocked && isAttacked(state.queens, r, c);
        const isCursor = !complete && activeRow === r && cursorCol === c;
        const hintSafe = safeCols != null && activeRow === r && safeCols.has(c);

        return (
          <div
            key={`${r},${c}`}
            role="gridcell"
            aria-label={
              hasQueen
                ? `Queen at row ${r + 1}, column ${c + 1}`
                : blocked
                  ? `Blocked square at row ${r + 1}, column ${c + 1}`
                  : `Row ${r + 1}, column ${c + 1}`
            }
            className={cn(
              'relative grid place-items-center',
              (r + c) % 2 === 0 ? 'bg-panel' : 'bg-panel2',
              isCursor && 'z-10 bg-accentbg outline outline-2 -outline-offset-2 outline-accent',
              isCursor && shake && 'vim-maze-cursor--shake',
            )}
            style={hintSafe && !isCursor ? { boxShadow: SAFE_RING } : undefined}
          >
            {attacked ? (
              <>
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: ATTACK_TINT }}
                />
                <span
                  aria-hidden
                  className="absolute h-1 w-1 rounded-full"
                  style={{ background: ATTACK_DOT }}
                />
              </>
            ) : null}
            {hasQueen ? (
              <span
                aria-hidden
                className={cn('select-none leading-none text-accent', prePlaced && 'opacity-60')}
                style={{ fontSize: 'min(6.5vmin, 2.375rem)' }}
                title={prePlaced ? 'Pre-placed queen — cannot be undone' : undefined}
              >
                ♛
              </span>
            ) : blocked ? (
              <span aria-hidden className="select-none text-lg font-semibold text-ink3">
                ✕
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

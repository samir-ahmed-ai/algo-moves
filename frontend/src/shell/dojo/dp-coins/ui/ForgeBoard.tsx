import { cn } from '@/lib/utils/cn';
import { DojoKbd } from '@/shell/dojo/ui/shared';
import { candidatesAt } from '../engine/forge';
import { useForgeGame } from '../ForgeGameProvider';

const GOOD_RING = 'inset 0 0 0 2px color-mix(in srgb, var(--good) 65%, transparent)';
const FLASH_RING = 'inset 0 0 0 2px color-mix(in srgb, var(--accent) 75%, transparent)';

function cellText(value: number | null): string {
  if (value === null) return '·';
  if (!Number.isFinite(value)) return '∞';
  return String(value);
}

/** Shows what the current cell is asking: which pasts each coin points back to. */
function ForgeBanner() {
  const { level, dp, cursor, complete, trace, shake } = useForgeGame();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-[var(--radius)] border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors',
        complete ? 'border-good/40 bg-panel text-good' : 'border-accent/40 bg-accentbg text-accent',
        shake && 'vim-maze-cursor--shake',
      )}
    >
      {complete ? (
        <span>
          {trace
            ? `dp[${level.n}] = ${dp[level.n]} — optimal: ${[...trace.coins]
                .sort((a, b) => b - a)
                .join('¢ + ')}¢`
            : `dp[${level.n}] = ∞ — unreachable`}
        </span>
      ) : (
        <>
          <span className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide opacity-70">
            forging dp[{cursor}]
          </span>
          {level.coins.map((coin) => {
            const cand = candidatesAt(dp, cursor, level.coins).find((c) => c.coin === coin);
            return (
              <span key={coin} className={cn(!cand && 'opacity-45 line-through')}>
                {coin}¢→1+dp[{cursor - coin >= 0 ? cursor - coin : '—'}]
              </span>
            );
          })}
        </>
      )}
    </div>
  );
}

export function ForgeBoard() {
  const { level, dp, cursor, complete, trace, flash, handleKey } = useForgeGame();
  const cells = level.n + 1;
  // Budget: 92vw minus the (cells-1) 4px column gaps and 8px grid padding.
  const chromePx = (cells - 1) * 4 + 8;
  const cellSize = `min(calc((92vw - ${chromePx}px) / ${cells}), 3rem)`;
  const traceSet = new Set(trace?.cells ?? []);

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <ForgeBanner />
      <div
        role="grid"
        aria-label={`DP table for coins {${level.coins.join(', ')}} up to ${level.n}¢`}
        className="grid shrink-0 gap-x-1 rounded-[var(--radius)] p-1"
        style={{ gridTemplateColumns: `repeat(${cells}, ${cellSize})` }}
      >
        {dp.map((value, i) => {
          const isCursor = i === cursor;
          const onTrace = complete && traceSet.has(i);
          const isFlash = flash?.cell === i;

          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                aria-hidden
                className={cn('font-medium tabular-nums', isCursor ? 'text-accent' : 'text-ink3')}
                style={{ fontSize: `calc(${cellSize} * 0.3)` }}
              >
                {i}
              </span>
              <div
                role="gridcell"
                aria-label={`dp[${i}] = ${value === null ? 'unfilled' : cellText(value)}${isCursor ? ', current cell' : ''}${onTrace ? ', on the coin path' : ''}`}
                className={cn(
                  'relative grid w-full place-items-center rounded-[var(--radius)] border font-semibold tabular-nums transition-all duration-200',
                  value === null
                    ? 'border-edge bg-panel text-ink3'
                    : 'border-edge bg-panel2 text-ink',
                  value !== null && !Number.isFinite(value) && 'text-bad',
                  isCursor && 'z-10 border-accent/50 bg-accentbg text-accent',
                  onTrace && 'z-10 border-good/40 bg-panel text-good',
                )}
                style={{
                  height: `calc(${cellSize} * 1.15)`,
                  fontSize: `calc(${cellSize} * 0.44)`,
                  boxShadow: onTrace ? GOOD_RING : undefined,
                }}
              >
                {cellText(value)}
                {isFlash ? (
                  <span
                    key={flash.seq}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 animate-pulse rounded-[var(--radius)]"
                    style={{ boxShadow: FLASH_RING }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Coins">
        {level.coins.map((coin) => (
          <button
            key={coin}
            type="button"
            onClick={() => handleKey(String(coin))}
            disabled={complete}
            title={`forge via the ${coin}¢ coin (reads dp[i − ${coin}])`}
            className={cn(
              'flex items-center gap-1.5 rounded-full border border-edge bg-panel2 px-3 py-1.5 text-sm font-semibold tabular-nums text-ink transition-colors',
              !complete && 'hover:border-accent/40 hover:text-accent',
              complete && 'opacity-50',
            )}
          >
            <DojoKbd>{coin}</DojoKbd>
            {coin}¢
          </button>
        ))}
      </div>
    </div>
  );
}

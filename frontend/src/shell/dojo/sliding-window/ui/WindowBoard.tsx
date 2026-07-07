import { cn } from '@/lib/utils/cn';
import { chipLabel } from '../engine/window';
import { useWindowGame } from '../WindowGameProvider';

const BEST_RING = 'inset 0 0 0 2px color-mix(in srgb, var(--good) 65%, transparent)';

function MeterBanner() {
  const { level, meter, valid, shake, complete } = useWindowGame();
  const isSum = level.mode === 'min-sum';
  const reading = isSum ? `sum ${meter}` : `${meter} kind${meter === 1 ? '' : 's'}`;
  const cmp = isSum ? (valid ? '≥' : '<') : valid ? '≤' : '>';
  const goal = isSum ? `target ${level.target}` : `limit ${level.target}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-[var(--radius)] border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors',
        valid ? 'border-good/40 bg-panel text-good' : 'border-bad/30 bg-badbg text-bad',
        shake && 'vim-maze-cursor--shake',
      )}
    >
      <span className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide opacity-70">
        {complete ? 'final' : valid ? 'valid' : 'invalid'}
      </span>
      <span>{reading}</span>
      <span aria-hidden className="opacity-80">
        {cmp}
      </span>
      <span className="opacity-90">{goal}</span>
    </div>
  );
}

function BestBanner() {
  const { level, state } = useWindowGame();
  const wants = level.mode === 'min-sum' ? 'shortest' : 'longest';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition-colors',
        state.best ? 'border-good/40 bg-panel text-good' : 'border-edge bg-panel/90 text-ink3',
      )}
    >
      {state.best
        ? `Best so far: length ${state.best.len} (chips ${state.best.l}–${state.best.r})`
        : `No qualifying window yet — hunting the ${wants} one`}
    </div>
  );
}

export function WindowBoard() {
  const { level, state, complete } = useWindowGame();
  const n = level.values.length;
  // Budget: 90vw minus the (n-1) 4px column gaps and 8px grid padding.
  const chromePx = (n - 1) * 4 + 8;
  const cellSize = `min(calc((90vw - ${chromePx}px) / ${n}), 3.25rem)`;
  const empty = state.l > state.r;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <MeterBanner />
      <div
        role="grid"
        aria-label={`Row of ${n} chips, ${level.mode === 'min-sum' ? `target sum ${level.target}` : `at most ${level.target} kinds`}`}
        className={cn(
          'grid shrink-0 gap-x-1 gap-y-1.5 rounded-[var(--radius)] p-1',
          complete && 'vim-maze-board--complete',
        )}
        style={{ gridTemplateColumns: `repeat(${n}, ${cellSize})` }}
      >
        {level.values.map((v, i) => {
          const inWindow = !empty && i >= state.l && i <= state.r;
          const inBest = complete && state.best != null && i >= state.best.l && i <= state.best.r;
          const spent = i < state.l;

          return (
            <div
              key={i}
              role="gridcell"
              aria-label={`chip ${i} = ${chipLabel(level, v)}${inWindow ? ', in window' : ''}${spent ? ', behind the window' : ''}`}
              className={cn(
                'grid place-items-center rounded-[var(--radius)] border font-semibold tabular-nums transition-all duration-200',
                spent && !inBest
                  ? 'border-edge bg-panel text-ink3 opacity-35'
                  : 'border-edge bg-panel2 text-ink',
                inWindow && !inBest && 'z-10 border-accent/40 bg-accentbg text-accent',
                inWindow && !inBest && i === state.l && 'border-l-2 border-l-accent',
                inWindow && !inBest && i === state.r && 'border-r-2 border-r-accent',
                inBest && 'z-10 border-good/40 bg-panel text-good opacity-100',
              )}
              style={{
                height: cellSize,
                fontSize: `calc(${cellSize} * ${level.fruits ? 0.5 : 0.4})`,
                boxShadow: inBest ? BEST_RING : undefined,
              }}
            >
              {chipLabel(level, v)}
            </div>
          );
        })}
        {level.values.map((_, i) => {
          const isL = i === state.l && state.l < n;
          const isR = i === state.r && !empty;
          const label = isL && isR ? 'L·R' : isL ? 'L' : isR ? 'R' : null;

          return (
            <div
              key={`ptr-${i}`}
              aria-hidden
              className="grid place-items-center"
              style={{ height: `calc(${cellSize} * 0.62)` }}
            >
              {label ? (
                <span
                  className={cn(
                    'flex flex-col items-center leading-none',
                    complete ? 'text-good' : 'text-accent',
                  )}
                >
                  <span style={{ fontSize: `calc(${cellSize} * 0.28)` }}>▲</span>
                  <span
                    className="font-bold tracking-tight"
                    style={{ fontSize: `calc(${cellSize} * 0.34)` }}
                  >
                    {label}
                  </span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <BestBanner />
    </div>
  );
}

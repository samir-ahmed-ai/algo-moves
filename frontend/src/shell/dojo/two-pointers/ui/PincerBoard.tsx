import { cn } from '@/lib/utils/cn';
import { usePincerGame } from '../PincerGameProvider';

const GOOD_RING = 'inset 0 0 0 2px color-mix(in srgb, var(--good) 65%, transparent)';

function EquationBanner() {
  const { level, state, sum, crossed, complete, foundPair, shake } = usePincerGame();
  const vals = level.values;

  const showPair = !crossed;
  const onTarget = showPair && sum === level.target;
  const good = (complete && !foundPair) || onTarget;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-[var(--radius)] border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors',
        good
          ? 'border-good/40 bg-panel text-good'
          : showPair
            ? 'border-bad/30 bg-badbg text-bad'
            : 'border-accent/40 bg-accentbg text-accent',
        shake && 'vim-maze-cursor--shake',
      )}
    >
      {showPair ? (
        <>
          <span className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide opacity-70">
            arr[{state.l}] + arr[{state.r}]
          </span>
          <span>
            {vals[state.l]} + {vals[state.r]} = {sum}
          </span>
          <span aria-hidden className="opacity-80">
            {sum < level.target ? '<' : sum > level.target ? '>' : '='}
          </span>
          <span className="opacity-90">target {level.target}</span>
        </>
      ) : complete ? (
        <span>Pointers met — no pair sums to {level.target}. Proven in one pass.</span>
      ) : (
        <span>L and R have met — every element is ruled out. Press x.</span>
      )}
    </div>
  );
}

export function PincerBoard() {
  const { level, state, crossed, complete, foundPair } = usePincerGame();
  const n = level.values.length;
  const cellSize = `min(${(82 / n).toFixed(2)}vw, 3.25rem)`;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <EquationBanner />
      <div
        role="grid"
        aria-label={`Sorted array of ${n} values, target ${level.target}`}
        className={cn(
          'grid shrink-0 gap-x-1 gap-y-1.5 rounded-[var(--radius)] p-1',
          complete && 'vim-maze-board--complete',
        )}
        style={{ gridTemplateColumns: `repeat(${n}, ${cellSize})` }}
      >
        {level.values.map((v, i) => {
          const isL = i === state.l;
          const isR = i === state.r;
          const discarded = i < state.l || i > state.r;
          const claimed = complete && foundPair && (isL || isR);

          return (
            <div
              key={i}
              role="gridcell"
              aria-label={`arr[${i}] = ${v}${isL ? ', L pointer' : ''}${isR ? ', R pointer' : ''}${discarded ? ', ruled out' : ''}`}
              className={cn(
                'grid place-items-center rounded-[var(--radius)] border font-semibold tabular-nums transition-all duration-200',
                discarded
                  ? 'border-edge bg-panel text-ink3 opacity-35'
                  : 'border-edge bg-panel2 text-ink',
                (isL || isR) &&
                  !discarded &&
                  !claimed &&
                  'z-10 border-accent/40 bg-accentbg text-accent',
                claimed && 'z-10 border-good/40 bg-panel text-good',
              )}
              style={{
                height: cellSize,
                fontSize: `calc(${cellSize} * 0.4)`,
                boxShadow: claimed ? GOOD_RING : undefined,
              }}
            >
              {v}
            </div>
          );
        })}
        {level.values.map((_, i) => {
          const isL = i === state.l;
          const isR = i === state.r;
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
                    complete && foundPair
                      ? 'text-good'
                      : crossed && !complete
                        ? 'text-bad'
                        : 'text-accent',
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
    </div>
  );
}

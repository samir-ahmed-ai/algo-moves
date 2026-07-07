import { cn } from '@/lib/utils/cn';
import { mid, rangeEmpty } from '../engine/search';
import { useBisectGame } from '../BisectGameProvider';

const GOOD_RING = 'inset 0 0 0 2px color-mix(in srgb, var(--good) 65%, transparent)';

function TargetBanner() {
  const { level, state, empty, complete, foundIndex, shake } = useBisectGame();
  const vals = level.values;
  const probed = state.probedMid;
  const good = complete;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-center justify-center gap-2 rounded-[var(--radius)] border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors',
        good
          ? 'border-good/40 bg-panel text-good'
          : empty
            ? 'border-accent/40 bg-accentbg text-accent'
            : 'border-bad/30 bg-badbg text-bad',
        shake && 'vim-maze-cursor--shake',
      )}
    >
      <span className="text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide opacity-70">
        target
      </span>
      <span>{level.target}</span>
      {complete ? (
        <span className="opacity-90">
          {foundIndex != null
            ? `found at index ${foundIndex}`
            : `absent — proven by an empty range`}
        </span>
      ) : empty ? (
        <span className="opacity-90">range empty — press x</span>
      ) : probed != null ? (
        <span className="opacity-90">
          arr[{probed}] = {vals[probed]}{' '}
          {vals[probed]! < level.target ? '<' : vals[probed]! > level.target ? '>' : '='}{' '}
          {level.target}
        </span>
      ) : (
        <span className="opacity-90">
          range {state.lo}..{state.hi} · {state.hi - state.lo + 1} cards
        </span>
      )}
    </div>
  );
}

export function BisectBoard() {
  const { level, state, complete, foundIndex } = useBisectGame();
  const n = level.values.length;
  const empty = rangeEmpty(state);
  const midIdx = empty ? -1 : mid(state.lo, state.hi);
  // Budget: 100vw minus page px-3 (24px), grid p-1 (8px) and (n-1) 2px column gaps,
  // plus a 2px safety margin, so the fixed-column grid never overflows the viewport.
  const cellSize = `min(calc((100vw - ${34 + (n - 1) * 2}px) / ${n}), 2.9rem)`;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <TargetBanner />
      <div
        role="grid"
        aria-label={`Row of ${n} face-down sorted cards, target ${level.target}`}
        className={cn(
          'grid shrink-0 gap-x-0.5 gap-y-1 rounded-[var(--radius)] p-1',
          complete && 'vim-maze-board--complete',
        )}
        style={{ gridTemplateColumns: `repeat(${n}, ${cellSize})` }}
      >
        {level.values.map((v, i) => {
          const revealed = state.revealed.includes(i) || (complete && foundIndex === i);
          const inRange = !empty && i >= state.lo && i <= state.hi;
          const isProbed = state.probedMid === i;
          const isCandidate = state.candidate === i && !complete;
          const isFound = complete && foundIndex === i;

          return (
            <div
              key={i}
              role="gridcell"
              aria-label={`card ${i}${revealed ? `, value ${v}` : ', face down'}${inRange ? '' : ', discarded'}${isProbed ? ', probed middle' : ''}${isCandidate ? ', candidate' : ''}${isFound ? ', target' : ''}`}
              className={cn(
                'grid place-items-center rounded-[var(--radius)] border font-semibold tabular-nums transition-all duration-200',
                !inRange && !isFound
                  ? 'border-edge bg-panel text-ink3 opacity-35'
                  : revealed
                    ? 'border-edge bg-panel2 text-ink'
                    : 'border-edge bg-panel text-ink3',
                isProbed && !isFound && 'z-10 border-accent/40 bg-accentbg text-accent',
                isCandidate && !isProbed && 'z-10 border-accent/40 text-accent',
                isFound && 'z-10 border-good/40 bg-panel text-good',
              )}
              style={{
                height: `calc(${cellSize} * 1.3)`,
                fontSize: `calc(${cellSize} * ${revealed ? 0.42 : 0.5})`,
                boxShadow: isFound ? GOOD_RING : undefined,
              }}
            >
              {revealed ? v : '?'}
            </div>
          );
        })}
        {level.values.map((_, i) => {
          const isMid = i === midIdx && !complete;
          const isCandidate = state.candidate === i;

          return (
            <div
              key={`mark-${i}`}
              aria-hidden
              className="grid place-items-center"
              style={{ height: `calc(${cellSize} * 0.6)` }}
            >
              {isMid || isCandidate ? (
                <span
                  className={cn(
                    'flex flex-col items-center leading-none',
                    isMid
                      ? 'text-accent'
                      : complete && foundIndex === i
                        ? 'text-good'
                        : 'text-ink3',
                  )}
                >
                  <span style={{ fontSize: `calc(${cellSize} * 0.3)` }}>▲</span>
                  <span
                    className="font-bold tracking-tight"
                    style={{ fontSize: `calc(${cellSize} * 0.32)` }}
                  >
                    {isMid ? 'mid' : '1st?'}
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

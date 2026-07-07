import { cn } from '@/lib/utils/cn';
import { answerLabel, useSkylineGame } from '../SkylineGameProvider';

const CHART_H = 132;
const MIN_BAR_H = 14;

export function SkylineBoard() {
  const { level, state, complete, shake, sweeping } = useSkylineGame();
  const heights = level.heights;
  const n = heights.length;
  const maxH = Math.max(...heights);
  const onStack = new Set(state.stack);
  const barW = `min(${(58 / n).toFixed(2)}vw, 2.6rem)`;
  const days = level.theme === 'days';

  return (
    <div className="flex w-full min-w-0 flex-wrap items-end justify-center gap-x-4 gap-y-3">
      {/* Skyline chart: input bars processed left → right */}
      <div
        role="grid"
        aria-label={`Skyline of ${n} bars, processed left to right`}
        className={cn(
          'grid shrink-0 gap-x-1 rounded-[var(--radius)] p-1',
          complete && 'vim-maze-board--complete',
          shake && 'vim-maze-cursor--shake',
        )}
        style={{ gridTemplateColumns: `repeat(${n}, ${barW})` }}
      >
        {heights.map((h, i) => {
          const answer = state.answers[i]!;
          const incoming = i === state.next && !complete && !sweeping;
          const waiting = onStack.has(i);
          const pending = i > state.next;
          const barH = MIN_BAR_H + (h / maxH) * (CHART_H - MIN_BAR_H);

          return (
            <div
              key={i}
              role="gridcell"
              aria-label={`Bar ${i + 1}, height ${h}${
                incoming
                  ? ', incoming'
                  : waiting
                    ? ', waiting on the stack'
                    : answer !== null
                      ? `, resolved: ${answerLabel(level, i, answer)}`
                      : ''
              }`}
              className="flex flex-col items-center justify-end gap-1"
              style={{ height: CHART_H + 40 }}
            >
              <span
                className={cn(
                  'whitespace-nowrap rounded-full border px-1 text-[length:var(--fs-2xs)] font-bold leading-4 tabular-nums transition-all duration-200',
                  answer !== null
                    ? answer === 'none' && !days
                      ? 'border-edge bg-panel text-ink3'
                      : 'border-good/40 bg-panel text-good'
                    : incoming
                      ? 'border-accent/40 bg-accentbg text-accent'
                      : 'border-transparent text-transparent',
                )}
              >
                {answer !== null ? answerLabel(level, i, answer) : incoming ? '▼' : '·'}
              </span>
              <div
                className={cn(
                  'grid w-full place-items-end justify-items-center rounded-t-[var(--radius)] border pb-0.5 font-semibold tabular-nums transition-all duration-200',
                  incoming && 'border-accent/50 bg-accentbg text-accent',
                  waiting && 'border-accent/30 bg-panel2 text-ink',
                  pending && !incoming && 'border-edge bg-panel text-ink3 opacity-40',
                  !incoming && !waiting && !pending && 'border-edge bg-panel text-ink3 opacity-70',
                )}
                style={{ height: barH, fontSize: `calc(${barW} * 0.38)` }}
              >
                {h}
              </div>
              <span className="text-[length:var(--fs-2xs)] tabular-nums text-ink3">
                {days ? `d${i + 1}` : i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* The monotonic stack: waiting bars as chips, bottom = oldest */}
      <div
        aria-label="Stack of waiting bars, bottom is oldest"
        className="flex w-24 shrink-0 flex-col rounded-[var(--radius)] border border-edge bg-panel/70 p-1.5"
        style={{ height: CHART_H + 40 }}
      >
        <p className="text-center text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
          stack
        </p>
        <div className="flex min-h-0 flex-1 flex-col-reverse items-center gap-1 overflow-hidden pt-1">
          {state.stack.map((idx, pos) => (
            <div
              key={idx}
              className={cn(
                'grid h-5 shrink-0 place-items-center rounded border text-xs font-semibold tabular-nums transition-all duration-200',
                pos === state.stack.length - 1
                  ? 'border-accent/40 bg-accentbg text-accent'
                  : 'border-edge bg-panel2 text-ink2',
              )}
              style={{ width: `${Math.round(36 + (heights[idx]! / maxH) * 64)}%` }}
              title={`Bar ${idx + 1} (height ${heights[idx]}) waiting for its next greater`}
            >
              {heights[idx]}
            </div>
          ))}
          {state.stack.length === 0 ? (
            <span className="pb-1 text-[length:var(--fs-2xs)] text-ink3">
              {complete ? 'drained' : 'empty'}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

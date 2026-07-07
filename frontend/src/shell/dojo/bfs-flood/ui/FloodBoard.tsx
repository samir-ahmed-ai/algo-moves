import { cn } from '@/lib/utils/cn';
import { useFloodGame } from '../FloodGameProvider';

const HEAD_RING = 'inset 0 0 0 2px color-mix(in srgb, var(--accent) 75%, transparent)';
const STAR_RING = 'inset 0 0 0 2px color-mix(in srgb, var(--good) 65%, transparent)';

function QueueRibbon() {
  const { state, complete } = useFloodGame();

  return (
    <div
      className="flex min-h-[2.25rem] flex-wrap items-center justify-center gap-1 tabular-nums"
      aria-label="BFS queue, oldest first"
    >
      <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
        Queue
      </span>
      {state.queue.length === 0 ? (
        <span className="text-[length:var(--fs-2xs)] text-ink3">empty</span>
      ) : (
        state.queue.map((cell, i) => (
          <span
            key={`${cell.r}-${cell.c}`}
            className={cn(
              'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[length:var(--fs-2xs)] font-semibold',
              i === 0 && !complete
                ? 'border-accent/50 bg-accentbg text-accent'
                : 'border-edge bg-panel text-ink2',
            )}
            title={`#${i + 1} — cell (${cell.r},${cell.c}) at distance ${state.dist[cell.r]![cell.c]}`}
          >
            {i + 1}
            <span className="font-normal text-ink3">d{state.dist[cell.r]![cell.c]}</span>
          </span>
        ))
      )}
      {state.queue.length > 0 ? (
        <span className="text-[length:var(--fs-2xs)] text-ink3">← head is oldest</span>
      ) : null}
    </div>
  );
}

export function FloodBoard() {
  const { parsed, state, maxDist, complete, shake } = useFloodGame();
  const cellSize = `min(${(84 / parsed.cols).toFixed(2)}vw, 3rem)`;

  const queuePos = new Map<string, number>();
  state.queue.forEach((cell, i) => queuePos.set(`${cell.r},${cell.c}`, i + 1));

  const cells = [];
  for (let r = 0; r < parsed.rows; r++) {
    for (let c = 0; c < parsed.cols; c++) {
      const wall = parsed.walls[r]![c]!;
      const d = state.dist[r]![c]!;
      const pos = queuePos.get(`${r},${c}`);
      const isStar = parsed.star?.r === r && parsed.star?.c === c;
      const isSource = parsed.sources.some((s) => s.r === r && s.c === c);
      const flooded = d >= 0 && pos == null;
      const isHead = pos === 1;

      const tintPct = d >= 0 ? 16 + Math.round((54 * d) / Math.max(1, maxDist)) : 0;
      const starFound = isStar && d >= 0;

      let label: string | null = null;
      if (wall) label = null;
      else if (starFound) label = `★${d}`;
      else if (pos != null) label = String(pos);
      else if (flooded) label = String(d);
      else if (isStar) label = '★';

      cells.push(
        <div
          key={`${r}-${c}`}
          role="gridcell"
          aria-label={
            wall
              ? `(${r},${c}) wall`
              : `(${r},${c})${isSource ? ' source' : ''}${isStar ? ' star' : ''}${
                  pos != null
                    ? `, frontier position ${pos}${isHead ? ' (head)' : ''}, distance ${d}`
                    : flooded
                      ? `, flooded, distance ${d}`
                      : ', dry'
                }`
          }
          className={cn(
            'grid place-items-center rounded-[calc(var(--radius)*0.6)] border font-semibold tabular-nums transition-all duration-200',
            wall && 'border-transparent',
            !wall && d < 0 && 'border-edge bg-panel text-ink3',
            !wall && pos != null && !starFound && 'z-10 border-accent/50 bg-accentbg text-accent',
            !wall && flooded && !starFound && 'border-edge text-ink',
            starFound && 'z-10 border-good/50 bg-panel text-good',
          )}
          style={{
            height: cellSize,
            fontSize: `calc(${cellSize} * ${starFound ? 0.34 : 0.38})`,
            background: wall
              ? 'color-mix(in srgb, var(--ink3) 22%, var(--panel))'
              : flooded && !starFound
                ? `color-mix(in srgb, var(--accent) ${tintPct}%, var(--panel))`
                : undefined,
            boxShadow: starFound ? STAR_RING : isHead && !complete ? HEAD_RING : undefined,
          }}
        >
          {label}
        </div>,
      );
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2.5">
      <QueueRibbon />
      <div
        role="grid"
        aria-label={`Flood grid, ${parsed.rows} rows by ${parsed.cols} columns`}
        className={cn(
          'grid shrink-0 gap-1 rounded-[var(--radius)] border border-edge bg-panel2 p-1.5',
          complete && 'vim-maze-board--complete',
          shake && 'vim-maze-cursor--shake',
        )}
        style={{ gridTemplateColumns: `repeat(${parsed.cols}, ${cellSize})` }}
      >
        {cells}
      </div>
    </div>
  );
}

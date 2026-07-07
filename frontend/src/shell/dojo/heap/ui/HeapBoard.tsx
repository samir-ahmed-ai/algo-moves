import { cn } from '@/lib/utils/cn';
import { DojoBadge } from '@/shell/dojo/ui/shared';
import { comparisonTargets, opLabel, opsRemaining, parentIndex, totalPops } from '../engine/heap';
import { useHeapGame } from '../HeapGameProvider';

/** Fixed slot coordinates for a ≤3-level tree inside one SVG viewBox. */
const POS: { x: number; y: number }[] = [
  { x: 160, y: 34 },
  { x: 84, y: 102 },
  { x: 236, y: 102 },
  { x: 46, y: 170 },
  { x: 122, y: 170 },
  { x: 198, y: 170 },
  { x: 274, y: 170 },
];
const R = 21;

function OpQueue() {
  const { level, state, complete } = useHeapGame();
  const remaining = opsRemaining(state);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
        Ops
      </span>
      {remaining.length === 0 ? (
        <DojoBadge tone={complete ? 'good' : 'muted'}>
          {complete ? 'all done' : 'none left'}
        </DojoBadge>
      ) : (
        remaining.map((op, i) => (
          <DojoBadge key={`${state.opsDone + i}`} tone={i === 0 ? 'accent' : 'muted'}>
            {opLabel(op)}
          </DojoBadge>
        ))
      )}
      <span className="text-[length:var(--fs-2xs)] tabular-nums text-ink3">
        {state.opsDone}/{level.ops.length}
      </span>
    </div>
  );
}

function ServedStrip() {
  const { level, state } = useHeapGame();
  if (totalPops(level) === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
        Served
      </span>
      {state.served.length === 0 ? (
        <span className="text-[length:var(--fs-2xs)] text-ink3">— nothing yet</span>
      ) : (
        state.served.map((v, i) => (
          <span
            key={i}
            className="grid h-7 w-7 place-items-center rounded-full border border-good/40 bg-panel text-sm font-semibold tabular-nums text-good"
          >
            {v}
          </span>
        ))
      )}
    </div>
  );
}

function TreeSvg() {
  const { state, shake, complete } = useHeapGame();
  const { heap, phase } = state;
  const activeIndex = phase.kind === 'done' ? null : phase.index;
  const targets = new Set(comparisonTargets(state));
  const shown = Math.min(heap.length, POS.length);

  if (heap.length === 0) {
    return (
      <div className="grid h-24 w-full place-items-center rounded-[var(--radius)] border border-dashed border-edge text-sm text-ink3">
        empty heap — the next insert becomes the root
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 320 206"
      className="w-full max-w-[22rem]"
      role="img"
      aria-label={`Heap tree of ${heap.length} values`}
    >
      {Array.from({ length: shown }, (_, i) => {
        if (i === 0) return null;
        const p = POS[parentIndex(i)]!;
        const c = POS[i]!;
        return (
          <line
            key={`e-${i}`}
            x1={p.x}
            y1={p.y}
            x2={c.x}
            y2={c.y}
            stroke="var(--edge)"
            strokeWidth={1.5}
          />
        );
      })}
      {Array.from({ length: shown }, (_, i) => {
        const p = POS[i]!;
        const active = i === activeIndex;
        const target = targets.has(i);
        return (
          <g key={`n-${i}`} className={cn(active && shake && 'vim-maze-cursor--shake')}>
            <circle
              cx={p.x}
              cy={p.y}
              r={R}
              fill={
                active
                  ? 'color-mix(in srgb, var(--accent) 14%, var(--panel2))'
                  : complete
                    ? 'color-mix(in srgb, var(--good) 10%, var(--panel2))'
                    : 'var(--panel2)'
              }
              stroke={
                active
                  ? 'var(--accent)'
                  : target
                    ? 'var(--ink2)'
                    : complete
                      ? 'var(--good)'
                      : 'var(--edge)'
              }
              strokeWidth={active ? 2 : 1.5}
              strokeDasharray={target ? '4 3' : undefined}
            />
            <text
              x={p.x}
              y={p.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={14}
              fontWeight={600}
              fill={active ? 'var(--accent)' : complete ? 'var(--good)' : 'var(--ink)'}
            >
              {heap[i]}
            </text>
            <text x={p.x} y={p.y + R + 11} textAnchor="middle" fontSize={9} fill="var(--ink3)">
              {i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ArrayStrip() {
  const { state, shake, complete } = useHeapGame();
  const { heap, phase } = state;
  const activeIndex = phase.kind === 'done' ? null : phase.index;
  const targets = new Set(comparisonTargets(state));

  return (
    <div
      role="grid"
      aria-label="Heap as an array"
      className="flex items-start justify-center gap-1"
    >
      {heap.length === 0 ? (
        <span className="text-[length:var(--fs-2xs)] text-ink3">[ ] — empty array</span>
      ) : (
        heap.map((v, i) => {
          const active = i === activeIndex;
          const target = targets.has(i);
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                role="gridcell"
                aria-label={`array[${i}] = ${v}${active ? ', sifting' : ''}${target ? ', compared' : ''}`}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-[var(--radius)] border text-sm font-semibold tabular-nums transition-colors',
                  active
                    ? 'border-accent/60 bg-accentbg text-accent'
                    : target
                      ? 'border-ink3 border-dashed bg-panel2 text-ink'
                      : complete
                        ? 'border-good/40 bg-panel text-good'
                        : 'border-edge bg-panel2 text-ink',
                  active && shake && 'vim-maze-cursor--shake',
                )}
              >
                {v}
              </div>
              <span className="text-[length:var(--fs-2xs)] tabular-nums text-ink3">{i}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

export function HeapBoard() {
  const { state } = useHeapGame();
  const phase = state.phase;

  return (
    <div className="flex w-full min-w-0 max-w-[24rem] flex-col items-center gap-3">
      <OpQueue />
      <TreeSvg />
      <ArrayStrip />
      <p className="text-center text-[length:var(--fs-2xs)] text-ink3" aria-hidden>
        {phase.kind === 'siftUp'
          ? `sifting UP from slot ${phase.index} — parent lives at ⌊(i−1)/2⌋`
          : phase.kind === 'siftDown'
            ? `sifting DOWN from slot ${phase.index} — children live at 2i+1 and 2i+2`
            : 'the invariant holds everywhere'}
      </p>
      <ServedStrip />
    </div>
  );
}

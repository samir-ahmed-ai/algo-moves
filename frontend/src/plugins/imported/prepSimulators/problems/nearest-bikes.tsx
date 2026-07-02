import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface NearestBikesInput {
  grid: string[]; // each string is one row; 'X' = bike, 'Y' = worker, '.' = empty
}

interface Cell {
  r: number;
  c: number;
}

interface NearestBikesState {
  grid: string[][]; // row-major chars
  bikes: Cell[]; // collected bike positions
  workers: Cell[]; // collected worker positions
  scanned: boolean; // collection pass finished?
  cursor: Cell | null; // cell being collected during the scan pass
  worker: Cell | null; // worker under comparison
  bike: Cell | null; // bike under comparison
  pairDist: number | null; // |dr|+|dc| for the current pair
  best: number | null; // running minimum over all pairs (null = +inf)
  done: boolean;
}

const INF = Number.POSITIVE_INFINITY;

function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function record({ grid: rows }: NearestBikesInput): Frame<NearestBikesState>[] {
  const grid = rows.map((row) => row.split(''));
  const bikes: Cell[] = [];
  const workers: Cell[] = [];

  const { emit, frames } = createRecorder<NearestBikesState>(() => ({
        grid,
        bikes: bikes.map((b) => ({ ...b })),
        workers: workers.map((w) => ({ ...w })),
        scanned: false,
        cursor: null,
        worker: null,
        bike: null,
        pairDist: null,
        best: null,
        done: false
      }));

  emit(
    'INIT',
    'collect X/Y',
    `Nearest bikes: every 'X' is a bike and every 'Y' is a worker. We want the smallest Manhattan distance |Δr| + |Δc| over every worker-bike pair. First pass: scan the grid to collect all bike and worker cells.`,
    {},
  );

  // Pass 1 — collect bikes ('X') and workers ('Y').
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === 'X') {
        bikes.push({ r, c });
        emit(
          'BIKE',
          `bike (${r},${c})`,
          `Found a bike 'X' at (${r}, ${c}). Add it to the bikes list (now ${bikes.length}).`,
          { cursor: { r, c } },
        );
      } else if (ch === 'Y') {
        workers.push({ r, c });
        emit(
          'WORKER',
          `worker (${r},${c})`,
          `Found a worker 'Y' at (${r}, ${c}). Add it to the workers list (now ${workers.length}).`,
          { cursor: { r, c } },
        );
      }
    }
  }

  emit(
    'SCANNED',
    `${workers.length}W ${bikes.length}B`,
    `Scan complete: ${workers.length} worker(s) and ${bikes.length} bike(s) collected. Now compare every worker against every bike and keep the smallest distance.`,
    { scanned: true },
  );

  // Pass 2 — brute-force every worker-bike pair, tracking the running minimum.
  let best = INF;
  for (const w of workers) {
    for (const b of bikes) {
      const d = manhattan(w, b);
      const bestBefore = best === INF ? null : best;
      if (d < best) {
        best = d;
        emit(
          'IMPROVE',
          `best=${d}`,
          `Worker (${w.r}, ${w.c}) to bike (${b.r}, ${b.c}): |${w.r}−${b.r}| + |${w.c}−${b.c}| = ${d}. That beats the previous best (${bestBefore === null ? '+∞' : bestBefore}), so best becomes ${d}.`,
          { scanned: true, worker: { ...w }, bike: { ...b }, pairDist: d, best },
          'good',
        );
      } else {
        emit(
          'PAIR',
          `d=${d}`,
          `Worker (${w.r}, ${w.c}) to bike (${b.r}, ${b.c}): |${w.r}−${b.r}| + |${w.c}−${b.c}| = ${d}. That is not less than the current best (${best}), so best stays ${best}.`,
          { scanned: true, worker: { ...w }, bike: { ...b }, pairDist: d, best },
        );
      }
    }
  }

  const answer = best === INF ? -1 : best;
  emit(
    'DONE',
    `answer=${answer}`,
    `Every worker-bike pair has been compared. The minimum Manhattan distance is ${answer === -1 ? 'undefined (missing workers or bikes)' : answer}.`,
    { scanned: true, best: best === INF ? null : best, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<NearestBikesState>) {
  const s = frame.state;

  const sameCell = (cell: Cell | null, r: number, c: number) =>
    cell !== null && cell.r === r && cell.c === c;

  const cellTone = (r: number, c: number): string => {
    const ch = s.grid[r][c];
    // Pair-comparison highlights take priority once scanning is done.
    if (sameCell(s.worker, r, c)) return 'active';
    if (sameCell(s.bike, r, c)) return 'path';
    if (ch === 'Y') return 'fill';
    if (ch === 'X') return 'land';
    return 'water';
  };

  const active: [number, number] | null = s.cursor
    ? [s.cursor.r, s.cursor.c]
    : s.worker
      ? [s.worker.r, s.worker.c]
      : null;

  const bestLabel = s.best === null ? (s.scanned ? '+∞' : '—') : s.best;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        workers <span className="font-mono text-ink">{s.workers.length}</span>
        {' · '}bikes <span className="font-mono text-ink">{s.bikes.length}</span>
        {' · '}best <span className="font-mono text-ink">{bestLabel}</span>
        {s.pairDist !== null && (
          <>
            {' · '}pair d ={' '}
            <span className="font-mono text-ink">{s.pairDist}</span>
          </>
        )}
      </div>
      <GridBoard grid={s.grid} cellTone={cellTone} active={active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        Y = worker · X = bike · |Δr| + |Δc| = Manhattan distance
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → nearest = {s.best === null ? -1 : s.best}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<NearestBikesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cellStr = (cell: Cell | null) => (cell ? `(${cell.r}, ${cell.c})` : '—');
  return (
    <VarGrid>
      <InspectorRow k="workers" v={s.workers.length} />
      <InspectorRow k="bikes" v={s.bikes.length} />
      <InspectorRow k="worker" v={cellStr(s.worker)} />
      <InspectorRow k="bike" v={cellStr(s.bike)} />
      <InspectorRow k="pair dist" v={s.pairDist ?? '—'} />
      <InspectorRow k="best" v={s.best === null ? (s.scanned ? '+∞' : '—') : s.best} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-nearest-bikes';
export const title = 'Nearest bikes';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'nb1',
      label: '4×4 · two bikes',
      value: {
        grid: [
          '....',
          '.Y..',
          '...X',
          'X...',
        ],
      },
    },
    {
      id: 'nb2',
      label: '3×4 · adjacent',
      value: {
        grid: [
          'Y..X',
          '....',
          'X.Y.',
        ],
      },
    },
  ] satisfies SampleInput<NearestBikesInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as NearestBikesState | undefined;
    if (!s || s.best === null) return { ok: false, label: 'no pair' };
    return { ok: true, label: `nearest = ${s.best}` };
  },
};

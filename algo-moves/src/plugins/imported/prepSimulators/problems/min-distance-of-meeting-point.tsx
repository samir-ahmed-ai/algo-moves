import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MeetInput {
  grid: number[][];
}

type Axis = 'rows' | 'cols';

interface MeetState {
  grid: number[][];
  rows: number; // grid height
  cols: number; // grid width
  people: [number, number][]; // (r,c) of every 1-cell
  axis: Axis | null; // which 1-D sweep is running
  sorted: number[]; // the sorted coords for the current axis
  lo: number | null; // two-pointer low index into `sorted`
  hi: number | null; // two-pointer high index into `sorted`
  loCoord: number | null; // sorted[lo] (the coordinate value at lo)
  hiCoord: number | null; // sorted[hi] (the coordinate value at hi)
  pairCost: number | null; // min*(hi-lo) added this step
  rowDist: number; // running distance accumulated on the row axis
  colDist: number; // running distance accumulated on the col axis
  median: number | null; // median coord on the current axis (meeting line)
  done: boolean;
}

// Faithful re-implementation of minDist1D from the Go solution, but emitting a
// frame at each two-pointer step so the sweep can be animated.
function record({ grid }: MeetInput): Frame<MeetState>[] {  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  // Collect every 1-cell, mirroring the row/col append loop in Go.
  const people: [number, number][] = [];
  const rowCoords: number[] = [];
  const colCoords: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) {
        people.push([r, c]);
        rowCoords.push(r);
        colCoords.push(c);
      }
    }
  }

  let rowDist = 0;
  let colDist = 0;

  const { emit, frames } = createRecorder<MeetState>(() => ({
        grid,
        rows,
        cols,
        people,
        axis: null,
        sorted: [],
        lo: null,
        hi: null,
        loCoord: null,
        hiCoord: null,
        pairCost: null,
        rowDist,
        colDist,
        median: null,
        done: false
      }));

  emit(
    'INIT',
    `${people.length} people`,
    `Every 1-cell is a person who must walk (Manhattan steps) to one shared meeting cell. Manhattan distance splits cleanly: total cost = (cost along rows) + (cost along columns), so we solve each axis independently. There are ${people.length} people on this ${rows}×${cols} grid.`,
    {},
  );

  // Run minDist1D on one axis, emitting a frame per two-pointer contraction.
  const sweep = (axis: Axis, coords: number[]) => {
    const a = coords.slice().sort((x, y) => x - y);
    const axisName = axis === 'rows' ? 'row' : 'column';
    const median = a.length ? a[Math.floor((a.length - 1) / 2)] : null;

    emit(
      'SORT',
      `sort ${axisName}s`,
      `Project each person onto the ${axisName} axis and sort those coordinates: [${a.join(', ')}]. The cost-minimizing meeting line on a single axis is the median, and we can total the cost with two pointers without ever computing it explicitly.`,
      { axis, sorted: a, median },
    );

    let lo = 0;
    let hi = a.length - 1;
    let dist = 0;
    while (lo < hi) {
      // mn = min(a[lo], a[hi]); both are >=0 distances from a shared origin,
      // and pairing the outermost two contributes mn*(hi-lo) toward the median.
      const mn = a[lo] < a[hi] ? a[lo] : a[hi];
      const pairCost = mn * (hi - lo);
      dist += pairCost;
      if (axis === 'rows') rowDist = dist;
      else colDist = dist;

      emit(
        'PINCH',
        `+${pairCost}`,
        `Pair the outermost ${axisName}s a[lo]=${a[lo]} and a[hi]=${a[hi]}. Sliding everyone in this span of ${hi - lo} gaps toward the center closes min(${a[lo]}, ${a[hi]})=${mn} on each gap, adding ${mn}×${hi - lo}=${pairCost}. Running ${axisName} distance = ${dist}.`,
        { axis, sorted: a, lo, hi, loCoord: a[lo], hiCoord: a[hi], pairCost, median },
      );

      // Advance whichever pointer(s) matched the min — identical to the Go code.
      if (a[lo] === mn) lo++;
      if (a[hi] === mn) hi--;
    }

    emit(
      'AXIS-DONE',
      `${axisName} = ${dist}`,
      `The two pointers met, so the ${axisName} axis is fully accounted for: total ${axisName} travel = ${dist}. Everyone meeting at ${axisName} ${median} achieves this minimum.`,
      { axis, sorted: a, median, [axis === 'rows' ? 'rowDist' : 'colDist']: dist },
      'good',
    );
  };

  sweep('rows', rowCoords);
  sweep('cols', colCoords);

  const total = rowDist + colDist;
  emit(
    'DONE',
    `min = ${total}`,
    `Add the two axes: minimum total distance = rowDist (${rowDist}) + colDist (${colDist}) = ${total}. The best meeting point is (median row, median column). Time O(n log n) per axis, space O(n).`,
    { done: true, median: null },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MeetState>) {
  const s = frame.state;

  // Mark the two cells the active pointers correspond to (any person on that
  // row/col line), plus the median meeting line, plus all people.
  const onLo = (r: number, c: number) =>
    s.axis === 'rows' ? r === s.loCoord : s.axis === 'cols' ? c === s.loCoord : false;
  const onHi = (r: number, c: number) =>
    s.axis === 'rows' ? r === s.hiCoord : s.axis === 'cols' ? c === s.hiCoord : false;
  const onMedian = (r: number, c: number) =>
    s.median === null ? false : s.axis === 'rows' ? r === s.median : s.axis === 'cols' ? c === s.median : false;

  const isPerson = (r: number, c: number) => s.grid[r][c] === 1;

  const tone = (r: number, c: number): string => {
    if (onLo(r, c) || onHi(r, c)) return isPerson(r, c) ? 'path' : 'active';
    if (onMedian(r, c)) return 'fill';
    if (isPerson(r, c)) return 'land';
    return 'water';
  };

  const label = (r: number, c: number) => (s.grid[r][c] === 1 ? '1' : '0');

  const total = s.rowDist + s.colDist;
  const axisLabel = s.axis === 'rows' ? 'row' : s.axis === 'cols' ? 'column' : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.done ? (
          <>
            min total distance ={' '}
            <span className="font-mono text-good">{total}</span>
          </>
        ) : axisLabel ? (
          <>
            sweeping <span className="font-mono text-ink">{axisLabel}</span> axis
            {s.median !== null && (
              <>
                {' · median '}
                {axisLabel} = <span className="font-mono text-ink">{s.median}</span>
              </>
            )}
          </>
        ) : (
          <>1 = person, 0 = empty</>
        )}
      </div>
      <GridBoard grid={s.grid} cellTone={tone} label={label} active={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        rowDist = <span className="text-ink">{s.rowDist}</span> · colDist ={' '}
        <span className="text-ink">{s.colDist}</span>
        {s.sorted.length > 0 && !s.done && (
          <>
            {' · sorted ['}
            {s.sorted.map((v, i) => (
              <span
                key={i}
                className={cn(
                  i === s.lo || i === s.hi ? 'text-accent' : 'text-ink3',
                )}
              >
                {v}
                {i < s.sorted.length - 1 ? ',' : ''}
              </span>
            ))}
            {']'}
          </>
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MeetState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const total = s.rowDist + s.colDist;
  return (
    <VarGrid>
      <InspectorRow k="people (1-cells)" v={s.people.length} />
      <InspectorRow k="axis" v={s.axis ?? '—'} />
      <InspectorRow k="lo / hi" v={s.lo !== null && s.hi !== null ? `${s.lo} / ${s.hi}` : '—'} />
      <InspectorRow
        k="a[lo] / a[hi]"
        v={s.loCoord !== null && s.hiCoord !== null ? `${s.loCoord} / ${s.hiCoord}` : '—'}
      />
      <InspectorRow k="pair cost" v={s.pairCost ?? '—'} />
      <InspectorRow k="median" v={s.median ?? '—'} />
      <InspectorRow k="rowDist" v={s.rowDist} />
      <InspectorRow k="colDist" v={s.colDist} />
      <InspectorRow k="total" v={s.done ? total : '…'} />
    </VarGrid>
  );
}

// Compute the real answer (sum of the two 1-D median costs) for the verdict.
function solve(grid: number[][]): number {
  const rowCoords: number[] = [];
  const colCoords: number[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      if (grid[r][c] === 1) {
        rowCoords.push(r);
        colCoords.push(c);
      }
    }
  }
  const oneD = (coords: number[]): number => {
    const a = coords.slice().sort((x, y) => x - y);
    let lo = 0;
    let hi = a.length - 1;
    let dist = 0;
    while (lo < hi) {
      const mn = a[lo] < a[hi] ? a[lo] : a[hi];
      dist += mn * (hi - lo);
      if (a[lo] === mn) lo++;
      if (a[hi] === mn) hi--;
    }
    return dist;
  };
  return oneD(rowCoords) + oneD(colCoords);
}

export const manifestId = 'prep-matrices-min-distance-of-meeting-point';
export const title = 'Min distance of meeting point';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'md1',
      label: '3×3, three people',
      value: {
        grid: [
          [1, 0, 0],
          [0, 0, 1],
          [0, 1, 0],
        ],
      },
    },
    {
      id: 'md2',
      label: '4×4, four people',
      value: {
        grid: [
          [1, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 1],
          [1, 0, 1, 0],
        ],
      },
    },
  ] satisfies SampleInput<MeetInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MeetState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const total = solve(s.grid);
    return { ok: true, label: `min distance = ${total}` };
  },
};

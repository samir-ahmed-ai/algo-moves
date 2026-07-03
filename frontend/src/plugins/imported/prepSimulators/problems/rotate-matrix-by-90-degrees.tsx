import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/board/GridBoard';

interface RotateInput {
  mat: number[][];
}

type Cell = [number, number]; // [row, col]

interface RotateState {
  mat: number[][];
  n: number;
  ring: number | null; // which layer (i) we are rotating
  j: number | null; // offset within the ring
  corners: Cell[]; // the 4 cells of the current 4-cycle (top,left,bottom,right order)
  active: Cell | null; // cell being written this step
  source: Cell | null; // cell the value is coming from
  done: boolean;
}

// Faithful re-implementation of the Go solution's 4-corner cyclic swap.
// Per ring, for each offset j: top <- left <- bottom <- right <- tmp(top).
function record({ mat }: RotateInput): Frame<RotateState>[] {
  const n = mat.length;
  const grid = mat.map((row) => row.slice());
  const { emit, frames } = createRecorder<RotateState>(() => ({
        mat: grid.map((row) => row.slice()),
        n,
        ring: null,
        j: null,
        corners: [],
        active: null,
        source: null,
        done: false
      }));

  emit(
    'INIT',
    `n=${n}`,
    `Rotate the ${n}×${n} matrix 90° clockwise in place. We peel it ring by ring; within each ring a single temp lets us cycle four cells at a time (top ← left ← bottom ← right ← saved top).`,
    {},
  );

  for (let i = 0; i < Math.floor(n / 2); i++) {
    emit(
      'RING',
      `ring ${i}`,
      `Start ring ${i} — the cells exactly ${i} step(s) in from the border. Every cell on this ring belongs to some 4-corner cycle.`,
      { ring: i },
    );

    for (let j = i; j < n - i - 1; j++) {
      const top: Cell = [i, j];
      const left: Cell = [n - j - 1, i];
      const bottom: Cell = [n - i - 1, n - j - 1];
      const right: Cell = [j, n - i - 1];
      const corners: Cell[] = [top, left, bottom, right];

      const tmp = grid[i][j];
      emit(
        'SAVE',
        `tmp=${tmp}`,
        `Pick a 4-cycle on ring ${i} (offset j=${j}). Save the top value tmp = mat[${i}][${j}] = ${tmp} so it is not lost when we overwrite it.`,
        { ring: i, j, corners, active: top, source: top },
      );

      // top <- left
      grid[i][j] = grid[n - j - 1][i];
      emit(
        'MOVE',
        `top←left`,
        `Top gets the left value: mat[${i}][${j}] ← mat[${n - j - 1}][${i}] = ${grid[i][j]}.`,
        { ring: i, j, corners, active: top, source: left },
      );

      // left <- bottom
      grid[n - j - 1][i] = grid[n - i - 1][n - j - 1];
      emit(
        'MOVE',
        `left←bottom`,
        `Left gets the bottom value: mat[${n - j - 1}][${i}] ← mat[${n - i - 1}][${n - j - 1}] = ${grid[n - j - 1][i]}.`,
        { ring: i, j, corners, active: left, source: bottom },
      );

      // bottom <- right
      grid[n - i - 1][n - j - 1] = grid[j][n - i - 1];
      emit(
        'MOVE',
        `bottom←right`,
        `Bottom gets the right value: mat[${n - i - 1}][${n - j - 1}] ← mat[${j}][${n - i - 1}] = ${grid[n - i - 1][n - j - 1]}.`,
        { ring: i, j, corners, active: bottom, source: right },
      );

      // right <- tmp
      grid[j][n - i - 1] = tmp;
      emit(
        'MOVE',
        `right←tmp`,
        `Right gets the saved top value: mat[${j}][${n - i - 1}] ← tmp = ${tmp}. The 4-cycle is complete.`,
        { ring: i, j, corners, active: right, source: top },
        'good',
      );
    }
  }

  emit(
    'DONE',
    'rotated',
    `Every ring has been cycled — the matrix is now rotated 90° clockwise. Time O(m·n), Space O(1) (only one temp used).`,
    { done: true },
    'good',
  );
  return frames;
}

function sameCell(a: Cell | null, b: Cell): boolean {
  return a !== null && a[0] === b[0] && a[1] === b[1];
}

function inCorners(corners: Cell[], r: number, c: number): boolean {
  return corners.some(([cr, cc]) => cr === r && cc === c);
}

function View({ frame }: PluginViewProps<RotateState>) {
  const s = frame.state;
  const cellTone = (r: number, c: number): string => {
    if (s.done) return 'path';
    if (sameCell(s.active, [r, c])) return 'fill'; // cell being written
    if (sameCell(s.source, [r, c])) return 'active'; // where the value comes from
    if (inCorners(s.corners, r, c)) return 'visited'; // the rest of this 4-cycle
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>
        {s.ring !== null && !s.done && (
          <>
            {' · '}ring <span className="font-mono text-ink">{s.ring}</span>
            {s.j !== null && (
              <>
                {' · '}j <span className="font-mono text-ink">{s.j}</span>
              </>
            )}
          </>
        )}
        {s.done && <>{' · '}<span className="font-mono text-good">rotated</span></>}
      </div>
      <GridBoard grid={s.mat} active={s.active} cellTone={cellTone} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        per ring: top ← left ← bottom ← right ← tmp
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RotateState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const fmt = (cell: Cell | null) => (cell ? `[${cell[0]},${cell[1]}]` : '—');
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="ring (i)" v={s.ring ?? '—'} />
      <InspectorRow k="offset (j)" v={s.j ?? '—'} />
      <InspectorRow k="writing →" v={fmt(s.active)} />
      <InspectorRow k="reading ←" v={fmt(s.source)} />
      <InspectorRow k="status" v={s.done ? 'rotated' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-rotate-matrix-by-90-degrees';
export const title = 'Rotate matrix by 90 degrees';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'rm4',
      label: '4×4',
      value: {
        mat: [
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [9, 10, 11, 12],
          [13, 14, 15, 16],
        ],
      },
    },
    {
      id: 'rm3',
      label: '3×3',
      value: {
        mat: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      },
    },
  ] satisfies SampleInput<RotateInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RotateState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    return { ok: true, label: `${s.n}×${s.n} rotated 90°` };
  },
};

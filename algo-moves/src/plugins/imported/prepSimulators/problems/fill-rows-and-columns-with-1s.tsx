import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FillInput {
  mat: number[][];
}

type Phase = 'init' | 'scan-row0' | 'scan-col0' | 'mark' | 'apply' | 'borders' | 'done';

interface FillState {
  mat: number[][]; // current matrix snapshot
  m: number;
  n: number;
  phase: Phase;
  row0: boolean; // does the original first row contain a 1?
  col0: boolean; // does the original first column contain a 1?
  active: [number, number] | null; // cell being looked at this step
  marked: [number, number][]; // marker cells written into row0/col0 during the mark pass
  filled: [number, number][]; // interior cells turned to 1 during the apply pass
  border: [number, number][]; // border cells restored to 1 during the borders pass
  done: boolean;
}

function clone(mat: number[][]): number[][] {
  return mat.map((row) => row.slice());
}

function record({ mat: input }: FillInput): Frame<FillState>[] {
  const mat = clone(input);
  const m = mat.length;
  const n = m > 0 ? mat[0].length : 0;
  const frames: Frame<FillState>[] = [];

  let row0 = false;
  let col0 = false;
  const marked: [number, number][] = [];
  const filled: [number, number][] = [];
  const border: [number, number][] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    phase: Phase,
    active: [number, number] | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        mat: clone(mat),
        m,
        n,
        phase,
        row0,
        col0,
        active,
        marked: marked.map((p) => [p[0], p[1]] as [number, number]),
        filled: filled.map((p) => [p[0], p[1]] as [number, number]),
        border: border.map((p) => [p[0], p[1]] as [number, number]),
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `${m}x${n}`,
    `Goal: for every cell that holds a 1, set its whole row and whole column to 1. We do it in O(1) extra space by reusing row 0 and column 0 as marker lanes — but first we must remember whether they already contained a 1 of their own.`,
    'init',
    null,
  );

  if (m === 0 || n === 0) {
    emit('DONE', 'empty', `The matrix is empty, so there is nothing to fill.`, 'done', null, 'good');
    return frames;
  }

  // Pass 1a: flag whether the original first row has a 1.
  for (let j = 0; j < n; j++) {
    if (mat[0][j] === 1) row0 = true;
    emit(
      'SCAN_ROW0',
      `row0=${row0}`,
      `Scanning the first row to record its own state before we overwrite it. mat[0][${j}] = ${mat[0][j]}. row0 is now ${row0}${row0 ? ' — the top row already had a 1, so we must rebuild it fully at the end.' : '.'}`,
      'scan-row0',
      [0, j],
    );
  }

  // Pass 1b: flag whether the original first column has a 1.
  for (let i = 0; i < m; i++) {
    if (mat[i][0] === 1) col0 = true;
    emit(
      'SCAN_COL0',
      `col0=${col0}`,
      `Scanning the first column to record its own state before we overwrite it. mat[${i}][0] = ${mat[i][0]}. col0 is now ${col0}${col0 ? ' — the left column already had a 1, so we must rebuild it fully at the end.' : '.'}`,
      'scan-col0',
      [i, 0],
    );
  }

  // Pass 2: mark from the interior. A 1 at (i,j) records itself in row0 and col0.
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      if (mat[i][j] === 1) {
        mat[i][0] = 1;
        mat[0][j] = 1;
        marked.push([i, 0]);
        marked.push([0, j]);
        emit(
          'MARK',
          `mark ${i},${j}`,
          `Interior cell mat[${i}][${j}] = 1, so this row and column must become all 1s. We record that by setting the markers mat[${i}][0] = 1 and mat[0][${j}] = 1 in the marker lanes.`,
          'mark',
          [i, j],
        );
      } else {
        emit(
          'MARK',
          `skip ${i},${j}`,
          `Interior cell mat[${i}][${j}] = 0 — nothing to mark for this cell.`,
          'mark',
          [i, j],
        );
      }
    }
  }

  // Pass 3: apply markers to the interior.
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      if (mat[i][0] === 1 || mat[0][j] === 1) {
        const already = mat[i][j] === 1;
        mat[i][j] = 1;
        if (!already) filled.push([i, j]);
        emit(
          'APPLY',
          `fill ${i},${j}`,
          `mat[${i}][0] = ${mat[i][0]} or mat[0][${j}] = ${mat[0][j]} flags this cell, so set mat[${i}][${j}] = 1${already ? ' (it was already 1).' : '.'}`,
          'apply',
          [i, j],
        );
      } else {
        emit(
          'APPLY',
          `keep ${i},${j}`,
          `Neither marker fires for mat[${i}][${j}] (row marker ${mat[i][0]}, column marker ${mat[0][j]}), so it stays 0.`,
          'apply',
          [i, j],
        );
      }
    }
  }

  // Pass 4: restore the borders using the flags we saved up front.
  if (row0) {
    for (let j = 0; j < n; j++) {
      const already = mat[0][j] === 1;
      mat[0][j] = 1;
      if (!already) border.push([0, j]);
      emit(
        'BORDER',
        `row0 ${j}`,
        `Because the original top row contained a 1 (row0 = true), the entire first row becomes 1: set mat[0][${j}] = 1.`,
        'borders',
        [0, j],
      );
    }
  }
  if (col0) {
    for (let i = 0; i < m; i++) {
      const already = mat[i][0] === 1;
      mat[i][0] = 1;
      if (!already) border.push([i, 0]);
      emit(
        'BORDER',
        `col0 ${i}`,
        `Because the original left column contained a 1 (col0 = true), the entire first column becomes 1: set mat[${i}][0] = 1.`,
        'borders',
        [i, 0],
      );
    }
  }

  const ones = mat.reduce((acc, row) => acc + row.reduce((a, v) => a + v, 0), 0);
  emit(
    'DONE',
    `${ones} ones`,
    `Every row and column that originally held a 1 is now completely filled, using only row 0 and column 0 as scratch space. The matrix now has ${ones} ones.`,
    'done',
    null,
    'good',
  );
  return frames;
}

function inList(list: [number, number][], r: number, c: number): boolean {
  return list.some((p) => p[0] === r && p[1] === c);
}

function View({ frame }: PluginViewProps<FillState>) {
  const s = frame.state;
  const isMarker = (r: number, c: number) => r === 0 || c === 0;
  const cellTone = (r: number, c: number): string => {
    if (s.active && s.active[0] === r && s.active[1] === c) return 'active';
    if (s.phase === 'borders' && inList(s.border, r, c)) return 'path';
    if (s.phase === 'apply' && inList(s.filled, r, c)) return 'fill';
    if ((s.phase === 'mark' || s.phase === 'apply') && inList(s.marked, r, c)) return 'visited';
    if (s.mat[r][c] === 1) return 'land';
    if (isMarker(r, c)) return 'water';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        phase = <span className="font-mono text-ink">{s.phase}</span>
        {' · '}row0 = <span className="font-mono text-ink">{String(s.row0)}</span>
        {' · '}col0 = <span className="font-mono text-ink">{String(s.col0)}</span>
      </div>
      <GridBoard grid={s.mat} cellTone={cellTone} active={s.active} />
      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>
        row 0 &amp; col 0 are the marker lanes; land = 1, water = 0
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FillState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="size (m × n)" v={`${s.m} × ${s.n}`} />
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="row0 flag" v={String(s.row0)} />
      <InspectorRow k="col0 flag" v={String(s.col0)} />
      <InspectorRow k="active cell" v={s.active ? `[${s.active.join(', ')}]` : '—'} />
      <InspectorRow k="markers set" v={s.marked.length} />
      <InspectorRow k="interior filled" v={s.filled.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-fill-rows-and-columns-with-1s';
export const title = 'Fill rows and columns with 1s';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'fr1',
      label: '3×3 single 1',
      value: {
        mat: [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ],
      },
    },
    {
      id: 'fr2',
      label: '4×4 two 1s',
      value: {
        mat: [
          [0, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 0, 1],
          [0, 0, 0, 0],
        ],
      },
    },
  ] satisfies SampleInput<FillInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FillState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const ones = s.mat.reduce((acc, row) => acc + row.reduce((a, v) => a + v, 0), 0);
    return { ok: true, label: `${ones} ones` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/GridBoard';

interface MatrixInput {
  mat: number[][];
  key: number;
}

interface MatrixState {
  mat: number[][];
  key: number;
  i: number | null; // current row
  j: number | null; // current column
  cur: number | null; // mat[i][j] under inspection
  visited: [number, number][]; // cells the walk has already touched
  result: [number, number] | null; // answer cell, or null when not found
  done: boolean;
}

function record({ mat, key }: MatrixInput): Frame<MatrixState>[] {  const visited: [number, number][] = [];

  const { emit, frames } = createRecorder<MatrixState>(() => ({
        mat,
        key,
        i: null,
        j: null,
        cur: null,
        visited: visited.map((p): [number, number] => [p[0], p[1]]),
        result: null,
        done: false
      }));

  if (mat.length === 0) {
    emit('DONE', 'empty', `The matrix is empty, so the key ${key} cannot be present. Return [-1, -1].`, { done: true }, 'bad');
    return frames;
  }

  let i = 0;
  let j = mat[0].length - 1;

  emit(
    'INIT',
    `key=${key}`,
    `Staircase search: each row is sorted left→right and each column top→bottom. Start at the top-right corner (i=0, j=${j}) — the only cell that is both the largest in its row and the smallest in its column, which makes every comparison decisive.`,
    { i, j, cur: mat[i][j] },
  );

  while (i < mat.length && j >= 0) {
    const cur = mat[i][j];
    emit(
      'LOOK',
      `mat[${i}][${j}]=${cur}`,
      `Inspect the corner cell mat[${i}][${j}] = ${cur} and compare it with the key ${key}.`,
      { i, j, cur },
    );

    if (cur === key) {
      emit(
        'FOUND',
        `${i},${j}`,
        `mat[${i}][${j}] = ${cur} equals the key. The key is found at row ${i}, column ${j}. Return [${i}, ${j}].`,
        { i, j, cur, result: [i, j], done: true },
        'good',
      );
      return frames;
    }

    visited.push([i, j]);

    if (cur > key) {
      emit(
        'LEFT',
        `j-- → ${j - 1}`,
        `${cur} > ${key}, so this whole column is too big at and above this corner — everything below in column ${j} is even larger. Discard the column and move left: j becomes ${j - 1}.`,
        { i, j, cur },
      );
      j--;
    } else {
      emit(
        'DOWN',
        `i++ → ${i + 1}`,
        `${cur} < ${key}, so this whole row is too small from this corner leftward — everything to the left in row ${i} is even smaller. Discard the row and move down: i becomes ${i + 1}.`,
        { i, j, cur },
      );
      i++;
    }
  }

  emit(
    'DONE',
    'not found',
    `The walk stepped off the matrix (i=${i}, j=${j}) without matching, so the key ${key} is not present. Return [-1, -1].`,
    { i: i < mat.length ? i : null, j: j >= 0 ? j : null, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MatrixState>) {
  const s = frame.state;
  const isVisited = (r: number, c: number) => s.visited.some((p) => p[0] === r && p[1] === c);
  const cellTone = (r: number, c: number): string => {
    if (s.result && s.result[0] === r && s.result[1] === c) return 'path';
    if (s.i === r && s.j === c && !s.done) return 'active';
    if (isVisited(r, c)) return 'visited';
    return '';
  };
  const active: [number, number] | null =
    s.i !== null && s.j !== null && !s.done ? [s.i, s.j] : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        key = <span className="font-mono text-ink">{s.key}</span>
        {s.cur !== null && !s.done && (
          <>
            {' · '}corner ={' '}
            <span className="font-mono text-ink">{s.cur}</span>
          </>
        )}
      </div>
      {s.mat.length === 0 ? (
        <VizEmpty message="empty matrix" />
      ) : (
        <GridBoard grid={s.mat} cellTone={cellTone} active={active} />
      )}
      {s.result ? (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → [{s.result[0]}, {s.result[1]}]
        </div>
      ) : s.done ? (
        <div className={cn('mt-1 font-mono text-bad', vizText.base)}>→ [-1, -1]</div>
      ) : null}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MatrixState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cmp =
    s.cur === null || s.done ? '—' : s.cur === s.key ? '= key' : s.cur > s.key ? '> key' : '< key';
  return (
    <VarGrid>
      <InspectorRow k="key" v={s.key} />
      <InspectorRow k="i (row)" v={s.i ?? '—'} />
      <InspectorRow k="j (col)" v={s.j ?? '—'} />
      <InspectorRow k="mat[i][j]" v={s.cur ?? '—'} />
      <InspectorRow k="vs key" v={cmp} />
      <InspectorRow
        k="result"
        v={s.result ? `[${s.result.join(', ')}]` : s.done ? '[-1, -1]' : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-search-in-sorted-matrix';
export const title = 'Search in sorted matrix';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'ssm1',
      label: 'find 29',
      value: {
        mat: [
          [1, 4, 7, 11],
          [8, 9, 16, 22],
          [10, 13, 29, 30],
          [21, 27, 33, 34],
        ],
        key: 29,
      },
    },
    {
      id: 'ssm2',
      label: 'find 5 (absent)',
      value: {
        mat: [
          [1, 4, 7, 11],
          [8, 9, 16, 22],
          [10, 13, 29, 30],
          [21, 27, 33, 34],
        ],
        key: 5,
      },
    },
  ] satisfies SampleInput<MatrixInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MatrixState | undefined;
    return s?.result
      ? { ok: true, label: `[${s.result.join(',')}]` }
      : { ok: false, label: '[-1,-1]' };
  },
};

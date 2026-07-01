import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RsqInput {
  matrix: number[][];
  row1: number;
  col1: number;
  row2: number;
  col2: number;
}

interface RsqState {
  matrix: number[][];
  // pre is (m+1)×(n+1); pre[i][j] = sum of the matrix rectangle [0..i)×[0..j). null = not yet filled.
  pre: (number | null)[][];
  cur: [number, number] | null; // active prefix cell (in pre coords)
  corners: { cell: [number, number]; sign: 1 | -1 }[]; // query inclusion-exclusion corners
  query: { row1: number; col1: number; row2: number; col2: number };
  answer: number | null;
  done: boolean;
}

function record({ matrix, row1, col1, row2, col2 }: RsqInput): Frame<RsqState>[] {
  const m = matrix.length;
  const n = matrix[0].length;
  const pre: (number | null)[][] = Array.from({ length: m + 1 }, () => new Array<number | null>(n + 1).fill(null));
  const query = { row1, col1, row2, col2 };
  const frames: Frame<RsqState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    corners: { cell: [number, number]; sign: 1 | -1 }[],
    answer: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { matrix, pre: pre.map((r) => r.slice()), cur, corners, query, answer, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `${m}×${n} matrix`,
    `Range Sum Query 2D: build a (${m + 1}×${n + 1}) prefix-sum table where pre[i][j] is the sum of every matrix cell in rows 0..${'<'}${'i'} and cols 0..${'<'}${'j'}. The padded zero row and column make the recurrence clean.`,
    null,
    [],
    null,
  );

  // Zero-padding row and column.
  for (let j = 0; j <= n; j++) pre[0][j] = 0;
  for (let i = 0; i <= m; i++) pre[i][0] = 0;
  emit(
    'BASE',
    `border = 0`,
    `Base case: every cell in row 0 and column 0 of the prefix table is 0 — an empty rectangle sums to 0.`,
    null,
    [],
    null,
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cell = matrix[i - 1][j - 1];
      const top = pre[i - 1][j] as number;
      const left = pre[i][j - 1] as number;
      const diag = pre[i - 1][j - 1] as number;
      pre[i][j] = cell + top + left - diag;
      emit(
        'FILL',
        `pre[${i}][${j}]=${pre[i][j]}`,
        `pre[${i}][${j}] = matrix[${i - 1}][${j - 1}](${cell}) + pre[${i - 1}][${j}](${top}) + pre[${i}][${j - 1}](${left}) − pre[${i - 1}][${j - 1}](${diag}) = ${pre[i][j]}.`,
        [i, j],
        [],
        null,
      );
    }
  }

  emit(
    'FULL',
    `table done`,
    `The prefix-sum table is complete. Any rectangle sum is now an O(1) query via inclusion-exclusion. Let us query sumRegion(${row1}, ${col1}, ${row2}, ${col2}).`,
    null,
    [],
    null,
  );

  // Inclusion-exclusion corners (in pre coordinates).
  const A: [number, number] = [row2 + 1, col2 + 1]; // +
  const B: [number, number] = [row1, col2 + 1]; // -
  const C: [number, number] = [row2 + 1, col1]; // -
  const D: [number, number] = [row1, col1]; // +
  const vA = pre[A[0]][A[1]] as number;
  const vB = pre[B[0]][B[1]] as number;
  const vC = pre[C[0]][C[1]] as number;
  const vD = pre[D[0]][D[1]] as number;
  const all: { cell: [number, number]; sign: 1 | -1 }[] = [
    { cell: A, sign: 1 },
    { cell: B, sign: -1 },
    { cell: C, sign: -1 },
    { cell: D, sign: 1 },
  ];

  emit(
    'QUERY',
    `+pre[${A[0]}][${A[1]}]=${vA}`,
    `Start with the big rectangle pre[${A[0]}][${A[1]}] = ${vA}: the sum of everything from the origin to the bottom-right corner of the query.`,
    A,
    [all[0]],
    null,
  );
  emit(
    'QUERY',
    `−pre[${B[0]}][${B[1]}]=${vB}`,
    `Subtract the band above the query: pre[${B[0]}][${B[1]}] = ${vB}.`,
    B,
    [all[0], all[1]],
    null,
  );
  emit(
    'QUERY',
    `−pre[${C[0]}][${C[1]}]=${vC}`,
    `Subtract the band left of the query: pre[${C[0]}][${C[1]}] = ${vC}.`,
    C,
    [all[0], all[1], all[2]],
    null,
  );
  const answer = vA - vB - vC + vD;
  emit(
    'QUERY',
    `+pre[${D[0]}][${D[1]}]=${vD}`,
    `The top-left overlap was removed twice, so add it back: pre[${D[0]}][${D[1]}] = ${vD}.`,
    D,
    all,
    null,
  );

  emit(
    'DONE',
    `sum = ${answer}`,
    `sumRegion(${row1}, ${col1}, ${row2}, ${col2}) = ${vA} − ${vB} − ${vC} + ${vD} = ${answer}.`,
    null,
    all,
    answer,
    'good',
  );
  return frames;
}

function buildDisplay(state: RsqState): (number | string)[][] {
  const m = state.matrix.length;
  const n = state.matrix[0].length;
  // +1 for the prefix index header row/col labels (0..n / 0..m).
  const display: (number | string)[][] = Array.from({ length: m + 2 }, () => new Array<number | string>(n + 2).fill(''));
  display[0][0] = 'pre';
  for (let j = 0; j <= n; j++) display[0][j + 1] = `j${j}`;
  for (let i = 0; i <= m; i++) display[i + 1][0] = `i${i}`;
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      const v = state.pre[i][j];
      display[i + 1][j + 1] = v === null ? '' : v;
    }
  }
  return display;
}

function View({ frame }: PluginViewProps<RsqState>) {
  const s = frame.state;
  const display = buildDisplay(s);
  const displayActive: [number, number] | null = s.cur ? [s.cur[0] + 1, s.cur[1] + 1] : null;
  const cornerMap = new Map<string, 1 | -1>();
  for (const { cell, sign } of s.corners) cornerMap.set(`${cell[0]},${cell[1]}`, sign);
  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'land';
    const sign = cornerMap.get(`${r - 1},${c - 1}`);
    if (sign !== undefined) return sign === 1 ? 'path' : 'active';
    if (s.cur && s.cur[0] + 1 === r && s.cur[1] + 1 === c) return 'active';
    const v = s.pre[r - 1][c - 1];
    return v === null ? '' : 'visited';
  };
  const ans = s.answer === null ? '…building' : s.answer;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        prefix-sum table, sumRegion({s.query.row1}, {s.query.col1}, {s.query.row2}, {s.query.col2}) ={' '}
        <span className="font-mono text-ink">{ans}</span>
      </div>
      <GridBoard grid={display} cellTone={cellTone} active={displayActive} cellSize={34} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RsqState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cellVal = s.cur ? s.pre[s.cur[0]][s.cur[1]] : null;
  const cellStr = cellVal === null ? '—' : cellVal;
  const answer = s.answer === null ? '…building' : `${s.answer}`;
  return (
    <VarGrid>
      <InspectorRow k="matrix" v={`${s.matrix.length}×${s.matrix[0].length}`} />
      <InspectorRow k="query" v={`(${s.query.row1},${s.query.col1})→(${s.query.row2},${s.query.col2})`} />
      <InspectorRow k="cell" v={s.cur ? `pre[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="cell value" v={cellStr} />
      <InspectorRow k="sumRegion" v={answer} />
    </VarGrid>
  );
}

export const manifestId = 'imp-81-range-sum-query-2d-immutable';
export const title = 'Range Sum Query 2D - Immutable';

export const simulator: DpSimulator = {
  inputs: [
    {
      id: 'sample',
      label: 'sumRegion(1,1,2,2)',
      value: { matrix: [[3, 0, 1, 4], [5, 6, 3, 2], [1, 2, 0, 1]], row1: 1, col1: 1, row2: 2, col2: 2 },
    },
    {
      id: 'top-left',
      label: 'sumRegion(0,0,1,1)',
      value: { matrix: [[3, 0, 1, 4], [5, 6, 3, 2], [1, 2, 0, 1]], row1: 0, col1: 0, row2: 1, col2: 1 },
    },
  ] satisfies SampleInput<RsqInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const last = frames[frames.length - 1]?.state as RsqState | undefined;
    const v = last?.answer ?? 0;
    return { ok: true, label: `sum = ${v}` };
  },
};

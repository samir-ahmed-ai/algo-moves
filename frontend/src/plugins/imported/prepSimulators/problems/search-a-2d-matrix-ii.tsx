import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface SearchInput {
  matrix: number[][];
  target: number;
}

interface SearchState {
  matrix: number[][];
  target: number;
  r: number | null; // current row
  c: number | null; // current column
  visited: [number, number][]; // cells the staircase has stepped on
  found: [number, number] | null; // cell where target was located
  result: boolean | null; // final answer (null while searching)
  done: boolean;
}

function record({ matrix, target }: SearchInput): Frame<SearchState>[] {
  const m = matrix.length;
  const n = matrix[0].length;
  const visited: [number, number][] = [];

  const { emit, frames } = createRecorder<SearchState>(() => ({
    matrix,
    target,
    r: null,
    c: null,
    visited: visited.map(([rr, cc]) => [rr, cc] as [number, number]),
    found: null,
    result: null,
    done: false,
  }));

  let r = 0;
  let c = n - 1;

  emit(
    'INIT',
    `target=${target}`,
    `Search a 2D Matrix II: every row is sorted left-to-right and every column top-to-bottom. Start at the top-right corner (${r},${c}) — the only spot that is the largest in its row and smallest in its column, which lets each comparison rule out a whole row or column.`,
    { r, c },
  );

  while (r < m && c >= 0) {
    const v = matrix[r][c];
    emit(
      'LOOK',
      `cell ${v}`,
      `Look at cell (${r},${c}) = ${v}. Compare it with the target ${target}.`,
      { r, c },
    );

    if (v === target) {
      visited.push([r, c]);
      emit(
        'FOUND',
        `at ${r},${c}`,
        `matrix[${r}][${c}] = ${v} equals the target ${target}. The value is in the matrix — return true.`,
        { r, c, found: [r, c], result: true, done: true },
        'good',
      );
      return frames;
    }

    visited.push([r, c]);
    if (v > target) {
      const nc = c - 1;
      emit(
        'LEFT',
        `${v} > ${target}`,
        `${v} is bigger than ${target}. Everything below in column ${c} is even larger, so this whole column is ruled out — slide left to column ${nc}.`,
        { r, c },
      );
      c = nc;
    } else {
      const nr = r + 1;
      emit(
        'DOWN',
        `${v} < ${target}`,
        `${v} is smaller than ${target}. Everything to the left in row ${r} is even smaller, so this whole row is ruled out — drop down to row ${nr}.`,
        { r, c },
      );
      r = nr;
    }
  }

  emit(
    'DONE',
    'not found',
    `The staircase walked off the matrix (r=${r}, c=${c}) without a match, so ${target} is not present — return false.`,
    { result: false, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SearchState>) {
  const s = frame.state;
  const isVisited = (r: number, c: number) => s.visited.some(([rr, cc]) => rr === r && cc === c);
  const cellTone = (r: number, c: number) => {
    if (s.found && s.found[0] === r && s.found[1] === c) return 'fill';
    if (s.r === r && s.c === c && !s.done) return 'active';
    if (isVisited(r, c)) return 'path';
    return '';
  };
  const active: [number, number] | null = s.r !== null && s.c !== null && !s.done ? [s.r, s.c] : null;
  const current = s.r !== null && s.c !== null ? s.matrix[s.r][s.c] : null;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="target" v={s.target} />
        <RailStat k="r" v={s.r ?? '—'} tone="accent" />
        <RailStat k="c" v={s.c ?? '—'} tone="accent" />
        <RailStat k="cell" v={current ?? '—'} />
        <RailStat k="steps" v={s.visited.length} />
      </RailGroup>
      {s.result !== null && (
        <RailResult label="found?" value={s.result ? 'true' : 'false'} tone={s.result ? 'good' : 'bad'} />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <GridBoard grid={s.matrix} cellTone={cellTone} active={active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SearchState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = s.r !== null && s.c !== null ? s.matrix[s.r][s.c] : '—';
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="r (row)" v={s.r ?? '—'} />
      <InspectorRow k="c (col)" v={s.c ?? '—'} />
      <InspectorRow k="matrix[r][c]" v={cell} />
      <InspectorRow k="steps" v={s.visited.length} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-search-a-2d-matrix-ii';
export const title = 'Search a 2D Matrix II';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sm1',
      label: 'find 5 (present)',
      value: {
        matrix: [
          [1, 4, 7, 11],
          [2, 5, 8, 12],
          [3, 6, 9, 16],
          [10, 13, 14, 17],
        ],
        target: 5,
      },
    },
    {
      id: 'sm2',
      label: 'find 15 (absent)',
      value: {
        matrix: [
          [1, 4, 7, 11],
          [2, 5, 8, 12],
          [3, 6, 9, 16],
          [10, 13, 14, 17],
        ],
        target: 15,
      },
    },
  ] satisfies SampleInput<SearchInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SearchState | undefined;
    const found = s?.result ?? false;
    return { ok: found, label: found ? 'true (found)' : 'false (not found)' };
  },
};

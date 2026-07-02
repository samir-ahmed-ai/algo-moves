import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RemoveOnesInput {
  grid: number[][];
}

interface RemoveOnesState {
  grid: number[][];
  row: number | null; // row currently being compared against row 0
  col: number | null; // column currently being inspected
  same: boolean; // could this row still be identical to row 0?
  inv: boolean; // could this row still be the inverse of row 0?
  clearedRows: number[]; // rows already proven same-or-inverse
  result: boolean | null; // final answer once known
  done: boolean;
}

function record({ grid }: RemoveOnesInput): Frame<RemoveOnesState>[] {  const m = grid.length;
  const n = grid[0].length;

  const { emit, frames } = createRecorder<RemoveOnesState>(() => ({
        grid,
        row: null,
        col: null,
        same: true,
        inv: true,
        clearedRows: [],
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `${m}×${n}`,
    `A row flip or column flip toggles a whole line, but it never changes whether two rows agree or disagree in a given column. So every row must end up either identical to row 0 (clear them together) or its exact inverse (flip it first, then clear). We check each row below row 0 against that rule.`,
    { row: 0 },
  );

  const cleared: number[] = [0];
  emit(
    'BASE',
    'row 0 fixed',
    `Treat row 0 as the reference pattern. Each later row only has to match it or be its complement; row 0 itself is always consistent with itself.`,
    { row: 0, clearedRows: cleared.slice() },
  );

  for (let i = 1; i < m; i++) {
    let same = true;
    let inv = true;
    emit(
      'ROW',
      `row ${i}`,
      `Now test row ${i}. Start by assuming it could be EITHER the same as row 0 OR the inverse of row 0, then scan column by column and rule those out.`,
      { row: i, same, inv, clearedRows: cleared.slice() },
    );

    for (let j = 0; j < n; j++) {
      if (grid[i][j] !== grid[0][j]) same = false;
      if (grid[i][j] === grid[0][j]) inv = false;
      const a = grid[i][j];
      const b = grid[0][j];
      const rel = a === b ? 'matches' : 'differs from';
      emit(
        'CMP',
        `c${j}: ${a} vs ${b}`,
        `Column ${j}: grid[${i}][${j}] = ${a} ${rel} grid[0][${j}] = ${b}. ${
          a === b
            ? `An agreement here means row ${i} can no longer be the inverse of row 0.`
            : `A disagreement here means row ${i} can no longer be identical to row 0.`
        } So far same=${same}, inverse=${inv}.`,
        { row: i, col: j, same, inv, clearedRows: cleared.slice() },
      );

      if (!same && !inv) {
        emit(
          'FAIL',
          `row ${i} broken`,
          `Row ${i} is now neither the same as row 0 nor its inverse — it agrees in some columns and disagrees in others. No combination of row/column flips can reconcile that, so the grid can NEVER be fully cleared. Answer: false.`,
          { row: i, col: j, same, inv, clearedRows: cleared.slice(), result: false, done: true },
          'bad',
        );
        return frames;
      }
    }

    cleared.push(i);
    emit(
      'PASS',
      same ? `row ${i} = row 0` : `row ${i} = ~row 0`,
      `Row ${i} survived every column: it is ${
        same ? 'identical to row 0' : 'the exact inverse of row 0'
      }. ${
        same
          ? 'It clears together with row 0.'
          : 'Flip it (or the columns) first, and it lines up too.'
      } On to the next row.`,
      { row: i, col: null, same, inv, clearedRows: cleared.slice() },
      'good',
    );
  }

  emit(
    'DONE',
    'all rows ok',
    `Every row below row 0 turned out to be either identical to row 0 or its inverse. That means we can flip rows/columns to turn the whole grid to zeros. Answer: true. (Time O(m·n), Space O(1).)`,
    { row: null, col: null, clearedRows: cleared.slice(), result: true, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RemoveOnesState>) {
  const s = frame.state;
  const clearedSet = new Set(s.clearedRows);
  const cellTone = (r: number, c: number) => {
    if (s.row !== null && s.col !== null && r === s.row && c === s.col) return 'active';
    if (s.row !== null && s.col !== null && r === 0 && c === s.col) return 'path';
    if (s.result === false && s.row !== null && r === s.row) return 'water';
    if (r === 0) return 'fill';
    if (clearedSet.has(r)) return 'visited';
    return s.grid[r][c] === 1 ? 'land' : '';
  };
  const active: [number, number] | null =
    s.row !== null && s.col !== null ? [s.row, s.col] : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        row 0 = reference · each row must be <span className="font-mono text-ink">same</span> or{' '}
        <span className="font-mono text-ink">inverse</span>
      </div>
      <GridBoard grid={s.grid} cellTone={cellTone} active={active} />
      {s.row !== null && s.row > 0 && !s.done && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          row {s.row}: same={String(s.same)} · inverse={String(s.inv)}
        </div>
      )}
      {s.result !== null && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.result ? 'text-good' : 'text-bad',
          )}
        >
          → {s.result ? 'true (clearable)' : 'false (impossible)'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RemoveOnesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur =
    s.row !== null && s.col !== null && s.row < s.grid.length && s.col < s.grid[0].length
      ? s.grid[s.row][s.col]
      : '—';
  const ref =
    s.col !== null && s.col < s.grid[0].length ? s.grid[0][s.col] : '—';
  return (
    <VarGrid>
      <InspectorRow k="dims (m×n)" v={`${s.grid.length}×${s.grid[0].length}`} />
      <InspectorRow k="row i" v={s.row ?? '—'} />
      <InspectorRow k="col j" v={s.col ?? '—'} />
      <InspectorRow k="grid[i][j]" v={cur} />
      <InspectorRow k="grid[0][j]" v={ref} />
      <InspectorRow k="same?" v={s.row !== null && s.row > 0 ? String(s.same) : '—'} />
      <InspectorRow k="inverse?" v={s.row !== null && s.row > 0 ? String(s.inv) : '—'} />
      <InspectorRow k="rows cleared" v={s.clearedRows.length} />
      <InspectorRow
        k="answer"
        v={s.result === null ? '…' : s.result ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-remove-all-ones-with-row-and-column-flips';
export const title = 'Remove All Ones With Row and Column Flips';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'ro1',
      label: '[[0,1,0],[1,0,1],[0,1,0]] → true',
      value: { grid: [[0, 1, 0], [1, 0, 1], [0, 1, 0]] },
    },
    {
      id: 'ro2',
      label: '[[1,1,0],[0,0,0],[0,0,0]] → false',
      value: { grid: [[1, 1, 0], [0, 0, 0], [0, 0, 0]] },
    },
  ] satisfies SampleInput<RemoveOnesInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RemoveOnesState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'true (clearable)' : 'false (impossible)' };
  },
};

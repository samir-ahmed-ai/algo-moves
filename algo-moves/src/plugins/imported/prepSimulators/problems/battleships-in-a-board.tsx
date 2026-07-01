import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/GridBoard';

interface BattleshipsInput {
  board: string[][]; // each cell is 'X' (ship) or '.' (water)
}

interface BattleshipsState {
  board: string[][];
  i: number | null; // current row
  j: number | null; // current col
  count: number; // ships counted so far
  counted: [number, number][]; // top-left corners we have counted
  isShip: boolean; // current cell is 'X'
  isCorner: boolean; // current cell is a newly counted top-left corner
  done: boolean;
}

function record({ board }: BattleshipsInput): Frame<BattleshipsState>[] {
  const frames: Frame<BattleshipsState>[] = [];
  const counted: [number, number][] = [];
  let count = 0;
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<BattleshipsState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        board,
        i: null,
        j: null,
        count,
        counted: counted.map((c): [number, number] => [c[0], c[1]]),
        isShip: false,
        isCorner: false,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${rows}x${cols}`,
    `Battleships in a Board: count how many ships ('X' runs) sit on the grid. The trick is a single O(m·n) pass with no extra space — count only a ship's top-left corner: an 'X' whose neighbours above and to the left are NOT 'X'.`,
    {},
  );

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const ship = board[i][j] === 'X';
      if (!ship) {
        emit(
          'WATER',
          `(${i},${j})=.`,
          `Cell (${i}, ${j}) is water ('.'). Nothing to count here — keep scanning.`,
          { i, j, isShip: false, isCorner: false },
        );
        continue;
      }
      const up = i === 0 || board[i - 1][j] !== 'X';
      const left = j === 0 || board[i][j - 1] !== 'X';
      if (up && left) {
        count++;
        counted.push([i, j]);
        emit(
          'CORNER',
          `ship #${count}`,
          `Cell (${i}, ${j}) is 'X' and both its top neighbour ${i === 0 ? '(off-board)' : `(${i - 1}, ${j})`} and left neighbour ${j === 0 ? '(off-board)' : `(${i}, ${j - 1})`} are NOT 'X'. This is a ship's top-left corner — count it. Ships = ${count}.`,
          { i, j, isShip: true, isCorner: true },
          'good',
        );
      } else {
        const reason = !up ? `the cell above (${i - 1}, ${j}) is also 'X'` : `the cell to the left (${i}, ${j - 1}) is also 'X'`;
        emit(
          'BODY',
          `(${i},${j}) body`,
          `Cell (${i}, ${j}) is 'X', but ${reason}, so it belongs to a ship already counted at its corner. Skip it to avoid double-counting.`,
          { i, j, isShip: true, isCorner: false },
        );
      }
    }
  }

  emit(
    'DONE',
    `${count} ship${count === 1 ? '' : 's'}`,
    `Finished the single pass over all ${rows * cols} cells. Each ship was counted exactly once at its top-left corner, giving ${count} battleship${count === 1 ? '' : 's'}.`,
    { i: null, j: null, isShip: false, isCorner: false, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<BattleshipsState>) {
  const s = frame.state;
  const isCounted = (r: number, c: number) => s.counted.some(([cr, cc]) => cr === r && cc === c);
  const grid = s.board.map((row) => row.map((ch) => (ch === 'X' ? 'X' : '·')));
  const active: [number, number] | null = s.i !== null && s.j !== null ? [s.i, s.j] : null;
  const cellTone = (r: number, c: number) => {
    if (isCounted(r, c)) return 'path'; // top-left corners that were counted
    if (s.board[r][c] === 'X') return 'land'; // ship body (not a corner)
    return 'water';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        ships counted = <span className="font-mono text-ink">{s.count}</span>
        {active && (
          <>
            {' · '}at (<span className="font-mono text-ink">{active[0]}, {active[1]}</span>)
          </>
        )}
      </div>
      <GridBoard grid={grid} cellTone={cellTone} active={active} />
      <div className={cn(vizText.xs, 'text-ink3')}>
        <span className="font-mono text-good">highlighted</span> = counted top-left corner ·{' '}
        <span className="font-mono">X</span> = ship body · <span className="font-mono">·</span> = water
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.count} battleship{s.count === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BattleshipsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = s.i !== null && s.j !== null ? s.board[s.i][s.j] : null;
  return (
    <VarGrid>
      <InspectorRow k="cell (i,j)" v={s.i !== null && s.j !== null ? `(${s.i}, ${s.j})` : '—'} />
      <InspectorRow k="value" v={cell === null ? '—' : cell === 'X' ? "'X'" : "'.'"} />
      <InspectorRow k="is ship" v={s.isShip ? 'yes' : 'no'} />
      <InspectorRow k="top-left corner" v={s.isCorner ? 'yes — counted' : s.isShip ? 'no (body)' : '—'} />
      <InspectorRow k="ships" v={s.count} />
      <InspectorRow k="status" v={s.done ? 'done' : 'scanning'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-battleships-in-a-board';
export const title = 'Battleships in a Board';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'bb1',
      label: '2 ships',
      value: {
        board: [
          ['X', '.', '.', 'X'],
          ['.', '.', '.', 'X'],
          ['.', '.', '.', 'X'],
        ],
      },
    },
    {
      id: 'bb2',
      label: '3 ships',
      value: {
        board: [
          ['X', '.', 'X', 'X'],
          ['.', '.', '.', 'X'],
          ['X', '.', '.', '.'],
        ],
      },
    },
  ] satisfies SampleInput<BattleshipsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BattleshipsState | undefined;
    const n = s?.count ?? 0;
    return { ok: true, label: `${n} battleship${n === 1 ? '' : 's'}` };
  },
};

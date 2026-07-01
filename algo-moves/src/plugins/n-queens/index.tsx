import { definePlugin, type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../core/types';
import { GridBoard } from '../../components/GridBoard';
import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, badCases } from './cases';
import { quiz, codePieces } from './practice';
import { GraphInspector, GraphStatRow as InspectorRow } from '../_shared/graphInspector';
import { VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

export interface QueensInput {
  n: number;
}

export interface QueensState {
  n: number;
  queens: number[];
  tryCell: [number, number] | null;
  conflict: boolean;
  placedRows: number;
  solved: boolean;
  placements: number;
  backtracks: number;
}

function record({ n }: QueensInput): Frame<QueensState>[] {
  const queens: number[] = Array(n).fill(-1);
  const frames: Frame<QueensState>[] = [];
  let placements = 0;
  let backtracks = 0;
  let solved = false;

  const emit = (
    type: string,
    note: string,
    caption: string,
    tryCell: [number, number] | null,
    conflict: boolean,
    placedRows: number,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        n,
        queens: queens.slice(),
        tryCell,
        conflict,
        placedRows,
        solved,
        placements,
        backtracks,
      },
    });

  const safe = (row: number, col: number): boolean => {
    for (let r = 0; r < row; r++) {
      const c = queens[r];
      if (c === col) return false;
      if (Math.abs(c - col) === Math.abs(r - row)) return false;
    }
    return true;
  };

  emit(
    'INIT',
    `${n}-queens`,
    `Place ${n} queens on a ${n}×${n} board so none attack each other. Work row by row: try columns left to right, place a queen where it's safe, then recurse; backtrack when a row runs out of safe columns.`,
    null,
    false,
    0,
  );

  const place = (row: number): boolean => {
    if (row === n) {
      solved = true;
      emit(
        'SOLVED',
        'solution',
        `All ${n} rows filled with no queen attacking another — a complete solution. Stopping at the first one.`,
        null,
        false,
        n,
        'good',
      );
      return true;
    }

    for (let col = 0; col < n; col++) {
      emit(
        'TRY',
        `r${row} c${col}`,
        `Try placing a queen at row ${row}, column ${col}. Check it against every queen already placed above.`,
        [row, col],
        false,
        row,
      );

      if (!safe(row, col)) {
        emit(
          'CONFLICT',
          `r${row} c${col} ✗`,
          `Cell (${row}, ${col}) is attacked along a column or diagonal by an existing queen. Skip it and try the next column.`,
          [row, col],
          true,
          row,
        );
        continue;
      }

      queens[row] = col;
      placements++;
      emit(
        'PLACE',
        `r${row} c${col} ♛`,
        `Cell (${row}, ${col}) is safe — place a queen and descend to row ${row + 1}.`,
        [row, col],
        false,
        row + 1,
      );

      if (place(row + 1)) return true;
    }

    if (row > 0) {
      const removed = queens[row - 1];
      queens[row] = -1;
      backtracks++;
      emit(
        'BACKTRACK',
        `undo r${row - 1}`,
        `Row ${row} exhausted every column with no safe spot. Backtrack: remove the queen from row ${row - 1} (column ${removed}) and try its next column.`,
        [row - 1, removed],
        false,
        row - 1,
      );
    }
    return false;
  };

  place(0);
  return frames;
}

function View({ frame, onSelectNode }: PluginViewProps<QueensState>) {
  const s = frame.state;
  const grid: string[][] = Array.from({ length: s.n }, (_, r) =>
    Array.from({ length: s.n }, (_, c) => (s.queens[r] === c ? '♛' : '')),
  );
  return (
    <VizStage rail={<>
      <RailGroup label="progress">
        <RailStat k="placed" v={`${s.placedRows} / ${s.n}`} tone="accent" />
        <RailStat k="placements" v={s.placements} />
        <RailStat k="backtracks" v={s.backtracks} />
      </RailGroup>
      <RailResult label="solved" value={s.solved ? 'yes' : 'no'} tone={s.solved ? 'good' : 'accent'} />
    </>}>
      <GridBoard
        grid={grid}
        cellTone={(r, c) => {
          if (s.queens[r] === c) return 'fill';
          if (!s.conflict && s.tryCell && s.tryCell[0] === r && s.tryCell[1] === c) return 'path';
          return 'water';
        }}
        active={s.tryCell}
        cellSize={40}
        onCellClick={onSelectNode ? (r, c) => onSelectNode(r * s.n + c) : undefined}
      />
    </VizStage>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<QueensState>) {
  return (
    <GraphInspector
      frame={frame}
      selectedNode={selectedNode}
      rows={(s) => (
        <>
          <InspectorRow k="row" v={s.tryCell ? s.tryCell[0] : '—'} />
          <InspectorRow k="queens placed" v={`${s.placedRows} / ${s.n}`} />
          <InspectorRow k="placements" v={s.placements} />
          <InspectorRow k="backtracks" v={s.backtracks} />
          <InspectorRow k="solved" v={s.solved ? 'yes' : 'no'} />
        </>
      )}
    />
  );
}

const goSolution = `package main
func solveNQueens(n int) ([]int, bool) {
	queens := make([]int, n)
	for i := range queens {
		queens[i] = -1
	}

	safe := func(row, col int) bool {
		for r := 0; r < row; r++ {
			c := queens[r]
			if c == col || abs(c-col) == abs(r-row) {
				return false
			}
		}
		return true
	}

	var place func(row int) bool
	place = func(row int) bool {
		if row == n {
			return true
		}
		for col := 0; col < n; col++ {
			if safe(row, col) {
				queens[row] = col
				if place(row + 1) {
					return true
				}
				queens[row] = -1 // backtrack
			}
		}
		return false
	}

	if place(0) {
		return queens, true
	}
	return nil, false
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
`;

const inputs: SampleInput<QueensInput>[] = [
  { id: 'n4', label: 'n = 4', value: { n: 4 } },
  { id: 'n6', label: 'n = 6', value: { n: 6 } },
];

const verdict = (frames: Frame<QueensState>[]) => {
  const last = frames[frames.length - 1]?.state;
  return { ok: true, label: last?.solved ? 'solution found' : 'no solution' };
};

const casesIntro =
  'N-Queens is solvable for n = 1 and every n ≥ 4. For n = 2 and n = 3 the board is too cramped, so the search backtracks out of every branch and returns no solution.';

const teaching = wireTeachingStack({
  record,
  View,
  inputs,
  verdict,
  simulateSide: true,
  practice: {
    quiz,
    codePieces,
    cases: {
      good: goodCases,
      bad: badCases,
      intro: casesIntro,
      goodLabel: 'solvable — a board exists',
      badLabel: 'unsolvable — search exhausts',
    },
    simulateQuestion: 'Which move does the search make next?',
  },
});

export const nQueensPlugin = definePlugin<QueensInput, QueensState>({
  meta: {
    id: 'n-queens',
    title: 'N-Queens',
    difficulty: 'Hard',
    tags: ['backtracking', 'grid', 'recursion'],
    source: 'https://leetcode.com/problems/n-queens/',
    summary:
      'Place one queen per row; try columns left to right, recurse when a spot is safe, and backtrack when a row runs out. Stops at the first full solution.',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [{ key: 'n', label: 'Board size (n)', type: 'number', min: 1, max: 8 }],
});

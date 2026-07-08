import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  vizText,
} from '../../../_shared/vizKit';

interface Move {
  row: number;
  col: number;
  player: number;
}

interface TttInput {
  n: number;
  moves: Move[];
}

interface TttState {
  n: number;
  board: (number | null)[][];
  rows: number[];
  cols: number[];
  diag: number;
  antiDiag: number;
  op: string;
  winner: number | null;
  done: boolean;
}

function record({ n, moves }: TttInput): Frame<TttState>[] {
  const board: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const rows = new Array(n).fill(0);
  const cols = new Array(n).fill(0);
  let diag = 0;
  let antiDiag = 0;
  let winner: number | null = null;

  const { emit, frames } = createPrepRecorder<TttState>(() => ({
    n,
    board: board.map((r) => r.slice()),
    rows: rows.slice(),
    cols: cols.slice(),
    diag,
    antiDiag,
    op: '',
    winner,
    done: false,
  }));

  emit(
    'INIT',
    `${n}×${n}`,
    `Design Tic-Tac-Toe: track row/col/diag sums (+1 player1, -1 player2). |sum|==n means win — O(1) per move.`,
    {},
  );

  for (const { row, col, player } of moves) {
    const add = player === 2 ? -1 : 1;
    board[row]![col] = player;
    rows[row]! += add;
    cols[col]! += add;
    if (row === col) diag += add;
    if (row + col === n - 1) antiDiag += add;
    const abs = (x: number) => (x < 0 ? -x : x);
    const w =
      abs(rows[row]!) === n || abs(cols[col]!) === n || abs(diag) === n || abs(antiDiag) === n
        ? player
        : 0;
    if (w) winner = w;
    emit(
      'MOVE',
      `P${player} @(${row},${col})${w ? ' win' : ''}`,
      `Move(${row},${col}, player=${player}): rows[${row}]!=${rows[row]!}, cols[${col}]!=${cols[col]!}. ${w ? `Player ${w} wins!` : 'No winner yet.'}`,
      { op: `(${row},${col}) P${player}`, winner: w || null },
      w ? 'good' : undefined,
    );
    if (w) break;
  }

  emit(
    'DONE',
    winner ? `P${winner} wins` : 'no winner',
    winner ? `Player ${winner} wins the game.` : `All moves played, no winner.`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<TttState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.winner && (
        <RailGroup label="winner">
          <RailStat k="player" v={`P${s.winner}`} tone="good" />
        </RailGroup>
      )}
      <RailGroup label="board">
        <RailStat k="n" v={s.n} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${s.n}, minmax(0, 1fr))` }}
      >
        {s.board.flatMap((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded border font-mono',
                vizText.sm,
                cell === 1
                  ? 'border-accent bg-accentbg text-accent'
                  : cell === 2
                    ? 'border-bad bg-bad/10 text-bad'
                    : 'border-edge text-ink3',
              )}
            >
              {cell === 1 ? 'X' : cell === 2 ? 'O' : '·'}
            </div>
          )),
        )}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TttState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="rows" v={`[${s.rows.join(', ')}]`} />
      <InspectorRow k="cols" v={`[${s.cols.join(', ')}]`} />
      <InspectorRow k="winner" v={s.winner ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-design-tic-tac-toe';
export const title = 'Design Tic-Tac-Toe';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does Design Tic-Tac-Toe detect wins in O(1)?',
    choices: [
      {
        label: 'Row/col/diag sums — +1 for P1 and -1 for P2 per cell',
        correct: true,
      },
      {
        label: 'DFS full board — scan all lines after every move',
      },
      {
        label: 'Hash of coordinates — store every occupied cell set',
      },
      {
        label: 'Union-find components — merge adjacent same-player cells',
      },
    ],
    explain:
      'Each move updates rows[row], cols[col], and diagonals; |sum|===n signals a completed line.',
  },
  {
    id: 'key-step',
    prompt: 'On MOVE(row, col, player), when is a win declared?',
    choices: [
      {
        label: 'Absolute row col or diag sum equals n — line fully owned',
        correct: true,
      },
      {
        label: 'Board full — win only when no empty cells remain',
      },
      {
        label: 'Player one never wins — second player required for victory check',
      },
      {
        label: 'Center cell taken — middle square controls outcome',
      },
    ],
    explain:
      'After adding ±1 to line counters, abs(rows[row])===n or col/diag checks set winner to player.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds per move in Design Tic-Tac-Toe?',
    choices: [
      {
        label: 'O(1) move time, O(n) space — row col and diag counters',
        correct: true,
      },
      {
        label: 'O(n²) move, O(n²) space — scan entire board each turn',
      },
      {
        label: 'O(log n) move, O(1) space — binary search win lines',
      },
      {
        label: 'O(n) move only, O(1) space — no auxiliary counters kept',
      },
    ],
    explain:
      'Move updates O(1) counters and checks four sums; storage is linear in board dimension n.',
  },
  {
    id: 'edge',
    prompt: 'When does antiDiag receive an update on a move?',
    choices: [
      {
        label: 'row + col equals n - 1 — cell lies on anti-diagonal',
        correct: true,
      },
      {
        label: 'row equals col always — main and anti diag update together',
      },
      {
        label: 'col equals zero — only left edge touches antiDiag',
      },
      {
        label: 'player equals two — antiDiag tracks second player only',
      },
    ],
    explain:
      'Main diag updates when row===col; antiDiag updates when row+col===n-1 for the n×n board.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ttt1',
      label: '3×3 · row win',
      value: {
        n: 3,
        moves: [
          { row: 0, col: 0, player: 1 },
          { row: 1, col: 0, player: 2 },
          { row: 0, col: 1, player: 1 },
          { row: 1, col: 1, player: 2 },
          { row: 0, col: 2, player: 1 },
        ],
      },
    },
  ] satisfies SampleInput<TttInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TttState | undefined;
    return s?.done
      ? { ok: true, label: s.winner ? `P${s.winner} wins` : 'no winner' }
      : { ok: false, label: 'incomplete' };
  },
};

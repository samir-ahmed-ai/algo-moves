import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

function record({ n, moves }: TttInput): Frame<TttState>[] {  const board: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  const rows = new Array(n).fill(0);
  const cols = new Array(n).fill(0);
  let diag = 0;
  let antiDiag = 0;
  let winner: number | null = null;

  const { emit, frames } = createRecorder<TttState>(() => ({
        n,
        board: board.map((r) => r.slice()),
        rows: rows.slice(),
        cols: cols.slice(),
        diag,
        antiDiag,
        op: '',
        winner,
        done: false
      }));

  emit(
    'INIT',
    `${n}×${n}`,
    `Design Tic-Tac-Toe: track row/col/diag sums (+1 player1, -1 player2). |sum|==n means win — O(1) per move.`,
    {},
  );

  for (const { row, col, player } of moves) {
    const add = player === 2 ? -1 : 1;
    board[row][col] = player;
    rows[row] += add;
    cols[col] += add;
    if (row === col) diag += add;
    if (row + col === n - 1) antiDiag += add;
    const abs = (x: number) => (x < 0 ? -x : x);
    const w =
      abs(rows[row]) === n || abs(cols[col]) === n || abs(diag) === n || abs(antiDiag) === n ? player : 0;
    if (w) winner = w;
    emit(
      'MOVE',
      `P${player} @(${row},${col})${w ? ' win' : ''}`,
      `Move(${row},${col}, player=${player}): rows[${row}]=${rows[row]}, cols[${col}]=${cols[col]}. ${w ? `Player ${w} wins!` : 'No winner yet.'}`,
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.winner && <span className="ml-2 font-mono text-good">winner P{s.winner}</span>}
      </div>
      <div className="mt-2 inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${s.n}, minmax(0, 1fr))` }}>
        {s.board.flatMap((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded border font-mono',
                vizText.sm,
                cell === 1 ? 'border-accent bg-accentbg text-accent' : cell === 2 ? 'border-bad bg-bad/10 text-bad' : 'border-edge text-ink3',
              )}
            >
              {cell === 1 ? 'X' : cell === 2 ? 'O' : '·'}
            </div>
          )),
        )}
      </div>
    </div>
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
    id: "pattern",
    prompt: "Which approach fits \"Design Tic-Tac-Toe\"?",
    choices: [
      {
        label: "Design — fits this problem",
        correct: true
      },
      {
        label: "Stack — different approach"
      },
      {
        label: "Two Heaps — different approach"
      },
      {
        label: "Round-robin load balancer — different approach"
      }
    ],
    explain: "See Design Tic Tac Toe pattern"
  },
  {
    id: "init",
    prompt: "At the start of a run (Design Tic-Tac-Toe), what strategy is established?",
    choices: [
      {
        label: "See Design Tic Tac Toe pattern — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "Design Tic-Tac-Toe: track row/col/diag sums (+1 player1, -1 player2). |sum|==n means win — O(1) per move."
  },
  {
    id: "key-step",
    prompt: "On the \"MOVE\" step (P @(,)), what happens?",
    choices: [
      {
        label: "Move(,, player=): rows[]=, cols[]=. ${w ? — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "Move(,, player=): rows[]=, cols[]=. ${w ? "
  },
  {
    id: "state",
    prompt: "What does the `n` field track in the visualization state?",
    choices: [
      {
        label: "Field n in state — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder snapshots `n` on every emit so each frame shows the algorithm mid-step."
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Move(,, player=): rows[]=, cols[]=. ${w ? — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "Move(,, player=): rows[]=, cols[]=. ${w ? "
  }
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
    return s?.done ? { ok: true, label: s.winner ? `P${s.winner} wins` : 'no winner' } : { ok: false, label: 'incomplete' };
  },
};

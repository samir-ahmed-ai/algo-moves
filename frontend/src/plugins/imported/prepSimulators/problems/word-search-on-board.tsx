import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/board/GridBoard';

interface WordSearchInput {
  board: string[][];
  word: string;
}

interface WordSearchState {
  board: string[][];
  word: string;
  idx: number; // how many characters matched so far (word[idx] is the next target)
  active: [number, number] | null; // cell DFS is currently examining
  path: [number, number][]; // cells currently marked visited on the active DFS chain
  fail: [number, number] | null; // cell that just failed the match test
  found: boolean;
  done: boolean;
}

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

function record({ board, word }: WordSearchInput): Frame<WordSearchState>[] {
  const m = board.length;
  const n = board[0]?.length ?? 0;
  const visited: boolean[][] = board.map((row) => row.map(() => false));

  const pathCells = (): [number, number][] => {
    const out: [number, number][] = [];
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < n; c++) {
        if (visited[r][c]) out.push([r, c]);
      }
    }
    return out;
  };

  const { emit, frames } = createRecorder<WordSearchState>(() => ({
    board,
    word,
    idx: 0,
    active: null,
    path: pathCells(),
    fail: null,
    found: false,
    done: false,
  }));

  emit(
    'INIT',
    `word="${word}"`,
    `Word search: try to spell "${word}" by walking neighbours (up/down/left/right) on the board, never reusing a cell. We launch a DFS from every cell and backtrack on failure. Time O(m·n·4^s), Space O(s).`,
    { idx: 0 },
  );

  const dfs = (i: number, j: number, idx: number): boolean => {
    // Full word matched along the current path.
    if (idx === word.length) {
      emit(
        'MATCH',
        `idx=${idx}`,
        `Matched all ${word.length} characters of "${word}" along the highlighted path — the word exists on the board.`,
        { idx, active: null, found: true },
        'good',
      );
      return true;
    }

    const target = word[idx];
    const outOfBounds = i < 0 || j < 0 || i >= m || j >= n;
    if (outOfBounds) {
      return false;
    }

    const cellChar = board[i][j];
    if (visited[i][j] || cellChar !== target) {
      const reason = visited[i][j]
        ? `cell (${i},${j}) is already on the current path`
        : `board[${i}][${j}]='${cellChar}' ≠ word[${idx}]='${target}'`;
      emit(
        'REJECT',
        `(${i},${j})`,
        `Dead end at (${i},${j}): ${reason}. Backtrack and try another direction.`,
        { idx, active: [i, j], fail: [i, j] },
        'bad',
      );
      return false;
    }

    // Match: mark and descend.
    visited[i][j] = true;
    emit(
      'MARK',
      `'${cellChar}' @(${i},${j})`,
      `board[${i}][${j}]='${cellChar}' matches word[${idx}]='${target}'. Mark it visited and look for word[${idx + 1}]='${word[idx + 1] ?? '∅'}' among its neighbours.`,
      { idx: idx + 1, active: [i, j] },
    );

    for (const [di, dj] of DIRS) {
      if (dfs(i + di, j + dj, idx + 1)) {
        return true;
      }
    }

    visited[i][j] = false;
    emit(
      'UNMARK',
      `(${i},${j})`,
      `No neighbour of (${i},${j}) continued "${word}". Unmark this cell (backtrack) so other paths may reuse it.`,
      { idx, active: [i, j] },
    );
    return false;
  };

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      emit(
        'START',
        `from (${i},${j})`,
        `Launch a fresh DFS from cell (${i},${j})='${board[i][j]}', attempting to match word[0]='${word[0] ?? '∅'}' here.`,
        { idx: 0, active: [i, j] },
      );
      if (dfs(i, j, 0)) {
        emit(
          'DONE',
          'found',
          `Search complete: "${word}" was found on the board.`,
          { found: true, done: true },
          'good',
        );
        return frames;
      }
    }
  }

  emit(
    'DONE',
    'not found',
    `Every starting cell was exhausted without spelling "${word}" — the word is not on the board.`,
    { done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<WordSearchState>) {
  const s = frame.state;
  const onPath = (r: number, c: number) => s.path.some(([pr, pc]) => pr === r && pc === c);
  const isFail = (r: number, c: number) => s.fail !== null && s.fail[0] === r && s.fail[1] === c;

  const cellTone = (r: number, c: number): string => {
    if (s.found && onPath(r, c)) return 'path';
    if (isFail(r, c)) return 'water';
    if (onPath(r, c)) return 'visited';
    return 'land';
  };

  const matched = s.word.slice(0, s.idx);
  const remaining = s.word.slice(s.idx);

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        word = <span className="font-mono text-good">{matched || '·'}</span>
        <span className="font-mono text-ink3">{remaining}</span>
        {' · '}matched <span className="font-mono text-ink">{s.idx}</span>/
        <span className="font-mono text-ink">{s.word.length}</span>
      </div>
      <GridBoard grid={s.board} cellTone={cellTone} active={s.active} />
      {s.done && (
        <div className={cn('mt-1 font-mono', vizText.base, s.found ? 'text-good' : 'text-bad')}>
          {s.found ? `→ "${s.word}" found` : `→ "${s.word}" not on board`}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<WordSearchState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="word" v={s.word} />
      <InspectorRow k="next char (word[idx])" v={s.idx < s.word.length ? s.word[s.idx] : '∅'} />
      <InspectorRow k="idx (matched)" v={`${s.idx}/${s.word.length}`} />
      <InspectorRow k="active cell" v={s.active ? `(${s.active[0]},${s.active[1]})` : '—'} />
      <InspectorRow k="path length" v={s.path.length} />
      <InspectorRow k="result" v={s.done ? (s.found ? 'found' : 'not found') : '…'} />
    </VarGrid>
  );
}

function solve({ board, word }: WordSearchInput): boolean {
  const m = board.length;
  const n = board[0]?.length ?? 0;
  const visited: boolean[][] = board.map((row) => row.map(() => false));
  const dfs = (i: number, j: number, idx: number): boolean => {
    if (idx === word.length) return true;
    if (i < 0 || j < 0 || i >= m || j >= n || visited[i][j] || board[i][j] !== word[idx]) {
      return false;
    }
    visited[i][j] = true;
    for (const [di, dj] of DIRS) {
      if (dfs(i + di, j + dj, idx + 1)) return true;
    }
    visited[i][j] = false;
    return false;
  };
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (dfs(i, j, 0)) return true;
    }
  }
  return false;
}

export const manifestId = 'prep-matrices-word-search-on-board';
export const title = 'Word search on board';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Word search on board"?',
    choices: [
      {
        label: 'Backtracking word search — fits this problem',
        correct: true,
      },
      {
        label: 'Simulation — different approach',
      },
      {
        label: 'Staircase search from top-right — different approach',
      },
      {
        label: '4-direction DP — different approach',
      },
    ],
    explain: 'DFS from each cell matching the word index, marking and unmarking visited',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Word search on board), what strategy is established?',
    choices: [
      {
        label: 'DFS from each cell matching — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Word search: try to spell "" by walking neighbours (up/down/left/right) on the board, never reusing a cell. We launch a DFS from every cell and backtrack on failure. Time O(m·n·4^s), Space O(s).',
  },
  {
    id: 'key-step',
    prompt: 'On the "MARK" step (\'\' @(,)), what happens?',
    choices: [
      {
        label: "board[][]='' matches word[]=''. Mark — this move caption",
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain:
      "board[][]='' matches word[]=''. Mark it visited and look for word[]='' among its neighbours.",
  },
  {
    id: 'state',
    prompt: 'What does the `idx` field track in the visualization state?',
    choices: [
      {
        label: 'how many characters matched — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain:
      'The recorder keeps `idx` in sync: how many characters matched so far (word[idx] is the next target)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Word search on board"?',
    choices: [
      {
        label: 'O(m·n·4^s) time, O(s) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(m·n·4^s). O(s). idx==len -> true; mark, recurse 4-dir, unmark on fail',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Launch a fresh DFS from cell — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain: "Launch a fresh DFS from cell (,)='', attempting to match word[0]='' here.",
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ws1',
      label: 'ABCCED in ABCE/SFCS/ADEE',
      value: {
        board: [
          ['A', 'B', 'C', 'E'],
          ['S', 'F', 'C', 'S'],
          ['A', 'D', 'E', 'E'],
        ],
        word: 'ABCCED',
      },
    },
    {
      id: 'ws2',
      label: 'ABCB (not found)',
      value: {
        board: [
          ['A', 'B', 'C', 'E'],
          ['S', 'F', 'C', 'S'],
          ['A', 'D', 'E', 'E'],
        ],
        word: 'ABCB',
      },
    },
  ] satisfies SampleInput<WordSearchInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WordSearchState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const real = solve({ board: s.board, word: s.word });
    return { ok: real, label: real ? `"${s.word}" found` : `"${s.word}" not found` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface WordSearchInput {
  board: string[][];
  word: string;
}

interface WordSearchState {
  board: string[][];
  /** Cells currently on the DFS path, in match order. */
  path: [number, number][];
  /** Cell the algorithm is looking at right now. */
  cur: [number, number] | null;
  /** How many characters of `word` are matched along the current path. */
  matched: number;
  word: string;
  found: boolean;
  done: boolean;
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function key(r: number, c: number): string {
  return `${r},${c}`;
}

function record({ board, word }: WordSearchInput): Frame<WordSearchState>[] {
  const m = board.length;
  const n = board[0].length;
  const frames: Frame<WordSearchState>[] = [];
  const onPath = new Set<string>();
  const path: [number, number][] = [];
  let found = false;

  const emit = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    done = false,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        board,
        path: path.map((p) => [p[0], p[1]] as [number, number]),
        cur,
        matched: path.length,
        word,
        found,
        done,
      },
    });

  emit(
    'INIT',
    `${m}×${n} board · "${word}"`,
    `Look for "${word}" by stepping cell to cell (up/down/left/right) without reusing a cell. DFS from every starting cell: if board[r][c] equals the next letter, mark the cell, recurse the four neighbours, then restore on backtrack.`,
    null,
  );

  const dfs = (r: number, c: number, idx: number): boolean => {
    if (r < 0 || r >= m || c < 0 || c >= n) {
      emit('MISMATCH', 'off board', `Step off the board (${r}, ${c}) — out of bounds, so this path fails.`, null);
      return false;
    }
    if (onPath.has(key(r, c))) {
      emit(
        'MISMATCH',
        `(${r},${c}) reused`,
        `Cell (${r}, ${c}) is already on the current path — can't reuse it, so this path fails.`,
        [r, c],
      );
      return false;
    }
    const ch = board[r][c];
    const need = word[idx];
    if (ch !== need) {
      emit(
        'MISMATCH',
        `'${ch}' ≠ '${need}'`,
        `At (${r}, ${c}) the letter is '${ch}', but we need '${need}' (position ${idx}). Mismatch — prune this branch.`,
        [r, c],
      );
      return false;
    }

    onPath.add(key(r, c));
    path.push([r, c]);
    emit(
      'MATCH',
      `'${ch}' == '${need}'`,
      `At (${r}, ${c}) the letter '${ch}' matches '${need}' (position ${idx}). Mark it and advance — ${idx + 1}/${word.length} letters matched.`,
      [r, c],
    );

    if (idx + 1 === word.length) {
      found = true;
      emit('FOUND', 'word complete', `All ${word.length} letters of "${word}" matched along this path — the word exists.`, [r, c], false, 'good');
      return true;
    }

    for (const [dr, dc] of DIRS) {
      if (dfs(r + dr, c + dc, idx + 1)) {
        return true;
      }
    }

    onPath.delete(key(r, c));
    path.pop();
    emit(
      'BACKTRACK',
      `undo (${r},${c})`,
      `No neighbour of (${r}, ${c}) continued "${word}" past '${ch}'. Backtrack: unmark (${r}, ${c}) and return to position ${idx}.`,
      [r, c],
    );
    return false;
  };

  let answer = false;
  outer: for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === word[0]) {
        emit('TRY', `start (${r},${c})`, `Try starting the search at (${r}, ${c}) — its letter '${board[r][c]}' matches the first letter '${word[0]}'.`, [r, c]);
      }
      if (dfs(r, c, 0)) {
        answer = true;
        break outer;
      }
    }
  }

  emit(
    'DONE',
    answer ? 'found' : 'not found',
    answer
      ? `Search complete — "${word}" is present in the board. Answer = true.`
      : `Every starting cell exhausted without spelling "${word}". Answer = false.`,
    null,
    true,
    answer ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<WordSearchState>) {
  const s = frame.state;
  const onPath = new Set(s.path.map(([r, c]) => key(r, c)));
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (onPath.has(key(r, c))) return 'path';
    return 'land';
  };
  const progress = s.word.slice(0, s.matched);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        word <span className="font-mono text-ink">{s.word}</span> · matched{' '}
        <span className="font-mono text-ink">
          {progress || '∅'}
        </span>{' '}
        ({s.matched}/{s.word.length})
      </div>
      <GridBoard grid={s.board} cellTone={cellTone} active={s.cur} cellSize={40} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<WordSearchState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="cell" v={s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—'} />
      <InspectorRow k="matched" v={`${s.matched}/${s.word.length}`} />
      <InspectorRow k="path" v={s.path.map(([r, c]) => `(${r},${c})`).join(' → ') || '—'} />
      <InspectorRow k="found" v={s.found ? 'true' : 'false'} />
    </VarGrid>
  );
}

const BOARD: string[][] = [
  ['A', 'B', 'C', 'E'],
  ['S', 'F', 'C', 'S'],
  ['A', 'D', 'E', 'E'],
];

const W1: WordSearchInput = { board: BOARD, word: 'ABCCED' };
const W2: WordSearchInput = { board: BOARD, word: 'ABCB' };

export const manifestId = 'imp-44-word-search';
export const title = 'Word Search';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'w1', label: '"ABCCED" · true', value: W1 },
    { id: 'w2', label: '"ABCB" · false', value: W2 },
  ] satisfies SampleInput<WordSearchInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WordSearchState | undefined;
    const ok = !!s?.found;
    return { ok, label: ok ? 'word found' : 'not found' };
  },
};

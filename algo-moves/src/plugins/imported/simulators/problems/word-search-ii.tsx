import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface WordSearchIIInput {
  board: string[][];
  words: string[];
}

interface WordSearchIIState {
  board: string[][];
  /** Cells currently on the DFS path, in match order. */
  path: [number, number][];
  cur: [number, number] | null;
  matched: number;
  /** The word currently being searched. */
  word: string;
  /** Words confirmed present so far. */
  found: string[];
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

function record({ board, words }: WordSearchIIInput): Frame<WordSearchIIState>[] {
  const m = board.length;
  const n = board[0].length;
  const frames: Frame<WordSearchIIState>[] = [];
  const onPath = new Set<string>();
  const path: [number, number][] = [];
  const found: string[] = [];
  let word = '';

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
        found: found.slice(),
        done,
      },
    });

  emit(
    'INIT',
    `${m}×${n} board · ${words.length} words`,
    `Find which of [${words.map((w) => `"${w}"`).join(', ')}] appear in the board. The real solution builds a trie and runs one trie-guided DFS; here we DFS each word in turn (same in-place marking) and collect the ones we can spell.`,
    null,
  );

  const dfs = (r: number, c: number, idx: number): boolean => {
    if (r < 0 || r >= m || c < 0 || c >= n) return false;
    if (onPath.has(key(r, c))) return false;
    if (board[r][c] !== word[idx]) {
      emit(
        'MISMATCH',
        `'${r >= 0 && r < m && c >= 0 && c < n ? board[r][c] : '·'}' ≠ '${word[idx]}'`,
        `At (${r}, ${c}) the letter '${board[r][c]}' doesn't match '${word[idx]}' (position ${idx} of "${word}"). Prune.`,
        [r, c],
      );
      return false;
    }

    onPath.add(key(r, c));
    path.push([r, c]);
    emit(
      'MATCH',
      `'${board[r][c]}' == '${word[idx]}'`,
      `At (${r}, ${c}) '${board[r][c]}' matches '${word[idx]}' (position ${idx} of "${word}"). Mark it — ${idx + 1}/${word.length} letters matched.`,
      [r, c],
    );

    if (idx + 1 === word.length) {
      if (!found.includes(word)) found.push(word);
      emit('FOUND', `found "${word}"`, `Whole word "${word}" spelled out — add it to the results.`, [r, c], false, 'good');
      return true;
    }

    for (const [dr, dc] of DIRS) {
      if (dfs(r + dr, c + dc, idx + 1)) return true;
    }

    onPath.delete(key(r, c));
    path.pop();
    emit(
      'BACKTRACK',
      `undo (${r},${c})`,
      `No neighbour of (${r}, ${c}) continued "${word}". Backtrack: unmark (${r}, ${c}) and return to position ${idx}.`,
      [r, c],
    );
    return false;
  };

  for (const w of words) {
    word = w;
    onPath.clear();
    path.length = 0;
    emit('WORD', `search "${w}"`, `Now search the board for "${w}".`, null);
    let hit = false;
    outer: for (let r = 0; r < m; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === w[0]) {
          emit('TRY', `start (${r},${c})`, `Try starting "${w}" at (${r}, ${c}) — '${board[r][c]}' matches first letter '${w[0]}'.`, [r, c]);
          if (dfs(r, c, 0)) {
            hit = true;
            break outer;
          }
        }
      }
    }
    onPath.clear();
    path.length = 0;
    if (!hit) {
      emit('ABSENT', `no "${w}"`, `No starting cell could spell "${w}" — it is not in the board.`, null, false, 'bad');
    }
  }

  word = '';
  emit(
    'DONE',
    `${found.length} found`,
    `All words checked. Present words = [${found.map((w) => `"${w}"`).join(', ')}].`,
    null,
    true,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<WordSearchIIState>) {
  const s = frame.state;
  const onPath = new Set(s.path.map(([r, c]) => key(r, c)));
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (onPath.has(key(r, c))) return 'path';
    return 'land';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.word ? (
          <>
            searching <span className="font-mono text-ink">{s.word}</span> ({s.matched}/{s.word.length})
          </>
        ) : (
          <>scanning words</>
        )}{' '}
        · found <span className="font-mono text-ink">[{s.found.join(', ') || '∅'}]</span>
      </div>
      <GridBoard grid={s.board} cellTone={cellTone} active={s.cur} cellSize={40} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<WordSearchIIState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="word" v={s.word || '—'} />
      <InspectorRow k="cell" v={s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—'} />
      <InspectorRow k="matched" v={s.word ? `${s.matched}/${s.word.length}` : '—'} />
      <InspectorRow k="found" v={`[${s.found.join(', ')}]`} />
    </VarGrid>
  );
}

const BOARD: string[][] = [
  ['o', 'a', 'a', 'n'],
  ['e', 't', 'a', 'e'],
  ['i', 'h', 'k', 'r'],
  ['i', 'f', 'l', 'v'],
];

const I1: WordSearchIIInput = { board: BOARD, words: ['oath', 'pea', 'eat', 'rain'] };

export const manifestId = 'imp-45-word-search-ii';
export const title = 'Word Search II';

export const simulator: DpSimulator = {
  inputs: [{ id: 'i1', label: '4×4 · 2 of 4 found', value: I1 }] satisfies SampleInput<WordSearchIIInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WordSearchIIState | undefined;
    const count = s?.found.length ?? 0;
    return { ok: count > 0, label: `${count} word${count === 1 ? '' : 's'} found` };
  },
};

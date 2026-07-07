import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailStack,
  RailResult,
} from '../../../_shared/vizKit';

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
  const n = board[0]!.length;
  const onPath = new Set<string>();
  const path: [number, number][] = [];
  const found: string[] = [];
  let word = '';

  const { emit, frames } = createRecorder<WordSearchIIState>(() => ({
    board: board,
    path: path.map((p) => [p[0], p[1]] as [number, number]),
    matched: path.length,
    word: word,
    found: found.slice(),
    cur: null,
    done: false,
  }));

  emit(
    'INIT',
    `${m}×${n} board · ${words.length} words`,
    `Find which of [${words.map((w) => `"${w}"`).join(', ')}] appear in the board. The real solution builds a trie and runs one trie-guided DFS; here we DFS each word in turn (same in-place marking) and collect the ones we can spell.`,
    { cur: null },
  );

  const dfs = (r: number, c: number, idx: number): boolean => {
    if (r < 0 || r >= m || c < 0 || c >= n) return false;
    if (onPath.has(key(r, c))) return false;
    if (board[r]![c] !== word[idx]) {
      emit(
        'MISMATCH',
        `'${r >= 0 && r < m && c >= 0 && c < n ? board[r]![c] : '·'}' ≠ '${word[idx]}'`,
        `At (${r}, ${c}) the letter '${board[r]![c]}' doesn't match '${word[idx]}' (position ${idx} of "${word}"). Prune.`,
        { cur: [r, c] },
      );
      return false;
    }

    onPath.add(key(r, c));
    path.push([r, c]);
    emit(
      'MATCH',
      `'${board[r]![c]}' == '${word[idx]}'`,
      `At (${r}, ${c}) '${board[r]![c]}' matches '${word[idx]}' (position ${idx} of "${word}"). Mark it — ${idx + 1}/${word.length} letters matched.`,
      { cur: [r, c] },
    );

    if (idx + 1 === word.length) {
      if (!found.includes(word)) found.push(word);
      emit(
        'FOUND',
        `found "${word}"`,
        `Whole word "${word}" spelled out — add it to the results.`,
        { cur: [r, c], done: false },
        'good',
      );
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
      { cur: [r, c] },
    );
    return false;
  };

  for (const w of words) {
    word = w;
    onPath.clear();
    path.length = 0;
    emit('WORD', `search "${w}"`, `Now search the board for "${w}".`, { cur: null });
    let hit = false;
    outer: for (let r = 0; r < m; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r]![c] === w[0]) {
          emit(
            'TRY',
            `start (${r},${c})`,
            `Try starting "${w}" at (${r}, ${c}) — '${board[r]![c]}' matches first letter '${w[0]}'.`,
            { cur: [r, c] },
          );
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
      emit(
        'ABSENT',
        `no "${w}"`,
        `No starting cell could spell "${w}" — it is not in the board.`,
        { cur: null, done: false },
        'bad',
      );
    }
  }

  word = '';
  emit(
    'DONE',
    `${found.length} found`,
    `All words checked. Present words = [${found.map((w) => `"${w}"`).join(', ')}].`,
    { cur: null, done: true },
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
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="word" v={s.word || '—'} tone={s.word ? 'accent' : undefined} />
        <RailStat k="cell" v={s.cur ? `(${s.cur[0]},${s.cur[1]})` : '—'} />
        <RailStat k="matched" v={s.word ? `${s.matched}/${s.word.length}` : '—'} />
      </RailGroup>
      <RailStack label="found" items={s.found} />
      {s.done && (
        <RailResult
          label="answer"
          value={`${s.found.length} found`}
          tone={s.found.length > 0 ? 'good' : 'bad'}
        />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <GridBoard grid={s.board} cellTone={cellTone} active={s.cur} cellSize={40} />
    </VizStage>
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

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'i1', label: '4×4 · 2 of 4 found', value: I1 },
  ] satisfies SampleInput<WordSearchIIInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WordSearchIIState | undefined;
    const count = s?.found.length ?? 0;
    return { ok: count > 0, label: `${count} word${count === 1 ? '' : 's'} found` };
  },
};

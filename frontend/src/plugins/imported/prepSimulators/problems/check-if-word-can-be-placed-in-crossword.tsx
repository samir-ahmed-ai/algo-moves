import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/GridBoard';

interface CrosswordInput {
  // Each row is a string; ' ' = empty cell (wildcard), '#' = blocked, letters = fixed.
  board: string[];
  word: string;
}

interface Cell {
  r: number;
  c: number;
}

interface CrosswordState {
  board: string[][];
  word: string;
  // Cells currently collected into the active segment.
  seg: Cell[];
  // Cell the scan head is on right now (or null).
  active: [number, number] | null;
  // Orientation being scanned.
  axis: 'row' | 'col' | null;
  // Per-letter result of the match attempt being explained (parallel to seg).
  fwdOk: boolean | null;
  bwdOk: boolean | null;
  // Cells of the winning placement, once found.
  placed: Cell[];
  result: boolean | null;
  done: boolean;
}

function record({ board: rows, word }: CrosswordInput): Frame<CrosswordState>[] {
  const board: string[][] = rows.map((row) => row.split(''));
  const m = board.length;
  const n = board[0]?.length ?? 0;
  const wLen = word.length;
  const { emit, frames } = createRecorder<CrosswordState>(() => ({
        board,
        word,
        seg: [],
        active: null,
        axis: null,
        fwdOk: null,
        bwdOk: null,
        placed: [],
        result: null,
        done: false
      }));

  // Tries a collected segment against `word`; returns the matching orientation or null.
  const tryMatch = (
    seg: Cell[],
    axis: 'row' | 'col',
  ): 'fwd' | 'bwd' | null => {
    if (seg.length !== wLen) {
      if (seg.length > 0) {
        emit(
          'REJECT',
          `len ${seg.length}≠${wLen}`,
          `This run of open cells has length ${seg.length}, but the word "${word}" needs exactly ${wLen}. A word must fill a whole slot wall-to-wall, so skip this segment.`,
          { seg: seg.slice(), axis, active: null },
        );
      }
      return null;
    }
    let fwd = true;
    let bwd = true;
    for (let i = 0; i < wLen; i++) {
      const ch = board[seg[i].r][seg[i].c];
      if (ch !== ' ' && ch !== word[i]) fwd = false;
      if (ch !== ' ' && ch !== word[wLen - 1 - i]) bwd = false;
    }
    emit(
      'TEST',
      `${fwd ? 'fwd' : '—'}/${bwd ? 'bwd' : '—'}`,
      `Found a slot of length ${wLen}. Try the word both ways: forward "${word}" ${fwd ? 'fits' : 'clashes'}, reversed "${word.split('').reverse().join('')}" ${bwd ? 'fits' : 'clashes'} (a blank ' ' matches anything, a letter must match exactly).`,
      { seg: seg.slice(), axis, fwdOk: fwd, bwdOk: bwd, active: null },
      fwd || bwd ? 'good' : undefined,
    );
    if (fwd) return 'fwd';
    if (bwd) return 'bwd';
    return null;
  };

  emit(
    'INIT',
    `word=${word}`,
    `Check if Word Can Be Placed In Crossword: slide "${word}" into any horizontal or vertical slot. Scan every row, then every column, breaking each line into segments at '#' walls, and test each full-length segment forward and backward. Time O(m·n), Space O(max(m,n)).`,
    {},
  );

  // --- Rows ---
  for (let i = 0; i < m; i++) {
    let seg: Cell[] = [];
    for (let j = 0; j <= n; j++) {
      if (j < n && board[i][j] !== '#') {
        seg.push({ r: i, c: j });
        emit(
          'EXTEND',
          `row ${i} +(${i},${j})`,
          `Scanning row ${i}: cell (${i},${j}) holds '${board[i][j] === ' ' ? '·' : board[i][j]}' (not a wall), so it joins the current open segment, now length ${seg.length}.`,
          { seg: seg.slice(), axis: 'row', active: [i, j] },
        );
      } else {
        const hit = tryMatch(seg, 'row');
        if (hit) {
          const placed = seg.slice();
          emit(
            'PLACE',
            `row ${i} ${hit}`,
            `"${word}" fits this horizontal slot in row ${i} (${hit === 'bwd' ? 'reading right-to-left' : 'left-to-right'}). The word can be placed — return true.`,
            { seg: placed, placed, axis: 'row', result: true, done: true },
            'good',
          );
          return frames;
        }
        seg = [];
      }
    }
  }

  // --- Columns ---
  for (let j = 0; j < n; j++) {
    let seg: Cell[] = [];
    for (let i = 0; i <= m; i++) {
      if (i < m && board[i][j] !== '#') {
        seg.push({ r: i, c: j });
        emit(
          'EXTEND',
          `col ${j} +(${i},${j})`,
          `Scanning column ${j}: cell (${i},${j}) holds '${board[i][j] === ' ' ? '·' : board[i][j]}' (not a wall), so it joins the current vertical segment, now length ${seg.length}.`,
          { seg: seg.slice(), axis: 'col', active: [i, j] },
        );
      } else {
        const hit = tryMatch(seg, 'col');
        if (hit) {
          const placed = seg.slice();
          emit(
            'PLACE',
            `col ${j} ${hit}`,
            `"${word}" fits this vertical slot in column ${j} (${hit === 'bwd' ? 'reading bottom-to-top' : 'top-to-bottom'}). The word can be placed — return true.`,
            { seg: placed, placed, axis: 'col', result: true, done: true },
            'good',
          );
          return frames;
        }
        seg = [];
      }
    }
  }

  emit(
    'DONE',
    'no fit',
    `Every horizontal and vertical slot was tried — none accept "${word}" in either direction. The word cannot be placed, so return false.`,
    { result: false, done: true },
    'bad',
  );
  return frames;
}

function inSeg(seg: { r: number; c: number }[], r: number, c: number) {
  return seg.some((cell) => cell.r === r && cell.c === c);
}

function View({ frame }: PluginViewProps<CrosswordState>) {
  const s = frame.state;
  const display: string[][] = s.board.map((row) =>
    row.map((ch) => (ch === ' ' ? '·' : ch)),
  );
  const tone = (r: number, c: number) => {
    if (inSeg(s.placed, r, c)) return 'path';
    if (s.board[r][c] === '#') return 'water';
    if (inSeg(s.seg, r, c)) return 'fill';
    return 'land';
  };
  const reversed = s.word.split('').reverse().join('');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        word = <span className="font-mono text-ink">{s.word}</span>
        {s.axis && !s.done && (
          <>
            {' · scanning '}
            <span className="font-mono text-ink">{s.axis === 'row' ? 'rows →' : 'cols ↓'}</span>
          </>
        )}
      </div>
      <GridBoard grid={display} cellTone={tone} active={s.active} />
      {(s.fwdOk !== null || s.bwdOk !== null) && !s.done && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          fwd "{s.word}" {s.fwdOk ? '✓' : '✗'} · bwd "{reversed}" {s.bwdOk ? '✓' : '✗'}
        </div>
      )}
      {s.result !== null && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.result ? 'text-good' : 'text-ink2',
          )}
        >
          → {s.result ? 'true (placeable)' : 'false (no slot)'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CrosswordState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="word" v={s.word} />
      <InspectorRow k="|word|" v={s.word.length} />
      <InspectorRow k="axis" v={s.axis ?? '—'} />
      <InspectorRow k="head" v={s.active ? `(${s.active[0]},${s.active[1]})` : '—'} />
      <InspectorRow k="segment len" v={s.seg.length} />
      <InspectorRow k="fwd / bwd" v={s.fwdOk === null ? '—' : `${s.fwdOk ? '✓' : '✗'} / ${s.bwdOk ? '✓' : '✗'}`} />
      <InspectorRow k="result" v={s.result === null ? '…' : s.result ? 'true' : 'false'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-check-if-word-can-be-placed-in-crossword';
export const title = 'Check if Word Can Be Placed In Crossword';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'cw1',
      label: '["#  ","  c","  #"], "abc"',
      value: { board: ['#  ', '  c', '  #'], word: 'abc' },
    },
    {
      id: 'cw2',
      label: '["# #","   ","# #"], "ac"',
      value: { board: ['# #', '   ', '# #'], word: 'ac' },
    },
  ] satisfies SampleInput<CrosswordInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CrosswordState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'true (placeable)' : 'false (no slot)' };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SSFInput {
  sentence: string[];
  rows: number;
  cols: number;
}

interface SSFState {
  sentence: string[];
  rows: number;
  cols: number;
  fit: number[]; // fit[w] = words placed on one row starting at word w; -1 = unfilled
  next: number[]; // next[w] = start word of the following row; -1 = unfilled
  cur: number | null; // start word being measured
  // Counting phase
  walkRow: number | null; // current row index while summing
  walkStart: number | null; // start word of that row
  totalWords: number; // words placed so far across rows
  done: boolean;
}

/** Words that fit on one row of width `cols` starting at word `w`, and the start word of the next row. */
function measure(sentence: string[], cols: number, w: number): { count: number; next: number } {
  let used = 0; // chars used on the row (without trailing space)
  let count = 0;
  let idx = w;
  while (true) {
    const word = sentence[idx % sentence.length];
    const need = count === 0 ? word.length : used + 1 + word.length;
    if (need > cols) break;
    used = need;
    count += 1;
    idx += 1;
  }
  return { count, next: (w + count) % sentence.length };
}

function record({ sentence, rows, cols }: SSFInput): Frame<SSFState>[] {
  const w = sentence.length;
  const fit = new Array<number>(w).fill(-1);
  const next = new Array<number>(w).fill(-1);
  const frames: Frame<SSFState>[] = [];

  let walkRow: number | null = null;
  let walkStart: number | null = null;
  let totalWords = 0;

  const emit = (type: string, note: string, caption: string, cur: number | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        sentence,
        rows,
        cols,
        fit: fit.slice(),
        next: next.slice(),
        cur,
        walkRow,
        walkStart,
        totalWords,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `${rows}×${cols}`,
    `Sentence Screen Fitting: how many times does [${sentence.map((x) => `"${x}"`).join(', ')}] fit on a ${rows}-row, ${cols}-column screen? First precompute fit[w] = words that fit on one row that starts at word w, then walk ${rows} rows and total the words placed.`,
    null,
  );

  for (let s = 0; s < w; s++) {
    const { count, next: nx } = measure(sentence, cols, s);
    fit[s] = count;
    next[s] = nx;
    emit(
      'FILL',
      `fit[${s}]=${count}`,
      `Starting at word ${s} ("${sentence[s]}"), ${count} word(s) fit in ${cols} columns; the next row then starts at word ${nx}. fit[${s}] = ${count}.`,
      s,
    );
  }

  // Counting phase: walk `rows` rows, accumulate words placed.
  let start = 0;
  for (let r = 0; r < rows; r++) {
    walkRow = r;
    walkStart = start;
    const placed = fit[start];
    totalWords += placed;
    const nx = next[start];
    emit(
      'WALK',
      `row ${r}: +${placed}`,
      `Row ${r} starts at word ${start}, placing ${placed} word(s) — running total ${totalWords} word(s). The next row starts at word ${nx}.`,
      start,
    );
    start = nx;
  }

  const answer = Math.floor(totalWords / w);
  walkRow = null;
  walkStart = null;
  emit(
    'DONE',
    `${answer}×`,
    `Across ${rows} rows we placed ${totalWords} word(s); the sentence has ${w} word(s), so it fits floor(${totalWords} / ${w}) = ${answer} time(s).`,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SSFState>) {
  const s = frame.state;
  const cells = s.fit.map((v) => (v < 0 ? '' : v));
  const pointers: ArrayPointer[] = [];
  if (s.cur !== null) pointers.push({ i: s.cur, label: 'start', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.cur === i ? 'found' : s.fit[i] >= 0 ? 'match' : '');
  const w = s.sentence.length;
  const allFit = s.fit.every((v) => v >= 0);
  const answer = s.done ? `${Math.floor(s.totalWords / w)}×` : allFit ? `${s.totalWords} words so far` : '…precomputing';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        [{s.sentence.map((x) => `"${x}"`).join(', ')}], {s.rows}×{s.cols} screen, fits ={' '}
        <span className="font-mono text-ink">{answer}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} label={(i) => `"${s.sentence[i]}"`} />
      <div className={cn(vizText.sm, 'text-ink3')}>index = start word, value = words that fit on one row</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SSFState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const w = s.sentence.length;
  const answer = s.done ? `${Math.floor(s.totalWords / w)}×` : '…computing';
  return (
    <VarGrid>
      <InspectorRow k="screen" v={`${s.rows}×${s.cols}`} />
      <InspectorRow k="start word" v={s.cur !== null ? `${s.cur} ("${s.sentence[s.cur]}")` : s.walkStart !== null ? `${s.walkStart}` : '—'} />
      <InspectorRow k="row" v={s.walkRow !== null ? s.walkRow : '—'} />
      <InspectorRow k="words placed" v={s.totalWords} />
      <InspectorRow k="answer" v={answer} />
    </VarGrid>
  );
}

export const manifestId = 'imp-83-sentence-screen-fitting';
export const title = 'Sentence Screen Fitting';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'hello-world', label: '["hello","world"], 2×8 (1)', value: { sentence: ['hello', 'world'], rows: 2, cols: 8 } },
    { id: 'a-bcd-e', label: '["a","bcd","e"], 3×6 (2)', value: { sentence: ['a', 'bcd', 'e'], rows: 3, cols: 6 } },
  ] satisfies SampleInput<SSFInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SSFState | undefined;
    const v = s ? Math.floor(s.totalWords / s.sentence.length) : 0;
    return { ok: true, label: `${v}×` };
  },
};

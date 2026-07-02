import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';

interface RleInput {
  s: string;
}

interface RleState {
  chars: string[]; // input split into characters
  i: number | null; // scan index (the char being compared, from 1)
  runStart: number | null; // index where the current run began
  c: string | null; // the run character we are counting
  run: number; // length of the current run so far
  out: string; // encoded output built so far
  done: boolean;
}

function record({ s }: RleInput): Frame<RleState>[] {
  const chars = s.split('');
  const { emit, frames } = createRecorder<RleState>(() => ({
        chars,
        i: null,
        runStart: null,
        c: null,
        run: 0,
        out: '',
        done: false
      }));

  if (chars.length === 0) {
    emit('INIT', 'empty', 'The input string is empty, so run-length encoding returns the empty string.', { out: '', done: true }, 'good');
    return frames;
  }

  let out = '';
  let run = 1;
  let c = chars[0];
  let runStart = 0;

  emit(
    'INIT',
    `c='${c}' run=1`,
    `Run-length encoding squashes each maximal run of equal characters into character+count. Seed the first run: character '${c}' with run = 1, starting at index 0.`,
    { runStart, c, run, out },
  );

  for (let i = 1; i < chars.length; i++) {
    if (chars[i] === c) {
      run++;
      emit(
        'EXTEND',
        `run=${run}`,
        `Index ${i} is '${chars[i]}', the same as the current run character '${c}', so extend the run: run = ${run}.`,
        { i, runStart, c, run, out },
      );
    } else {
      out += `${c}${run}`;
      emit(
        'FLUSH',
        `+'${c}${run}'`,
        `Index ${i} is '${chars[i]}', different from '${c}'. Flush the finished run as '${c}${run}' into the output, then start a new run at this character.`,
        { i, runStart, c, run, out },
      );
      c = chars[i];
      run = 1;
      runStart = i;
      emit(
        'RESET',
        `c='${c}' run=1`,
        `Begin a new run: character '${c}' with run = 1, starting at index ${i}.`,
        { i, runStart, c, run, out },
      );
    }
  }

  out += `${c}${run}`;
  emit(
    'FINAL',
    `+'${c}${run}'`,
    `The scan is over, but the last run '${c}${run}' has not been written yet. Flush it now. Encoded result: "${out}".`,
    { i: chars.length - 1, runStart, c, run, out, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<RleState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.runStart !== null && s.runStart !== s.i)
    pointers.push({ i: s.runStart, label: 'run', tone: 'good', place: 'below' });
  const win: [number, number] | null =
    s.runStart !== null && s.i !== null && s.i >= s.runStart ? [s.runStart, s.i] : null;
  const tone = (idx: number) => {
    if (s.done) return 'found';
    if (s.i === idx) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        current run:{' '}
        <span className="font-mono text-ink">'{s.c ?? '·'}'</span> × {s.run}
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={win} />
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink')}>
        out = "{s.out || '·'}"
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RleState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i (scan)" v={s.i ?? '—'} />
      <InspectorRow k="chars[i]" v={s.i !== null ? `'${s.chars[s.i]}'` : '—'} />
      <InspectorRow k="run char c" v={s.c !== null ? `'${s.c}'` : '—'} />
      <InspectorRow k="run length" v={s.run} />
      <InspectorRow k="output" v={s.out ? `"${s.out}"` : s.done ? '""' : '…'} />
    </VarGrid>
  );
}

function encode(s: string): string {
  const chars = s.split('');
  if (chars.length === 0) return '';
  let out = '';
  let run = 1;
  let c = chars[0];
  for (let i = 1; i < chars.length; i++) {
    if (chars[i] === c) {
      run++;
    } else {
      out += `${c}${run}`;
      c = chars[i];
      run = 1;
    }
  }
  out += `${c}${run}`;
  return out;
}

export const manifestId = 'prep-strings-run-length-encoding';
export const title = 'Run length encoding';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'rle1', label: '"aaabbc"', value: { s: 'aaabbc' } },
    { id: 'rle2', label: '"wwwwaaa"', value: { s: 'wwwwaaa' } },
  ] satisfies SampleInput<RleInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RleState | undefined;
    const answer = s ? encode(s.chars.join('')) : '';
    return { ok: true, label: `"${answer}"` };
  },
};

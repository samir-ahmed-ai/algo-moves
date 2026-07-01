import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Read4Input {
  /** Chunks returned by each read4 call (each up to 4 chars). */
  chunks: string[];
  reads: number[];
}

interface Read4State {
  chunks: string[];
  chunkIdx: number;
  buf4: string;
  i4: number;
  n4: number;
  readN: number;
  out: string;
  op: string;
  done: boolean;
}

function record({ chunks, reads }: Read4Input): Frame<Read4State>[] {
  const frames: Frame<Read4State>[] = [];
  let chunkIdx = 0;
  let buf4 = '';
  let i4 = 0;
  let n4 = 0;

  const read4 = (): number => {
    if (chunkIdx >= chunks.length) return 0;
    buf4 = chunks[chunkIdx].slice(0, 4);
    chunkIdx++;
    return buf4.length;
  };

  const emit = (type: string, note: string, caption: string, s: Partial<Read4State>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        chunks: [...chunks],
        chunkIdx,
        buf4,
        i4,
        n4,
        readN: 0,
        out: '',
        op: '',
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${chunks.length} chunks`,
    `Read4 II: internal buf4 buffer. When i4==n4, call read4() to refill. Copy chars into user buf until n chars or EOF.`,
    {},
  );

  for (const n of reads) {
    let total = 0;
    const outChars: string[] = [];
    while (total < n) {
      if (i4 === n4) {
        n4 = read4();
        i4 = 0;
        emit(
          'REFILL',
          buf4 || 'EOF',
          `Buffer empty → read4() returns ${n4} char(s): "${buf4 || ''}".`,
          { buf4, i4, n4, chunkIdx, readN: n },
        );
        if (n4 === 0) break;
      }
      outChars.push(buf4[i4]);
      i4++;
      total++;
    }
    emit(
      'READ',
      `${total} chars`,
      `Read(buf, ${n}): copied ${total} char(s) "${outChars.join('')}" from buf4.`,
      { op: `read(${n})`, readN: n, out: outChars.join(''), i4, n4, buf4 },
      'good',
    );
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<Read4State>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.out && <span className="ml-2 font-mono text-good">&quot;{s.out}&quot;</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        buf4: &quot;{s.buf4 || '—'}&quot; · i4={s.i4} n4={s.n4}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>read4 chunks ({s.chunkIdx}/{s.chunks.length} used)</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {s.chunks.map((c, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i < s.chunkIdx ? 'border-edge text-ink3 line-through' : i === s.chunkIdx ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<Read4State>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="read n" v={s.readN || '—'} />
      <InspectorRow k="output" v={s.out || '—'} />
      <InspectorRow k="i4 / n4" v={`${s.i4} / ${s.n4}`} />
      <InspectorRow k="chunk idx" v={s.chunkIdx} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-read-n-characters-given-read4-ii-call-multiple-times';
export const title = 'Read N Characters Given read4 II Call Multiple Times';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'r4a',
      label: 'abc · read 1,3,1',
      value: { chunks: ['abc'], reads: [1, 3, 1] },
    },
    {
      id: 'r4b',
      label: 'split chunks',
      value: { chunks: ['ab', 'cd'], reads: [3, 2] },
    },
  ] satisfies SampleInput<Read4Input>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as Read4State | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};

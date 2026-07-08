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
  let chunkIdx = 0;
  let buf4 = '';
  let i4 = 0;
  let n4 = 0;

  const read4 = (): number => {
    if (chunkIdx >= chunks.length) return 0;
    buf4 = chunks[chunkIdx]!.slice(0, 4);
    chunkIdx++;
    return buf4.length;
  };

  const { emit, frames } = createPrepRecorder<Read4State>(() => ({
    chunks: [...chunks],
    chunkIdx,
    buf4,
    i4,
    n4,
    readN: 0,
    out: '',
    op: '',
    done: false,
  }));

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
      outChars.push(buf4[i4]!);
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
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.out && <RailStat k="out" v={`"${s.out}"`} tone="good" />}
      </RailGroup>
      <RailGroup label="buf4">
        <RailStat k="buf" v={s.buf4 || '—'} />
        <RailStat k="i4" v={s.i4} />
        <RailStat k="n4" v={s.n4} />
      </RailGroup>
      <RailGroup label="chunks">
        <RailStat k="idx" v={`${s.chunkIdx}/${s.chunks.length}`} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
        {s.chunks.map((c, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i < s.chunkIdx
                ? 'border-edge text-ink3 line-through'
                : i === s.chunkIdx
                  ? 'border-accent bg-accentbg'
                  : 'border-edge',
            )}
          >
            {c}
          </span>
        ))}
      </div>
    </VizStage>
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does Read4 II buffer characters between calls?',
    choices: [
      {
        label: 'Internal buf4 with i4/n4 — refill when i4 equals n4',
        correct: true,
      },
      {
        label: 'Per-index snap history — binary search prior versions',
      },
      {
        label: 'RLE count-value pairs — consume runs from flat encoding',
      },
      {
        label: 'Row/col/diag sums — track tic-tac-toe win lines',
      },
    ],
    explain:
      'read4 fills buf4; Read copies from buf4[i4] until n chars or EOF when refill returns zero.',
  },
  {
    id: 'key-step',
    prompt: 'When does the recorder emit a REFILL frame?',
    choices: [
      {
        label: 'i4 equals n4 — buffer empty before next character copy',
        correct: true,
      },
      {
        label: 'Every Read call — refill even if buf4 still has chars',
      },
      {
        label: 'chunkIdx exceeds chunks — only after all chunks consumed',
      },
      {
        label: 'Copied n chars — refill only after full user request',
      },
    ],
    explain:
      'Inside the read loop, empty buffer triggers read4(), resets i4, and sets n4 from returned length.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space bounds for Read4 II?',
    choices: [
      {
        label: 'O(total chars read) time, O(1) extra space — fixed buf4',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — sort chunks before read',
      },
      {
        label: 'O(1) per char worst case, O(chunks) space — store all input',
      },
      {
        label: 'O(path depth) time, O(nodes) space — trie walk per char',
      },
    ],
    explain:
      'Each source character is copied once; only buf4, indices, and chunk pointer are retained.',
  },
  {
    id: 'edge',
    prompt: 'What happens when read4 returns 0 during a Read(n) call?',
    choices: [
      {
        label: 'Stop copying early — return fewer than n chars at EOF',
        correct: true,
      },
      {
        label: 'Pad with null bytes — always fill exactly n characters',
      },
      {
        label: 'Retry read4 forever — spin until non-zero length returns',
      },
      {
        label: 'Reset chunkIdx to zero — wrap and reread from first chunk',
      },
    ],
    explain:
      'After refill returns n4===0, the while loop breaks and Read reports how many chars were copied.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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

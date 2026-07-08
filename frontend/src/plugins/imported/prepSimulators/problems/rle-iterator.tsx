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

interface RleInput {
  encoding: number[];
  calls: number[];
}

interface RleState {
  enc: number[];
  idx: number;
  op: string;
  n: number;
  result: number | null;
  done: boolean;
}

function record({ encoding, calls }: RleInput): Frame<RleState>[] {
  const enc = [...encoding];
  let idx = 0;

  const { emit, frames } = createPrepRecorder<RleState>(() => ({
    enc: enc.slice(),
    idx,
    op: '',
    n: 0,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `${encoding.length / 2} pairs`,
    `RLE Iterator: encoding is [count,val,count,val,...]. Next(n) consumes counts; returns val when enough remain, else -1.`,
    {},
  );

  for (const n of calls) {
    let remaining = n;
    let result = -1;
    while (idx < enc.length) {
      if (enc[idx]! >= remaining) {
        enc[idx]! -= remaining;
        result! = enc[idx + 1]!;
        emit(
          'NEXT',
          `n=${n} → ${result}`,
          `Next(${n}): consume ${remaining} from pair [${enc[idx]! + remaining},${enc[idx + 1]!}] → return ${result}.`,
          { op: `next(${n})`, n, result, enc: enc.slice(), idx },
          'good',
        );
        remaining = 0;
        break;
      }
      remaining -= enc[idx]!;
      idx += 2;
    }
    if (remaining > 0) {
      emit(
        'EOF',
        '-1',
        `Next(${n}): exhausted encoding → return -1.`,
        { op: `next(${n})`, n, result: -1, enc: enc.slice(), idx },
        'bad',
      );
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<RleState>) {
  const s = frame.state;
  const pairs: { count: number; val: number; i: number }[] = [];
  for (let i = 0; i < s.enc.length; i += 2) {
    pairs.push({ count: s.enc[i]!, val: s.enc[i + 1]!, i });
  }
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.result !== null && (
        <RailGroup label="result">
          <RailStat k="val" v={s.result} tone="good" />
        </RailGroup>
      )}
      <RailGroup label="iter">
        <RailStat k="idx" v={s.idx} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
        {pairs.map(({ count, val, i }) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.idx
                ? 'border-accent bg-accentbg'
                : i < s.idx
                  ? 'border-edge text-ink3 line-through'
                  : 'border-edge',
            )}
          >
            {count}×{val}
          </span>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<RleState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n || '—'} />
      <InspectorRow k="result" v={s.result ?? '—'} />
      <InspectorRow k="idx" v={s.idx} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-rle-iterator';
export const title = 'RLE Iterator';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How is the RLE encoding represented for Next(n)?',
    choices: [
      {
        label: 'Flat count-value pairs — idx points at current run head',
        correct: true,
      },
      {
        label: 'Nested linked list — separate node per repeated value',
      },
      {
        label: 'Prefix sum buckets — binary search weighted index',
      },
      {
        label: 'Versioned map snapshots — copy-on-write per consume',
      },
    ],
    explain:
      'encoding alternates [count, val, count, val, ...]; Next decrements counts or advances idx by two.',
  },
  {
    id: 'key-step',
    prompt: 'When Next(n) fits in the current run, what happens?',
    choices: [
      {
        label: 'Subtract n from enc[idx] — return value at enc[idx+1]',
        correct: true,
      },
      {
        label: 'Advance idx by two always — skip entire run regardless of n',
      },
      {
        label: 'Return -1 immediately — partial consume is forbidden',
      },
      {
        label: 'Rebuild encoding array — recompress after every call',
      },
    ],
    explain:
      'Enough count at idx lets the iterator subtract remaining and return the paired value without moving idx.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for RLE Iterator?',
    choices: [
      {
        label: 'O(1) amortized Next, O(pairs) space — skip exhausted runs',
        correct: true,
      },
      {
        label: 'O(n) every Next, O(n) space — scan full encoding each call',
      },
      {
        label: 'O(log n) Next, O(1) space — heap of runs by value',
      },
      {
        label: 'O(path) Next, O(nodes) space — trie walk per character',
      },
    ],
    explain:
      'Each pair index advances only when its count is fully consumed; storage is the encoding array.',
  },
  {
    id: 'edge',
    prompt: 'When does Next emit EOF with result -1?',
    choices: [
      {
        label: 'Requested n exceeds remaining encoded values — encoding exhausted',
        correct: true,
      },
      {
        label: 'Current count equals zero — treat zero run as success',
      },
      {
        label: 'n equals zero — always return -1 on zero request',
      },
      {
        label: 'idx at array end with count left — still return last value',
      },
    ],
    explain:
      'After walking pairs, leftover remaining>0 means not enough values were left to satisfy n.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'rle1',
      label: '[3,0,2,2,1,1] · next 4,2',
      value: { encoding: [3, 0, 2, 2, 1, 1], calls: [4, 2] },
    },
  ] satisfies SampleInput<RleInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RleState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};

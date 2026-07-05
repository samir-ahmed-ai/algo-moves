import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

function record({ encoding, calls }: RleInput): Frame<RleState>[] {  const enc = [...encoding];
  let idx = 0;

  const { emit, frames } = createRecorder<RleState>(() => ({
        enc: enc.slice(),
        idx,
        op: '',
        n: 0,
        result: null,
        done: false
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
      if (enc[idx] >= remaining) {
        enc[idx] -= remaining;
        result = enc[idx + 1];
        emit(
          'NEXT',
          `n=${n} → ${result}`,
          `Next(${n}): consume ${remaining} from pair [${enc[idx] + remaining},${enc[idx + 1]}] → return ${result}.`,
          { op: `next(${n})`, n, result, enc: enc.slice(), idx },
          'good',
        );
        remaining = 0;
        break;
      }
      remaining -= enc[idx];
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
    pairs.push({ count: s.enc[i], val: s.enc[i + 1], i });
  }
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result !== null && <span className="ml-2 font-mono text-good">→ {s.result}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {pairs.map(({ count, val, i }) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.idx ? 'border-accent bg-accentbg' : i < s.idx ? 'border-edge text-ink3 line-through' : 'border-edge',
            )}
          >
            {count}×{val}
          </span>
        ))}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>idx = {s.idx}</div>
    </div>
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
    id: "pattern",
    prompt: "Which approach fits \"RLE Iterator\"?",
    choices: [
      {
        label: "Design — fits this problem",
        correct: true
      },
      {
        label: "Trie dictionary + spell suggest — different approach"
      },
      {
        label: "Hash map + doubly linked list LRU — different approach"
      },
      {
        label: "Heap + Sorted Available Set — different approach"
      }
    ],
    explain: "See Rle Iterator pattern"
  },
  {
    id: "init",
    prompt: "At the start of a run (RLE Iterator), what strategy is established?",
    choices: [
      {
        label: "See Rle Iterator pattern — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "RLE Iterator: encoding is [count,val,count,val,...]. Next(n) consumes counts; returns val when enough remain, else -1."
  },
  {
    id: "key-step",
    prompt: "On the \"NEXT\" step (n= → ), what happens?",
    choices: [
      {
        label: "Next(): consume from pair [,] → — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "Next(): consume  from pair [,] → return ."
  },
  {
    id: "state",
    prompt: "What does the `enc` field track in the visualization state?",
    choices: [
      {
        label: "Field enc in state — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder snapshots `enc` on every emit so each frame shows the algorithm mid-step."
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Next(): consume from pair [,] → — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "Next(): consume  from pair [,] → return ."
  }
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

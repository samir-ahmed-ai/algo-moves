import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { createRecorder } from '../../../_shared/createRecorder';
import { minHeapPopGeneric, minHeapPushGeneric } from '../../../_shared/dualHeapBoard';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface StreamItem {
  val: number;
  stream: number;
  idx: number;
}

interface MergeStreamsInput {
  streams: number[][];
}

interface MergeStreamsState {
  streams: number[][];
  /** Each stream's next unread index. */
  cursors: number[];
  heap: StreamItem[];
  out: number[];
  popped: StreamItem | null;
  done: boolean;
}

const cmpStreamItem = (a: StreamItem, b: StreamItem) => a.val - b.val;

function record({ streams }: MergeStreamsInput): Frame<MergeStreamsState>[] {
  const cursors = streams.map(() => 0);
  let heap: StreamItem[] = [];
  const out: number[] = [];

  const { emit, frames } = createRecorder<MergeStreamsState>(() => ({
    streams,
    cursors: cursors.slice(),
    heap: heap.slice(),
    out: out.slice(),
    popped: null,
    done: false,
  }));

  emit(
    'INIT',
    `k=${streams.length}`,
    `Merge K sorted streams: seed a min-heap with the first element of each non-empty stream. Repeatedly popMin, append to output, push that stream's next.`,
    {},
  );

  for (let si = 0; si < streams.length; si++) {
    if (streams[si].length > 0) {
      const it: StreamItem = { val: streams[si][0], stream: si, idx: 0 };
      heap = minHeapPushGeneric(heap, it, cmpStreamItem);
      emit(
        'SEED',
        `s${si}→${it.val}`,
        `Seed heap with stream ${si}'s head: ${it.val}.`,
        { heap: heap.slice(), cursors: cursors.slice() },
      );
    }
  }

  while (heap.length > 0) {
    let popped: StreamItem;
    [heap, popped] = minHeapPopGeneric(heap, cmpStreamItem);
    out.push(popped.val);
    emit(
      'POP',
      `take ${popped.val}`,
      `PopMin: value ${popped.val} from stream ${popped.stream} (index ${popped.idx}). Append to merged output.`,
      { heap: heap.slice(), out: out.slice(), popped, cursors: cursors.slice() },
      'good',
    );
    cursors[popped.stream] = popped.idx + 1;
    const next = popped.idx + 1;
    if (next < streams[popped.stream].length) {
      const nxt: StreamItem = { val: streams[popped.stream][next], stream: popped.stream, idx: next };
      heap = minHeapPushGeneric(heap, nxt, cmpStreamItem);
      emit(
        'PUSH',
        `s${nxt.stream}→${nxt.val}`,
        `Stream ${popped.stream} has a next element ${nxt.val} — push it into the heap.`,
        { heap: heap.slice(), cursors: cursors.slice(), out: out.slice(), popped },
      );
    }
  }

  emit(
    'DONE',
    `[${out.join(', ')}]`,
    `Heap empty — all streams exhausted. Merged sorted output: [${out.join(', ')}].`,
    { out: out.slice(), done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MergeStreamsState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailStack
        label="min-heap"
        items={s.heap.length ? [...s.heap].sort((a, b) => a.val - b.val).map((it) => `s${it.stream}:${it.val}`) : []}
        topLabel="min"
      />
      <RailGroup label="last pop">
        <RailStat k="stream" v={s.popped ? `s${s.popped.stream}` : '—'} />
        <RailStat k="val" v={s.popped ? s.popped.val : '—'} tone="accent" />
      </RailGroup>
      <RailResult label="merged" value={s.out.length ? `[${s.out.join(', ')}]` : '—'} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <div className={cn(vizText.sm, 'text-ink3')}>streams (cursors mark next unread)</div>
      {s.streams.map((st, si) => (
        <div key={si} className={cn('font-mono', vizText.sm)}>
          s{si}:{' '}
          {st.map((v, i) => (
            <span
              key={i}
              className={cn(
                'mr-1',
                i < s.cursors[si] ? 'text-ink3 line-through' : i === s.cursors[si] ? 'rounded bg-accentbg text-accent' : 'text-ink',
              )}
            >
              {v}
            </span>
          ))}
        </div>
      ))}
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MergeStreamsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="heap size" v={s.heap.length} />
      <InspectorRow k="heap min" v={s.heap.length ? Math.min(...s.heap.map((h) => h.val)) : '—'} />
      <InspectorRow k="merged len" v={s.out.length} />
      <InspectorRow k="last popped" v={s.popped ? `s${s.popped.stream}:${s.popped.val}` : '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-merge-k-sorted-streams-in-one';
export const title = 'Merge K sorted streams in one';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Merge K sorted streams in one\"?",
    choices: [
      {
        label: "K-way merge with min-heap — fits this problem",
        correct: true
      },
      {
        label: "In-place byte reversal — different approach"
      },
      {
        label: "Streaming palindrome stack — different approach"
      },
      {
        label: "Min-heap size k — different approach"
      }
    ],
    explain: "Min-heap holds each stream's head; pop min, push that stream's next"
  },
  {
    id: "init",
    prompt: "At the start of a run (Merge K sorted streams in one), what strategy is established?",
    choices: [
      {
        label: "Min-heap holds each stream's head; pop — described in INIT caption",
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
    explain: "Merge K sorted streams: seed a min-heap with the first element of each non-empty stream. Repeatedly popMin, append to output, push that stream's next."
  },
  {
    id: "key-step",
    prompt: "On the \"POP\" step (take ), what happens?",
    choices: [
      {
        label: "PopMin: value from stream (index ). — this move caption",
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
    explain: "PopMin: value  from stream  (index ). Append to merged output."
  },
  {
    id: "state",
    prompt: "What does the `streams` field track in the visualization state?",
    choices: [
      {
        label: "Field streams in state — updated each frame",
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
    explain: "The recorder snapshots `streams` on every emit so each frame shows the algorithm mid-step."
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Merge K sorted streams in one\"?",
    choices: [
      {
        label: "O(total * log k) time, O(k) space — standard bounds here",
        correct: true
      },
      {
        label: "O(entries) time, O(depth) space — wrong order of growth"
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(log n) per add time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(total * log k). O(k). seed heap with first of each; pop -> append -> push next from same stream"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Heap empty — all streams exhausted. — final DONE caption",
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
    explain: "Heap empty — all streams exhausted. Merged sorted output: []."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'mks1',
      label: '[[1,4,7],[2,5,8],[3,6,9]]',
      value: { streams: [[1, 4, 7], [2, 5, 8], [3, 6, 9]] },
    },
    {
      id: 'mks2',
      label: '[[1,10],[2,3,4]]',
      value: { streams: [[1, 10], [2, 3, 4]] },
    },
  ] satisfies SampleInput<MergeStreamsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MergeStreamsState | undefined;
    if (!s?.done) return { ok: false, label: 'incomplete' };
    const flat = s.streams.flat().sort((a, b) => a - b);
    const ok = s.out.length === flat.length && s.out.every((v, i) => v === flat[i]);
    return { ok, label: `[${s.out.join(', ')}]` };
  },
};

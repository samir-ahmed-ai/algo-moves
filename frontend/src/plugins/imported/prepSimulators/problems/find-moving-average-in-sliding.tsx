import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { QueueTape } from '../../../../components/board/QueueTape';

interface MovingAvgInput {
  size: number; // fixed window size k
  stream: number[]; // values fed to Next(), one per call
}

interface MovingAvgState {
  size: number;
  window: number[]; // current contents of the sliding window (front = index 0)
  sum: number; // running sum of the window
  val: number | null; // value being added on this Next() call
  evicted: number | null; // value evicted from the front (if any)
  average: number | null; // sum / len returned by this Next()
  step: number; // which Next() call we are on (1-based; 0 = init)
  done: boolean;
}

const round = (x: number) => Math.round(x * 1000) / 1000;

function record({ size, stream }: MovingAvgInput): Frame<MovingAvgState>[] {  const window: number[] = [];
  let sum = 0;

  const { emit, frames } = createRecorder<MovingAvgState>(() => ({
        size,
        window: window.slice(),
        sum,
        val: null,
        evicted: null,
        average: null,
        step: 0,
        done: false
      }));

  emit(
    'INIT',
    `k=${size}`,
    `Moving Average: keep a queue holding at most k=${size} of the most recent values plus their running sum. Each Next(v) appends v and adds it to the sum, evicts the oldest if the window overflows, then returns sum ÷ window length — all in O(1).`,
    {},
  );

  let lastAverage: number | null = null;

  for (let step = 1; step <= stream.length; step++) {
    const val = stream[step - 1];

    // append val + add to running sum
    window.push(val);
    sum += val;
    emit(
      'ADD',
      `+${val}`,
      `Next(${val}): push ${val} onto the back of the queue and add it to the running sum, so sum = ${round(sum)}. The window now holds ${window.length} value${window.length === 1 ? '' : 's'}.`,
      { val, step },
    );

    // if over size, evict front and subtract it
    if (window.length > size) {
      const evicted = window.shift()!;
      sum -= evicted;
      emit(
        'EVICT',
        `−${evicted}`,
        `The window exceeded k=${size}, so evict the oldest value ${evicted} from the front and subtract it: sum = ${round(sum)}. The window is back down to ${window.length} value${window.length === 1 ? '' : 's'}.`,
        { val, evicted, step },
      );
    }

    // return sum / len
    const average = sum / window.length;
    lastAverage = average;
    emit(
      'AVG',
      `${round(average)}`,
      `Return the average over the current window: sum ${round(sum)} ÷ ${window.length} = ${round(average)}. This is the result of Next(${val}).`,
      { val, average, step },
      'good',
    );
  }

  emit(
    'DONE',
    lastAverage === null ? 'no calls' : `${round(lastAverage)}`,
    lastAverage === null
      ? `No values were streamed in, so there is no moving average to report.`
      : `All ${stream.length} value${stream.length === 1 ? '' : 's'} processed. The last Next() returned a moving average of ${round(lastAverage)}.`,
    { average: lastAverage, step: stream.length, done: true },
    lastAverage === null ? 'bad' : 'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MovingAvgState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        window size k = <span className="font-mono text-ink">{s.size}</span>
        {s.val !== null && !s.done && (
          <>
            {' · '}Next(<span className="font-mono text-ink">{s.val}</span>)
          </>
        )}
      </div>
      <QueueTape items={s.window} label="window · oldest →" />
      <div className={cn('mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono', vizText.sm, 'text-ink3')}>
        <span>
          sum = <span className="text-ink">{round(s.sum)}</span>
        </span>
        <span>
          len = <span className="text-ink">{s.window.length}</span>
        </span>
        {s.evicted !== null && (
          <span className="text-bad">evicted {s.evicted}</span>
        )}
      </div>
      {s.average !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → average = {round(s.average)}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MovingAvgState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="window size k" v={s.size} />
      <InspectorRow k="call #" v={s.step > 0 ? s.step : '—'} />
      <InspectorRow k="val added" v={s.val ?? '—'} />
      <InspectorRow k="evicted" v={s.evicted ?? '—'} />
      <InspectorRow k="window" v={`[${s.window.join(', ')}]`} />
      <InspectorRow k="sum" v={round(s.sum)} />
      <InspectorRow k="len" v={s.window.length} />
      <InspectorRow k="average" v={s.average === null ? '…' : round(s.average)} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-find-moving-average-in-sliding';
export const title = 'Find moving average in sliding';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Find moving average in sliding\"?",
    choices: [
      {
        label: "Sliding window queue + running sum — fits this problem",
        correct: true
      },
      {
        label: "Dual Stack (counts + strings) — different approach"
      },
      {
        label: "Reverse scan prefix stack — different approach"
      },
      {
        label: "Right-to-Left Max Scan — different approach"
      }
    ],
    explain: "Fixed-size window slides; answer is sum/size"
  },
  {
    id: "init",
    prompt: "At the start of a run (Find moving average in sliding), what strategy is established?",
    choices: [
      {
        label: "Fixed-size window slides; answer — described in INIT caption",
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
    explain: "Moving Average: keep a queue holding at most k= of the most recent values plus their running sum. Each Next(v) appends v and adds it to the sum, evicts the oldest if the window overflows, then returns sum ÷ window length — all in O(1)."
  },
  {
    id: "key-step",
    prompt: "On the \"EVICT\" step (−), what happens?",
    choices: [
      {
        label: "The window exceeded k=, so evict — this move caption",
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
    explain: "The window exceeded k=, so evict the oldest value  from the front and subtract it: sum = . The window is back down to  value."
  },
  {
    id: "state",
    prompt: "What does the `window` field track in the visualization state?",
    choices: [
      {
        label: "current contents of the sliding — updated each frame",
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
    explain: "The recorder keeps `window` in sync: current contents of the sliding window (front = index 0)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Find moving average in sliding\"?",
    choices: [
      {
        label: "O(1) per next time, O(k) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n³) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n) time, O(k) space — wrong order of growth"
      },
      {
        label: "O(log n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(1) per next. O(k). append val and add; if over size evict front; return sum/len"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Return the average over the current — final DONE caption",
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
    explain: "Return the average over the current window: sum  ÷  = . This is the result of Next()."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ma1', label: 'k=3 · [1,10,3,5]', value: { size: 3, stream: [1, 10, 3, 5] } },
    { id: 'ma2', label: 'k=2 · [4,4,8,2,6]', value: { size: 2, stream: [4, 4, 8, 2, 6] } },
  ] satisfies SampleInput<MovingAvgInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MovingAvgState | undefined;
    if (!s || s.average === null) return { ok: false, label: 'no calls' };
    return { ok: true, label: `avg ${round(s.average)}` };
  },
};

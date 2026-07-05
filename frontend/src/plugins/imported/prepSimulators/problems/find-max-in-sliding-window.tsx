import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MaxWindowInput {
  nums: number[];
  k: number;
}

interface MaxWindowState {
  nums: number[];
  k: number;
  i: number | null; // index currently being processed
  dq: number[]; // monotonic decreasing deque of indices (front = max)
  res: number[]; // window maxima recorded so far
  windowLo: number | null; // current window start (i-k+1) once a full window exists
  popped: number | null; // index just popped off the tail (for highlight)
  dropped: number | null; // index just dropped off the front (out of window)
  recorded: number | null; // index whose value was just recorded as a max
  done: boolean;
}

function record({ nums, k }: MaxWindowInput): Frame<MaxWindowState>[] {  const dq: number[] = [];
  const res: number[] = [];

  const { emit, frames } = createRecorder<MaxWindowState>(() => ({
        nums,
        k,
        i: null,
        dq: dq.slice(),
        res: res.slice(),
        windowLo: null,
        popped: null,
        dropped: null,
        recorded: null,
        done: false
      }));

  emit(
    'INIT',
    `k=${k}`,
    `Find the max of every window of size ${k}. We keep a deque of indices whose values are strictly decreasing front-to-back, so the front index always holds the current window's maximum. Time O(n), Space O(${k}).`,
    {},
  );

  if (k === 0 || nums.length === 0) {
    emit('DONE', 'empty', `k is 0 or the array is empty, so there are no windows. Return [].`, { done: true }, 'bad');
    return frames;
  }

  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    emit(
      'SCAN',
      `i=${i} x=${x}`,
      `Look at index ${i} (value ${x}). Before pushing it, drop any tail indices whose value is ≤ ${x} — they can never be the max while ${x} is in the window.`,
      { i },
    );

    while (dq.length > 0 && nums[dq[dq.length - 1]] <= x) {
      const p = dq[dq.length - 1];
      dq.pop();
      emit(
        'POP_TAIL',
        `pop ${p}`,
        `nums[${p}] = ${nums[p]} ≤ ${x}, so pop index ${p} off the tail; a later, larger (or equal, newer) value dominates it.`,
        { i, popped: p },
      );
    }

    dq.push(i);
    emit(
      'PUSH',
      `push ${i}`,
      `Push index ${i} onto the tail. The deque values stay decreasing front-to-back, so the front still names the window's max candidate.`,
      { i },
    );

    if (dq[0] <= i - k) {
      const old = dq[0];
      dq.shift();
      emit(
        'DROP_FRONT',
        `drop ${old}`,
        `The front index ${old} is now outside the window [${i - k + 1}, ${i}] (it is ≤ ${i} − ${k} = ${i - k}), so drop it from the front.`,
        { i, dropped: old, windowLo: i - k + 1 },
      );
    }

    if (i >= k - 1) {
      const front = dq[0];
      res.push(nums[front]);
      emit(
        'RECORD',
        `max=${nums[front]}`,
        `Window [${i - k + 1}, ${i}] is complete. The front of the deque is index ${front}, so its value ${nums[front]} is this window's maximum — record it.`,
        { i, windowLo: i - k + 1, recorded: front },
        'good',
      );
    }
  }

  emit(
    'DONE',
    `[${res.join(',')}]`,
    `Every window has been processed. The list of window maxima is [${res.join(', ')}].`,
    { done: true, windowLo: nums.length - k },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MaxWindowState>) {
  const s = frame.state;
  const lo = s.windowLo;
  const hi = lo !== null ? lo + s.k - 1 : null;
  const front = s.dq.length > 0 ? s.dq[0] : null;

  const pointers: ArrayPointer[] = [];
  if (s.i !== null && !s.done) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (front !== null) pointers.push({ i: front, label: 'max', tone: 'good', place: 'below' });

  const windowRange: [number, number] | null =
    lo !== null && hi !== null && hi < s.nums.length ? [lo, hi] : null;

  const tone = (idx: number) => {
    if (s.recorded === idx) return 'found';
    if (s.popped === idx || s.dropped === idx) return 'dead';
    if (s.dq.includes(idx)) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {lo !== null && hi !== null && hi < s.nums.length && (
          <>
            {' · '}window{' '}
            <span className="font-mono text-ink">
              [{lo}, {hi}]
            </span>
          </>
        )}
      </div>

      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={windowRange} />

      <div className={cn('mt-1 flex items-center gap-1 font-mono', vizText.sm, 'text-ink3')}>
        <span>deque(idx):</span>
        {s.dq.length === 0 ? (
          <span className="text-ink3">empty</span>
        ) : (
          s.dq.map((idx, pos) => (
            <span
              key={idx}
              className={cn(
                'rounded border border-edge px-1',
                pos === 0 ? 'text-good' : 'text-ink',
              )}
            >
              {idx}:{s.nums[idx]}
            </span>
          ))
        )}
      </div>

      <div className={cn('mt-1 font-mono text-good', vizText.base)}>
        → [{s.res.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MaxWindowState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const front = s.dq.length > 0 ? s.dq[0] : null;
  return (
    <VarGrid>
      <InspectorRow k="k (window)" v={s.k} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="deque (idx)" v={s.dq.length ? `[${s.dq.join(', ')}]` : 'empty'} />
      <InspectorRow k="front max" v={front !== null ? s.nums[front] : '—'} />
      <InspectorRow k="result" v={`[${s.res.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-find-max-in-sliding-window';
export const title = 'Find max in sliding window';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Find max in sliding window\"?",
    choices: [
      {
        label: "Monotonic decreasing deque — fits this problem",
        correct: true
      },
      {
        label: "Two Pointers — different approach"
      },
      {
        label: "Postfix evaluation stack — different approach"
      },
      {
        label: "Shunting-yard (no parens) — different approach"
      }
    ],
    explain: "Decreasing deque of indices; the front holds the window max"
  },
  {
    id: "init",
    prompt: "At the start of a run (Find max in sliding window), what strategy is established?",
    choices: [
      {
        label: "Decreasing deque of indices; the front — described in INIT caption",
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
    explain: "Find the max of every window of size . We keep a deque of indices whose values are strictly decreasing front-to-back, so the front index always holds the current window's maximum. Time O(n), Space O()."
  },
  {
    id: "key-step",
    prompt: "On the \"PUSH\" step (push ), what happens?",
    choices: [
      {
        label: "Push index onto the tail. — this move caption",
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
    explain: "Push index  onto the tail. The deque values stay decreasing front-to-back, so the front still names the window's max candidate."
  },
  {
    id: "state",
    prompt: "What does the `i` field track in the visualization state?",
    choices: [
      {
        label: "index currently being processed — updated each frame",
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
    explain: "The recorder keeps `i` in sync: index currently being processed"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Find max in sliding window\"?",
    choices: [
      {
        label: "O(n) time, O(k) space — standard bounds here",
        correct: true
      },
      {
        label: "O(1) per op time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n²) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n·maxK) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(k). pop smaller tail; drop front if out of window; record at i>=k-1"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Every window has been processed. — final DONE caption",
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
    explain: "Every window has been processed. The list of window maxima is []."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'mw1', label: '[1,3,-1,-3,5,3], k=3', value: { nums: [1, 3, -1, -3, 5, 3], k: 3 } },
    { id: 'mw2', label: '[9,11,8,5,7], k=2', value: { nums: [9, 11, 8, 5, 7], k: 2 } },
  ] satisfies SampleInput<MaxWindowInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MaxWindowState | undefined;
    const res = s?.res ?? [];
    return { ok: res.length > 0, label: `[${res.join(', ')}]` };
  },
};

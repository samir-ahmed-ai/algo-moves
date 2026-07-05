import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface ShortestInput {
  nums: number[];
  target: number;
}

interface ShortestState {
  nums: number[];
  target: number;
  l: number; // left edge of the window
  r: number | null; // right edge just added (null before the scan)
  sum: number; // running sum over nums[l..r]
  best: number; // shortest window length found so far (0 = none yet)
  windowLen: number | null; // r-l+1 recorded on this step, if any
  done: boolean;
}

const INF = Number.MAX_SAFE_INTEGER;

function record({ nums, target }: ShortestInput): Frame<ShortestState>[] {
  let sum = 0;
  let l = 0;
  let best = INF;

  const { emit, frames } = createRecorder<ShortestState>(() => ({
    nums,
    target,
    l: 0,
    r: null,
    sum: 0,
    best: 0,
    windowLen: null,
    done: false,
  }));

  emit(
    'INIT',
    `target=${target}`,
    `Shortest subarray reaching a target sum. Slide a window: grow the right edge to add elements, and shrink from the left while the window sum still reaches ${target}, recording the smallest length seen.`,
    { l, r: null, sum, best: 0 },
  );

  for (let r = 0; r < nums.length; r++) {
    sum += nums[r];
    emit(
      'GROW',
      `+nums[${r}]=${nums[r]}`,
      `Grow the window: add nums[${r}] = ${nums[r]}. The window is [${l}..${r}] with sum ${sum}.`,
      { l, r, sum, best: best === INF ? 0 : best },
    );

    while (sum >= target) {
      const windowLen = r - l + 1;
      const isBetter = windowLen < best;
      if (isBetter) best = windowLen;
      emit(
        isBetter ? 'RECORD' : 'SHRINK',
        `len ${windowLen}`,
        `Window [${l}..${r}] has sum ${sum} ≥ ${target}. Its length is ${r} − ${l} + 1 = ${windowLen}` +
          (isBetter
            ? `, the shortest so far — record best = ${windowLen}.`
            : `, not shorter than the current best (${best}).`) +
          ` Now shrink from the left: drop nums[${l}] = ${nums[l]}.`,
        { l, r, sum, best, windowLen },
        isBetter ? 'good' : undefined,
      );
      sum -= nums[l];
      l++;
    }
  }

  const answer = best === INF ? 0 : best;
  emit(
    'DONE',
    answer === 0 ? 'none' : `best=${answer}`,
    answer === 0
      ? `The scan is over and no window ever reached the target ${target}. There is no qualifying subarray, so the answer is 0.`
      : `The scan is over. The shortest subarray whose sum reaches ${target} has length ${answer}.`,
    { l, r: nums.length - 1, sum, best: answer, done: true },
    answer === 0 ? 'bad' : 'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ShortestState>) {
  const s = frame.state;
  const hasWindow = s.r !== null && s.l <= s.r;
  const pointers: ArrayPointer[] = [];
  if (hasWindow) {
    pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'below' });
    if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'good', place: 'above' });
  }
  const windowRange: [number, number] | null =
    hasWindow && s.r !== null ? [s.l, s.r] : null;
  const tone = (i: number) =>
    hasWindow && s.r !== null && i >= s.l && i <= s.r ? 'match' : '';

  const bestLabel = s.done ? (s.best === 0 ? 'none' : s.best) : s.best === 0 ? '…' : s.best;
  const winLabel = hasWindow && s.r !== null ? `[${s.l}..${s.r}]` : '—';
  const winLen = hasWindow && s.r !== null ? s.r - s.l + 1 : '—';

  const rail = (
    <>
      <RailGroup label="window">
        <RailStat k="l" v={s.l} tone="accent" />
        <RailStat k="r" v={s.r ?? '—'} tone="good" />
        <RailStat k="range" v={winLabel} />
        <RailStat k="len" v={winLen} />
      </RailGroup>
      <RailGroup label="scan">
        <RailStat k="target" v={s.target} />
        <RailStat k="sum" v={s.sum} tone={s.sum >= s.target ? 'good' : 'accent'} />
        {s.windowLen !== null && <RailStat k="recorded" v={s.windowLen} tone="good" />}
      </RailGroup>
      {(s.best > 0 || s.done) && (
        <RailResult label="best" value={bestLabel} tone={s.done ? (s.best === 0 ? 'bad' : 'good') : 'accent'} />
      )}
    </>
  );

  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={windowRange} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ShortestState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const hasWindow = s.r !== null && s.l <= s.r;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="l" v={s.l} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="window" v={hasWindow && s.r !== null ? `[${s.l}..${s.r}]` : '—'} />
      <InspectorRow k="sum" v={s.sum} />
      <InspectorRow k="best" v={s.done ? (s.best === 0 ? 'none' : s.best) : s.best === 0 ? '…' : s.best} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-shortest-subarray-contains-all';
export const title = 'Shortest subarray contains all';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Shortest subarray contains all\"?",
    choices: [
      {
        label: "Sliding window — fits this problem",
        correct: true
      },
      {
        label: "Sort + Wrap-around — different approach"
      },
      {
        label: "Adjacent swap — different approach"
      },
      {
        label: "Bijection map — different approach"
      }
    ],
    explain: "Grow right, shrink left while the running sum still reaches target"
  },
  {
    id: "init",
    prompt: "At the start of a run (Shortest subarray contains all), what strategy is established?",
    choices: [
      {
        label: "Grow right, shrink left while — described in INIT caption",
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
    explain: "Shortest subarray reaching a target sum. Slide a window: grow the right edge to add elements, and shrink from the left while the window sum still reaches , recording the smallest length seen."
  },
  {
    id: "key-step",
    prompt: "On the \"GROW\" step (+nums[]=), what happens?",
    choices: [
      {
        label: "Grow the window: add nums[] = — this move caption",
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
    explain: "Grow the window: add nums[] = . The window is [..] with sum ."
  },
  {
    id: "state",
    prompt: "What does the `l` field track in the visualization state?",
    choices: [
      {
        label: "left edge of the window — updated each frame",
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
    explain: "The recorder keeps `l` in sync: left edge of the window"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Shortest subarray contains all\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n^2) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n·L) time, O(n·L) space — wrong order of growth"
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). sum>=target -> record r-l+1, sum-=nums[l], l++"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Grow the window: add nums[] = — final DONE caption",
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
    explain: "Grow the window: add nums[] = . The window is [..] with sum ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ssc1', label: '[2,3,1,2,4,3] → 7', value: { nums: [2, 3, 1, 2, 4, 3], target: 7 } },
    { id: 'ssc2', label: '[1,1,1,1] → 6', value: { nums: [1, 1, 1, 1], target: 6 } },
  ] satisfies SampleInput<ShortestInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ShortestState | undefined;
    const answer = s ? s.best : 0;
    return answer > 0
      ? { ok: true, label: `len ${answer}` }
      : { ok: false, label: 'no subarray' };
  },
};

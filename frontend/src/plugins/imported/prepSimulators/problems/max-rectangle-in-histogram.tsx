import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface HistogramInput {
  heights: number[];
}

interface HistogramState {
  heights: number[];
  i: number | null; // current bar (or sentinel = heights.length)
  h: number | null; // current bar height (0 at the sentinel)
  stack: number[]; // monotonic-increasing stack of indices
  top: number | null; // index just popped (the bar whose rectangle we settle)
  width: number | null; // width of the settled rectangle
  area: number | null; // area of the settled rectangle
  best: number; // best area seen so far
  bestIdx: number | null; // bar that produced the current best
  done: boolean;
}

function record({ heights }: HistogramInput): Frame<HistogramState>[] {  const stack: number[] = [];
  let best = 0;
  let bestIdx: number | null = null;

  const { emit, frames } = createRecorder<HistogramState>(() => ({
        heights,
        i: null,
        h: null,
        stack: stack.slice(),
        top: null,
        width: null,
        area: null,
        best,
        bestIdx,
        done: false
      }));

  emit(
    'INIT',
    `n=${heights.length}`,
    `Max Rectangle in Histogram: find the largest axis-aligned rectangle that fits under the bar heights. We keep a stack of indices whose heights are strictly increasing; a shorter bar makes the taller ones "settle" their widest possible rectangle.`,
    {},
  );

  for (let i = 0; i <= heights.length; i++) {
    const h = i < heights.length ? heights[i] : 0;
    if (i < heights.length) {
      emit(
        'VISIT',
        `i=${i}, h=${h}`,
        `Look at bar ${i} with height ${h}. While it is shorter than the bar on top of the stack, those taller bars can no longer extend right, so we pop and settle their rectangles.`,
        { i, h },
      );
    } else {
      emit(
        'FLUSH',
        `sentinel h=0`,
        `Past the last bar we use a sentinel height of 0. Being shorter than everything, it forces every remaining bar on the stack to settle its rectangle.`,
        { i, h },
      );
    }

    while (stack.length > 0 && h < heights[stack[stack.length - 1]]) {
      const top = stack[stack.length - 1];
      stack.pop();
      let width = i;
      if (stack.length > 0) {
        width = i - stack[stack.length - 1] - 1;
      }
      const area = heights[top] * width;
      const leftBound = stack.length > 0 ? stack[stack.length - 1] : -1;
      emit(
        'POP',
        `area=${heights[top]}×${width}=${area}`,
        `Pop bar ${top} (height ${heights[top]}). It spans from just right of index ${leftBound} up to ${i - 1}, a width of ${width}. Its rectangle area is ${heights[top]} × ${width} = ${area}.`,
        { i, h, top, width, area },
      );
      if (area > best) {
        best = area;
        bestIdx = top;
        emit(
          'BEST',
          `best=${best}`,
          `That ${area} beats the previous best, so best = ${area} (from bar ${top}, height ${heights[top]}).`,
          { i, h, top, width, area },
          'good',
        );
      }
    }

    stack.push(i);
    if (i < heights.length) {
      emit(
        'PUSH',
        `push ${i}`,
        `Bar ${i} (height ${h}) is at least as tall as the stack top now, so push its index. The stack heights stay increasing.`,
        { i, h },
      );
    }
  }

  emit(
    'DONE',
    `best=${best}`,
    `Every bar has settled. The largest rectangle has area ${best}.`,
    { i: heights.length, h: 0, best, bestIdx, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<HistogramState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i < s.heights.length) {
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  }
  if (s.top !== null) {
    pointers.push({ i: s.top, label: 'pop', tone: 'bad', place: 'below' });
  }
  const stackTop = s.stack.length > 0 ? s.stack[s.stack.length - 1] : null;
  if (stackTop !== null && stackTop < s.heights.length && stackTop !== s.top) {
    pointers.push({ i: stackTop, label: 'top', tone: 'warn', place: 'below' });
  }

  const tone = (idx: number) => {
    if (s.done && idx === s.bestIdx) return 'found';
    if (idx === s.top) return 'hi';
    if (idx === s.i && s.i < s.heights.length) return 'match';
    if (s.stack.includes(idx)) return 'in-window';
    return '';
  };

  const window: [number, number] | null =
    s.top !== null && s.width !== null && s.width > 0
      ? [s.i! - s.width, s.i! - 1]
      : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        best ={' '}
        <span className="font-mono text-ink">{s.best}</span>
        {s.area !== null && (
          <>
            {' · '}rect = <span className="font-mono text-ink">{s.area}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.heights} cellTone={tone} pointers={pointers} windowRange={window} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        stack [{s.stack.join(', ')}]
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → max area = {s.best}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<HistogramState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="h (current)" v={s.h ?? '—'} />
      <InspectorRow k="stack" v={`[${s.stack.join(', ')}]`} />
      <InspectorRow k="popped bar" v={s.top ?? '—'} />
      <InspectorRow k="width" v={s.width ?? '—'} />
      <InspectorRow k="rect area" v={s.area ?? '—'} />
      <InspectorRow k="best" v={s.best} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-max-rectangle-in-histogram';
export const title = 'Max rectangle in histogram';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Max rectangle in histogram\"?",
    choices: [
      {
        label: "Monotonic stack — fits this problem",
        correct: true
      },
      {
        label: "Reverse segments — different approach"
      },
      {
        label: "Boyer-Moore voting — different approach"
      },
      {
        label: "Merge from end — different approach"
      }
    ],
    explain: "Increasing stack of bars; a shorter bar pops and settles rectangles"
  },
  {
    id: "init",
    prompt: "At the start of a run (Max rectangle in histogram), what strategy is established?",
    choices: [
      {
        label: "Increasing stack of bars; a shorter — described in INIT caption",
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
    explain: "Max Rectangle in Histogram: find the largest axis-aligned rectangle that fits under the bar heights. We keep a stack of indices whose heights are strictly increasing; a shorter bar makes the taller ones \"settle\" their widest possible rectangle."
  },
  {
    id: "key-step",
    prompt: "On the \"POP\" step (area=×=), what happens?",
    choices: [
      {
        label: "Pop bar (height ). It spans — this move caption",
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
    explain: "Pop bar  (height ). It spans from just right of index  up to , a width of . Its rectangle area is  ×  = ."
  },
  {
    id: "state",
    prompt: "What does the `i` field track in the visualization state?",
    choices: [
      {
        label: "current bar (or sentinel = — updated each frame",
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
    explain: "The recorder keeps `i` in sync: current bar (or sentinel = heights.length)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Max rectangle in histogram\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n+m) time, O(1) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). push indices; on drop pop top, width=i-stack.top-1"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Every bar has settled. The largest — final DONE caption",
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
    explain: "Every bar has settled. The largest rectangle has area ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'mh1', label: '[2,1,5,6,2,3]', value: { heights: [2, 1, 5, 6, 2, 3] } },
    { id: 'mh2', label: '[2,4]', value: { heights: [2, 4] } },
  ] satisfies SampleInput<HistogramInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as HistogramState | undefined;
    const best = s?.best ?? 0;
    return { ok: true, label: `max area ${best}` };
  },
};

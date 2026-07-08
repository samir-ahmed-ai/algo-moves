import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';
import type { DualHeapMedianState } from '../../../_shared/dualHeapMedianRecord';
import { recordDualHeapMedian } from '../../../_shared/dualHeapMedianRecord';
import { DualHeapBoard } from '../../../_shared/dualHeapBoard';

interface MedianInput {
  nums: number[];
}

type MedianState = DualHeapMedianState;

function record({ nums }: MedianInput): Frame<MedianState>[] {
  return recordDualHeapMedian(nums, {
    initCaption:
      'Find Median from Data Stream: max-heap `low` holds the smaller half, min-heap `high` the larger. After each AddNum, rebalance so sizes differ by at most 1.',
    doneCaption: (finalMed) => `Stream complete. Final median = ${finalMed}.`,
  });
}

function View({ frame }: PluginViewProps<MedianState>) {
  const s = frame.state;
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="heaps">
            <RailStat k="low sz" v={s.low.length} />
            <RailStat k="high sz" v={s.high.length} />
            <RailStat
              k="low top"
              v={s.low[0]! ?? '—'}
              tone={s.highlightLow ? 'accent' : undefined}
            />
            <RailStat
              k="high top"
              v={s.high[0]! ?? '—'}
              tone={s.highlightHigh ? 'accent' : undefined}
            />
          </RailGroup>
          {s.added !== null && (
            <RailGroup label="step">
              <RailStat k="op" v={s.op || '—'} />
              <RailStat k="added" v={s.added} tone="accent" />
            </RailGroup>
          )}
          {s.median !== null && (
            <RailResult label="median" value={s.median} tone={s.done ? 'good' : 'accent'} />
          )}
        </>
      }
    >
      <DualHeapBoard
        low={s.low}
        high={s.high}
        highlightLow={s.highlightLow}
        highlightHigh={s.highlightHigh}
        median={s.median}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MedianState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="low size" v={s.low.length} />
      <InspectorRow k="high size" v={s.high.length} />
      <InspectorRow k="low top" v={s.low[0]! ?? '—'} />
      <InspectorRow k="high top" v={s.high[0]! ?? '—'} />
      <InspectorRow k="median" v={s.median ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-find-median-from-data-stream';
export const title = 'Find Median From Data Stream';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which structure tracks the running median from a stream?',
    choices: [
      {
        label: 'Dual heaps — max-heap low half, min-heap high half',
        correct: true,
      },
      {
        label: 'Sorted merged intervals — AddRange maintains coverage',
      },
      {
        label: 'Lazy price heaps — pop stale min/max on stock query',
      },
      {
        label: 'Flat RLE pairs — count-value runs consumed by Next',
      },
    ],
    explain:
      'low holds smaller half (max at top); high holds larger half (min at top); rebalance keeps sizes balanced.',
  },
  {
    id: 'key-step',
    prompt: 'After pushing into low, why move the max to high (MOVE frame)?',
    choices: [
      {
        label: 'Maintain invariant — every low value must be ≤ every high value',
        correct: true,
      },
      {
        label: 'Compute maximum — track global max of entire stream',
      },
      {
        label: 'Delete smallest — discard min before median query',
      },
      {
        label: 'Sort full stream — rebuild array each AddNum call',
      },
    ],
    explain:
      'Pop max from low and pushHigh ensures the partition between halves respects sorted order.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for Find Median from Data Stream?',
    choices: [
      {
        label: 'O(log n) add, O(1) median query, O(n) space — two heaps',
        correct: true,
      },
      {
        label: 'O(1) add and median, O(1) space — single variable tracker',
      },
      {
        label: 'O(n) add, O(n) median, O(1) space — resort array each insert',
      },
      {
        label: 'O(log n) median only, O(1) space — no stored elements kept',
      },
    ],
    explain:
      'Each AddNum does heap push/pop; median reads heap tops after rebalance without full sort.',
  },
  {
    id: 'edge',
    prompt: 'When high.size exceeds low.size after a move, what happens?',
    choices: [
      {
        label: 'REBALANCE — pop smallest from high back into low',
        correct: true,
      },
      {
        label: 'Discard new value — reject AddNum until sizes equal',
      },
      {
        label: 'Merge heaps — combine into one sorted array',
      },
      {
        label: 'Swap heap roles — exchange low and high identifiers',
      },
    ],
    explain:
      'Rebalance moves smallest of high back to low so low has at least as many elements as high.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'med1',
      label: '1, 2, 3, 4, 5',
      value: { nums: [1, 2, 3, 4, 5] },
    },
    {
      id: 'med2',
      label: '5, 15, 1, 3',
      value: { nums: [5, 15, 1, 3] },
    },
  ] satisfies SampleInput<MedianInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MedianState | undefined;
    return s?.done && s.median != null
      ? { ok: true, label: `median = ${s.median}` }
      : { ok: false, label: 'incomplete' };
  },
};

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
  RailStack,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';
import type { DualHeapMedianState } from '../../../_shared/dualHeapMedianRecord';
import { recordDualHeapMedian } from '../../../_shared/dualHeapMedianRecord';
import { DualHeapBoard } from '../../../_shared/dualHeapBoard';

interface MedianStreamInput {
  nums: number[];
}

type MedianStreamState = DualHeapMedianState & { medians: number[] };

function record({ nums }: MedianStreamInput): Frame<MedianStreamState>[] {
  return recordDualHeapMedian(nums, {
    initCaption:
      "Find median in stream: max-heap `low` holds the smaller half, min-heap `high` the larger. pushLow(v), move low's top to high, rebalance if needed.",
    trackMedians: true,
    doneCaption: (_final, medians) =>
      `Stream complete. Median after each add: [${medians.join(', ')}].`,
  }) as Frame<MedianStreamState>[];
}

function View({ frame }: PluginViewProps<MedianStreamState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="step">
        <RailStat k="op" v={s.op || '—'} />
        {s.added !== null && <RailStat k="added" v={s.added} tone="accent" />}
        <RailStat k="median" v={s.median ?? '—'} tone={s.done ? 'good' : 'accent'} />
      </RailGroup>
      <RailStack label="medians" items={(s.medians ?? []).map(String)} highlightEnd="bottom" />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={130}>
      <DualHeapBoard
        low={s.low}
        high={s.high}
        highlightLow={s.highlightLow}
        highlightHigh={s.highlightHigh}
        median={s.median}
      />
      {s.done && s.median != null && <RailResult label="median" value={s.median} tone="good" />}
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MedianStreamState>) {
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

export const manifestId = 'prep-streams-io-find-median-in-stream';
export const title = 'Find median in stream';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find median in stream"?',
    choices: [
      {
        label: 'Two heaps median — fits this problem',
        correct: true,
      },
      {
        label: 'Recursive directory walk — different approach',
      },
      {
        label: 'K-way merge with min-heap — different approach',
      },
      {
        label: 'String builder scan — different approach',
      },
    ],
    explain: 'Max-heap holds the low half, min-heap the high half, kept balanced',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find median in stream"?',
    choices: [
      {
        label: 'O(log n) per add time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(file size) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(1) per item time, O(1) space — wrong order of growth',
      },
    ],
    explain:
      'O(log n) per add. O(n). push low, move its top to high, rebalance; median from the tops',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'mis1', label: '1, 2, 3, 4, 5', value: { nums: [1, 2, 3, 4, 5] } },
    { id: 'mis2', label: '5, 15, 1, 3', value: { nums: [5, 15, 1, 3] } },
  ] satisfies SampleInput<MedianStreamInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MedianStreamState | undefined;
    return s?.done && s.median != null
      ? { ok: true, label: `median = ${s.median}` }
      : { ok: false, label: 'incomplete' };
  },
};

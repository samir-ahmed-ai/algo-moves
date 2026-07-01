import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import {
  DualHeapBoard,
  maxHeapPop,
  maxHeapPush,
  medianFromHeaps,
  minHeapPop,
  minHeapPush,
} from '../../../_shared/dualHeapBoard';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MedianInput {
  nums: number[];
}

interface MedianState {
  low: number[];
  high: number[];
  op: string;
  added: number | null;
  median: number | null;
  highlightLow: boolean;
  highlightHigh: boolean;
  done: boolean;
}

function record({ nums }: MedianInput): Frame<MedianState>[] {
  const frames: Frame<MedianState>[] = [];
  let low: number[] = [];
  let high: number[] = [];

  const emit = (type: string, note: string, caption: string, s: Partial<MedianState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        low: [...low],
        high: [...high],
        op: '',
        added: null,
        median: null,
        highlightLow: false,
        highlightHigh: false,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    'dual heaps',
    `Find Median from Data Stream: max-heap \`low\` holds the smaller half, min-heap \`high\` the larger. After each AddNum, rebalance so sizes differ by at most 1.`,
    {},
  );

  for (const num of nums) {
    emit(
      'ADD',
      `push ${num} to low`,
      `AddNum(${num}): push into max-heap low first.`,
      { op: `add ${num}`, added: num, highlightLow: true },
    );
    low = maxHeapPush(low, num);
    let moved: number;
    [low, moved] = maxHeapPop(low);
    high = minHeapPush(high, moved);
    emit(
      'BALANCE',
      `move ${moved} to high`,
      `Pop max from low (${moved}) and push into min-heap high so every low value ≤ every high value.`,
      { op: `add ${num}`, added: num, highlightHigh: true },
    );
    if (high.length > low.length) {
      let back: number;
      [high, back] = minHeapPop(high);
      low = maxHeapPush(low, back);
      emit(
        'REBALANCE',
        `move ${back} to low`,
        `high has more elements — move smallest of high (${back}) back to low to restore |low| ≥ |high|.`,
        { op: `add ${num}`, added: num, highlightLow: true },
      );
    }
    const med = medianFromHeaps(low, high);
    emit(
      'MEDIAN',
      `median ${med}`,
      `After adding ${num}: low size=${low.length}, high size=${high.length}. Median = ${med}.`,
      { op: `add ${num}`, added: num, median: med },
      'good',
    );
  }

  const finalMed = medianFromHeaps(low, high);
  emit(
    'DONE',
    `median ${finalMed}`,
    `Stream complete. Final median = ${finalMed}.`,
    { op: 'done', median: finalMed, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MedianState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.added !== null && (
          <>
            {' · '}added <span className="font-mono text-ink">{s.added}</span>
          </>
        )}
      </div>
      <DualHeapBoard
        low={s.low}
        high={s.high}
        highlightLow={s.highlightLow}
        highlightHigh={s.highlightHigh}
        median={s.median}
      />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MedianState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="low size" v={s.low.length} />
      <InspectorRow k="high size" v={s.high.length} />
      <InspectorRow k="low top" v={s.low[0] ?? '—'} />
      <InspectorRow k="high top" v={s.high[0] ?? '—'} />
      <InspectorRow k="median" v={s.median ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-find-median-from-data-stream';
export const title = 'Find Median From Data Stream';

export const simulator: ProblemSimulator = {
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

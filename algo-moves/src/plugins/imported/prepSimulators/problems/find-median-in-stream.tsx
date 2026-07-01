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

interface MedianStreamInput {
  nums: number[];
}

interface MedianStreamState {
  low: number[];
  high: number[];
  op: string;
  added: number | null;
  median: number | null;
  highlightLow: boolean;
  highlightHigh: boolean;
  medians: number[];
  done: boolean;
}

function record({ nums }: MedianStreamInput): Frame<MedianStreamState>[] {
  const frames: Frame<MedianStreamState>[] = [];
  let low: number[] = [];
  let high: number[] = [];
  const medians: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<MedianStreamState>,
    tone?: 'good' | 'bad',
  ) =>
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
        medians: medians.slice(),
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    'dual heaps',
    `Find median in stream: max-heap \`low\` holds the smaller half, min-heap \`high\` the larger. pushLow(v), move low's top to high, rebalance if needed.`,
    {},
  );

  for (const v of nums) {
    emit('ADD', `push ${v} to low`, `Add ${v}: pushLow into max-heap low.`, { op: `add ${v}`, added: v, highlightLow: true });
    low = maxHeapPush(low, v);
    let moved: number;
    [low, moved] = maxHeapPop(low);
    high = minHeapPush(high, moved);
    emit(
      'MOVE',
      `move ${moved} to high`,
      `Pop max from low (${moved}) and pushHigh so every low value ≤ every high value.`,
      { op: `add ${v}`, added: v, highlightHigh: true },
    );
    if (high.length > low.length) {
      let back: number;
      [high, back] = minHeapPop(high);
      low = maxHeapPush(low, back);
      emit(
        'REBALANCE',
        `move ${back} to low`,
        `high has more elements — move smallest of high (${back}) back to low so |low| ≥ |high|.`,
        { op: `add ${v}`, added: v, highlightLow: true },
      );
    }
    const med = medianFromHeaps(low, high);
    medians.push(med);
    emit(
      'MEDIAN',
      `median ${med}`,
      `After ${v}: low size=${low.length}, high size=${high.length}. Median = ${med}.`,
      { op: `add ${v}`, added: v, median: med, medians: medians.slice() },
      'good',
    );
  }

  const finalMed = medians[medians.length - 1] ?? null;
  emit(
    'DONE',
    finalMed !== null ? `median ${finalMed}` : 'empty',
    `Stream complete. Median after each add: [${medians.join(', ')}].`,
    { op: 'done', median: finalMed, medians: medians.slice(), done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MedianStreamState>) {
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
      {s.medians.length > 0 && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          medians [{s.medians.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MedianStreamState>) {
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

export const manifestId = 'prep-streams-io-find-median-in-stream';
export const title = 'Find median in stream';

export const simulator: ProblemSimulator = {
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

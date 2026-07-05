import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Interval {
  start: number;
  end: number;
}

interface CountRangeInput {
  intervals: Interval[];
}

interface CountRangeState {
  sorted: Interval[]; // intervals after sorting by start
  i: number | null; // start of current merged group
  j: number | null; // probe scanning forward for mergeable neighbours
  groupStart: number | null; // running start of the merged group
  groupEnd: number | null; // running (extended) end of the merged group
  merged: [number, number][]; // finalized merged spans so far
  rangeSum: number; // running sum of covered integers
  lastSpan: number | null; // span just added to rangeSum
  done: boolean;
}

function record({ intervals }: CountRangeInput): Frame<CountRangeState>[] {  const sorted = intervals.slice().sort((a, b) => a.start - b.start);
  const merged: [number, number][] = [];

  const { emit, frames } = createRecorder<CountRangeState>(() => ({
        sorted,
        i: null,
        j: null,
        groupStart: null,
        groupEnd: null,
        merged: merged.map((m) => [m[0], m[1]] as [number, number]),
        rangeSum: 0,
        lastSpan: null,
        done: false
      }));

  const fmt = (iv: Interval) => `[${iv.start},${iv.end}]`;

  if (sorted.length === 0) {
    emit('DONE', 'empty', 'No intervals were given, so the covered range sums to 0.', { done: true, rangeSum: 0 }, 'bad');
    return frames;
  }

  emit(
    'INIT',
    `n=${sorted.length}`,
    `Count Intervals Range: total number of distinct integers covered by the union of these intervals. Sort by start, then sweep left to right merging intervals that touch or overlap (start ≤ end+1), adding end−start+1 for each merged group.`,
    {},
  );

  emit(
    'SORTED',
    sorted.map(fmt).join(' '),
    `Sorted by start: ${sorted.map(fmt).join(', ')}. Touching/overlapping intervals are now adjacent, so a single forward sweep can merge each group.`,
    {},
  );

  let rangeSum = 0;
  let i = 0;
  while (i < sorted.length) {
    const start = sorted[i].start;
    let end = sorted[i].end;

    emit(
      'OPEN',
      `group ${fmt(sorted[i])}`,
      `Open a new merged group at index ${i}: ${fmt(sorted[i])}. Track its start=${start} and a running end=${end} that we will extend over any touching neighbours.`,
      { i, j: null, groupStart: start, groupEnd: end },
    );

    let j = i + 1;
    while (j < sorted.length && sorted[j].start <= end + 1) {
      const before = end;
      if (sorted[j].end > end) end = sorted[j].end;
      emit(
        'MERGE',
        `extend end→${end}`,
        `${fmt(sorted[j])} starts at ${sorted[j].start} ≤ end+1 (${before}+1), so it touches or overlaps the group. Merge it: end becomes max(${before}, ${sorted[j].end}) = ${end}.`,
        { i, j, groupStart: start, groupEnd: end },
      );
      j++;
    }

    if (j < sorted.length) {
      emit(
        'STOP',
        `gap before ${fmt(sorted[j])}`,
        `${fmt(sorted[j])} starts at ${sorted[j].start} > end+1 (${end}+1), leaving a gap. The current group [${start},${end}] is complete.`,
        { i, j, groupStart: start, groupEnd: end },
      );
    }

    const span = end - start + 1;
    rangeSum += span;
    merged.push([start, end]);
    emit(
      'COUNT',
      `+${span} → ${rangeSum}`,
      `Group [${start},${end}] covers end−start+1 = ${end}−${start}+1 = ${span} integers. Add to the running total: rangeSum = ${rangeSum}.`,
      { i, j: null, groupStart: start, groupEnd: end, rangeSum, lastSpan: span },
      'good',
    );

    i = j;
  }

  emit(
    'DONE',
    `${rangeSum} covered`,
    `Swept all intervals. The merged groups ${merged.map((m) => `[${m[0]},${m[1]}]`).join(', ')} cover ${rangeSum} distinct integers in total.`,
    { i: null, j: null, groupStart: null, groupEnd: null, rangeSum, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<CountRangeState>) {
  const s = frame.state;
  const values = s.sorted.map((iv) => `[${iv.start},${iv.end}]`);
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null && s.j < s.sorted.length)
    pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'below' });

  const inGroup = (idx: number) => {
    if (s.groupStart === null || s.groupEnd === null) return false;
    const iv = s.sorted[idx];
    return iv.start <= s.groupEnd && iv.end >= s.groupStart;
  };
  const tone = (idx: number) =>
    s.done ? 'found' : s.i === idx ? 'match' : inGroup(idx) ? 'in-window' : '';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        rangeSum = <span className="font-mono text-ink">{s.rangeSum}</span>
        {s.groupStart !== null && s.groupEnd !== null && !s.done && (
          <>
            {' · '}group ={' '}
            <span className="font-mono text-ink">
              [{s.groupStart},{s.groupEnd}]
            </span>
          </>
        )}
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        merged{' '}
        {s.merged.length ? s.merged.map((m) => `[${m[0]},${m[1]}]`).join(' ') : '·'}
      </div>
      {s.lastSpan !== null && !s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.sm)}>+{s.lastSpan} integers</div>
      )}
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.rangeSum} covered</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CountRangeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const group =
    s.groupStart !== null && s.groupEnd !== null ? `[${s.groupStart}, ${s.groupEnd}]` : '—';
  const probe =
    s.j !== null && s.j >= 0 && s.j < s.sorted.length
      ? `[${s.sorted[s.j].start},${s.sorted[s.j].end}]`
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="n (intervals)" v={s.sorted.length} />
      <InspectorRow k="i (group head)" v={s.i ?? '—'} />
      <InspectorRow k="j (probe)" v={s.j ?? '—'} />
      <InspectorRow k="probe interval" v={probe} />
      <InspectorRow k="merged group" v={group} />
      <InspectorRow k="groups merged" v={s.merged.length} />
      <InspectorRow k="rangeSum" v={s.rangeSum} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-count-intervals-range';
export const title = 'Count intervals range';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'cir1',
      label: '[1,3] [2,6] [8,10] [9,11]',
      value: {
        intervals: [
          { start: 1, end: 3 },
          { start: 2, end: 6 },
          { start: 8, end: 10 },
          { start: 9, end: 11 },
        ],
      },
    },
    {
      id: 'cir2',
      label: '[1,2] [3,4] [6,7]',
      value: {
        intervals: [
          { start: 1, end: 2 },
          { start: 3, end: 4 },
          { start: 6, end: 7 },
        ],
      },
    },
  ] satisfies SampleInput<CountRangeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CountRangeState | undefined;
    const v = s?.rangeSum ?? 0;
    return { ok: true, label: `${v} covered` };
  },
};

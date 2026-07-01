import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MeetingRoomsInput {
  intervals: [number, number][];
}

interface MeetingRoomsState {
  intervals: [number, number][];
  starts: number[];
  ends: number[];
  i: number | null; // current start being processed
  endIdx: number; // pointer into the sorted ends array
  rooms: number;
  peak: number; // max rooms ever needed (the answer)
  decision: 'need' | 'reuse' | null; // what this step decided
  done: boolean;
}

function record({ intervals }: MeetingRoomsInput): Frame<MeetingRoomsState>[] {  const n = intervals.length;
  const starts = intervals.map((v) => v[0]);
  const ends = intervals.map((v) => v[1]);

  let i: number | null = null;
  let endIdx = 0;
  let rooms = 0;
  let peak = 0;
  let decision: 'need' | 'reuse' | null = null;

  const { emit, frames } = createRecorder<MeetingRoomsState>(() => ({
        intervals: intervals,
        starts: starts.slice(),
        ends: ends.slice(),
        i: i,
        endIdx: endIdx,
        rooms: rooms,
        peak: peak,
        decision: decision,
        done: false
      }));

  emit('INIT', `${n} meetings`, `Meeting Rooms II: find the maximum number of meetings overlapping at any instant — that is how many rooms we need. We split every interval into its start time and its end time and treat the two as independent sorted timelines.`, {});

  starts.sort((a, b) => a - b);
  ends.sort((a, b) => a - b);
  emit('SORT', `sorted`, `Sort the starts and the ends independently. starts = [${starts.join(', ')}], ends = [${ends.join(', ')}]. Now sweep the starts in order; endIdx tracks the earliest meeting that has not yet freed its room.`, {});

  for (let k = 0; k < n; k++) {
    i = k;
    if (starts[k] < ends[endIdx]) {
      rooms++;
      decision = 'need';
      if (rooms > peak) peak = rooms;
      emit('NEED', `rooms=${rooms}`, `Meeting starting at ${starts[k]} begins before the earliest end ${ends[endIdx]} (${starts[k]} < ${ends[endIdx]}), so no room has freed up yet — allocate a new room. rooms = ${rooms}.`, {});
    } else {
      endIdx++;
      decision = 'reuse';
      emit('REUSE', `reuse`, `Meeting starting at ${starts[k]} begins at or after the earliest end ${ends[endIdx - 1]} (${starts[k]} ≥ ${ends[endIdx - 1]}), so that meeting has finished — reuse its room. Advance endIdx to ${endIdx}; rooms stays ${rooms}.`, {});
    }
  }

  i = null;
  decision = null;
  emit('DONE', `${peak} rooms`, `Every start has been swept. The most rooms held simultaneously was ${peak}, so the answer is ${peak} meeting room${peak === 1 ? '' : 's'}.`, { done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<MeetingRoomsState>) {
  const s = frame.state;

  const startPointers: ArrayPointer[] = [];
  if (s.i !== null) startPointers.push({ i: s.i, label: 'start', tone: 'accent', place: 'above' });
  const startTone = (k: number) =>
    s.i !== null && k === s.i ? (s.decision === 'reuse' ? 'match' : 'found') : k < (s.i ?? 0) ? 'dead' : '';

  const endPointers: ArrayPointer[] = [];
  if (s.endIdx < s.ends.length) endPointers.push({ i: s.endIdx, label: 'endIdx', tone: 'warn', place: 'below' });
  const endTone = (k: number) => (k < s.endIdx ? 'dead' : k === s.endIdx ? 'mid' : '');

  const curStart = s.i !== null ? s.starts[s.i] : '—';
  const curEnd = s.endIdx < s.ends.length ? s.ends[s.endIdx] : '—';

  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="starts[i]" v={curStart} tone="accent" />
        <RailStat k="ends[endIdx]" v={curEnd} tone="warn" />
        <RailStat k="decision" v={s.decision ?? '—'} />
      </RailGroup>
      <RailGroup label="rooms">
        <RailStat k="now" v={s.rooms} tone="accent" />
        <RailStat k="peak" v={s.peak} />
      </RailGroup>
      {s.done && <RailResult label="answer" value={s.peak} tone="good" />}
    </>
  );

  return (
    <VizStage rail={rail} railWidth={140}>
      <div className={cn(vizText.sm, 'text-ink3')}>
        meetings{' '}
        <span className="font-mono text-ink">
          {s.intervals.map(([a, b]) => `[${a},${b}]`).join(' ')}
        </span>
      </div>

      <div className={cn('mt-2 font-mono', vizText.xs, 'text-ink3')}>starts (sorted)</div>
      <ArrayRow values={s.starts} cellTone={startTone} pointers={startPointers} windowRange={null} />

      <div className={cn('mt-2 font-mono', vizText.xs, 'text-ink3')}>ends (sorted)</div>
      <ArrayRow values={s.ends} cellTone={endTone} pointers={endPointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MeetingRoomsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curStart = s.i !== null ? s.starts[s.i] : '—';
  const curEnd = s.endIdx < s.ends.length ? s.ends[s.endIdx] : '—';
  return (
    <VarGrid>
      <InspectorRow k="meetings (n)" v={s.intervals.length} />
      <InspectorRow k="starts[i]" v={curStart} />
      <InspectorRow k="endIdx" v={s.endIdx} />
      <InspectorRow k="ends[endIdx]" v={curEnd} />
      <InspectorRow k="decision" v={s.decision ?? '—'} />
      <InspectorRow k="rooms now" v={s.rooms} />
      <InspectorRow k="answer (peak)" v={s.done ? s.peak : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-meeting-rooms-ii';
export const title = 'Meeting Rooms II';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'mr1',
      label: '[[0,30],[5,10],[15,20]] → 2',
      value: { intervals: [[0, 30], [5, 10], [15, 20]] },
    },
    {
      id: 'mr2',
      label: '[[1,5],[2,6],[3,7],[8,9]] → 3',
      value: { intervals: [[1, 5], [2, 6], [3, 7], [8, 9]] },
    },
  ] satisfies SampleInput<MeetingRoomsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MeetingRoomsState | undefined;
    const v = s ? s.peak : 0;
    return { ok: true, label: `${v} room${v === 1 ? '' : 's'}` };
  },
};

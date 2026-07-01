import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SkylineInput {
  // Each building is [left, right, height].
  buildings: number[][];
}

interface SkyEvent {
  x: number;
  // signedHeight: start = -height, end = +height (matches the Go sort key).
  signedHeight: number;
}

interface SkylineState {
  events: SkyEvent[];
  cur: number | null; // index of the event being processed
  heights: [number, number][]; // active multiset: height -> count
  currMax: number; // skyline height before this event
  newMax: number | null; // recomputed max after this event
  result: [number, number][]; // emitted skyline key-points [x, height]
  done: boolean;
}

function record({ buildings }: SkylineInput): Frame<SkylineState>[] {
  // Build start/end events: start=-h, end=+h (so within an x, starts sort first).
  const events: SkyEvent[] = [];
  for (const b of buildings) {
    events.push({ x: b[0], signedHeight: -b[2] });
    events.push({ x: b[1], signedHeight: b[2] });
  }
  events.sort((a, c) => (a.x !== c.x ? a.x - c.x : a.signedHeight - c.signedHeight));

  const heights = new Map<number, number>([[0, 1]]);
  let currMax = 0;
  const result: [number, number][] = [];

  const snapHeights = (): [number, number][] =>
    [...heights.entries()].sort((a, c) => c[0] - a[0]);

  const { emit, frames } = createRecorder<SkylineState>(() => ({
        events,
        cur: null,
        heights: snapHeights(),
        currMax,
        newMax: null,
        result: result.map((p) => [p[0], p[1]]),
        done: false
      }));

  emit(
    'INIT',
    `${events.length} events`,
    `Draw Skyline (sweep line): each building [L,R,h] becomes two x-events — a start (encoded as −h) and an end (encoded as +h). Sorting by (x, signedHeight) makes starts win ties so a taller building opens before a shorter one closes. We keep a multiset of active heights {0:1} and emit a key-point whenever the tallest active height changes.`,
    {},
  );

  for (let k = 0; k < events.length; k++) {
    const ev = events[k];
    const h = Math.abs(ev.signedHeight);
    if (ev.signedHeight < 0) {
      heights.set(h, (heights.get(h) ?? 0) + 1);
      emit(
        'ENTER',
        `+${h} @x=${ev.x}`,
        `Event at x=${ev.x} is a building START of height ${h} (signed −${h}). Add ${h} to the active multiset, so the count of height ${h} becomes ${heights.get(h)}.`,
        { cur: k },
      );
    } else {
      const c = (heights.get(h) ?? 0) - 1;
      if (c <= 0) heights.delete(h);
      else heights.set(h, c);
      emit(
        'LEAVE',
        `-${h} @x=${ev.x}`,
        `Event at x=${ev.x} is a building END of height ${h} (signed +${h}). Remove one ${h} from the active multiset${c <= 0 ? `, dropping height ${h} entirely` : `, leaving count ${c}`}.`,
        { cur: k },
      );
    }

    // Recompute the tallest active height (O(n) scan — the O(n^2) part).
    let newMax = 0;
    for (const hv of heights.keys()) if (hv > newMax) newMax = hv;

    if (newMax !== currMax) {
      result.push([ev.x, newMax]);
      const prev = currMax;
      currMax = newMax;
      emit(
        'EMIT',
        `(${ev.x},${newMax})`,
        `The tallest active height changed from ${prev} to ${newMax}, so the skyline turns here: emit key-point (${ev.x}, ${newMax}). This marks where the visible roofline steps up or down.`,
        { cur: k, newMax, currMax },
        'good',
      );
    } else {
      emit(
        'SAME',
        `max stays ${newMax}`,
        `After updating the multiset the tallest active height is still ${newMax} — the visible roofline did not change at x=${ev.x}, so no key-point is emitted.`,
        { cur: k, newMax },
      );
    }
  }

  emit(
    'DONE',
    `${result.length} points`,
    `All events processed. The skyline is the ${result.length} emitted key-points: ${result.map((p) => `(${p[0]},${p[1]})`).join(' ')}. Time O(n^2) — a full max-scan of the active set per event; Space O(n) for the events and multiset.`,
    { done: true, newMax: currMax },
    'good',
  );
  return frames;
}

function eventLabel(ev: SkyEvent): string {
  const h = Math.abs(ev.signedHeight);
  return ev.signedHeight < 0 ? `${ev.x}↑${h}` : `${ev.x}↓${h}`;
}

function View({ frame }: PluginViewProps<SkylineState>) {
  const s = frame.state;
  const values = s.events.map(eventLabel);
  const pointers: ArrayPointer[] = [];
  if (s.cur !== null) {
    const ev = s.events[s.cur];
    pointers.push({
      i: s.cur,
      label: ev.signedHeight < 0 ? 'start' : 'end',
      tone: ev.signedHeight < 0 ? 'good' : 'warn',
      place: 'above',
    });
  }
  const justEmitted = frame.move.type === 'EMIT';
  const tone = (i: number) =>
    s.cur === i ? (justEmitted ? 'found' : 'match') : '';

  const maxShown = s.newMax ?? s.currMax;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        sweep events (sorted) · currMax ={' '}
        <span className="font-mono text-ink">{s.currMax}</span>
        {s.newMax !== null && s.newMax !== s.currMax && (
          <>
            {' → '}
            <span className="font-mono text-good">{s.newMax}</span>
          </>
        )}
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        active {'{'}
        {s.heights.map(([h, c]) => `${h}:${c}`).join(', ')}
        {'}'} · tallest = <span className="text-ink">{maxShown}</span>
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm, s.result.length ? 'text-good' : 'text-ink3')}>
        skyline → {s.result.length ? s.result.map((p) => `(${p[0]},${p[1]})`).join(' ') : '·'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SkylineState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const ev = s.cur !== null ? s.events[s.cur] : null;
  return (
    <VarGrid>
      <InspectorRow k="events" v={s.events.length} />
      <InspectorRow k="cur event" v={ev ? eventLabel(ev) : '—'} />
      <InspectorRow k="kind" v={ev ? (ev.signedHeight < 0 ? 'start (−h)' : 'end (+h)') : '—'} />
      <InspectorRow k="active heights" v={s.heights.length} />
      <InspectorRow k="currMax" v={s.currMax} />
      <InspectorRow k="newMax" v={s.newMax ?? '—'} />
      <InspectorRow k="key-points" v={s.result.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-draw-skyline';
export const title = 'Draw skyline';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sk1',
      label: '[[2,9,10],[3,7,15],[5,12,12]]',
      value: { buildings: [[2, 9, 10], [3, 7, 15], [5, 12, 12]] },
    },
    {
      id: 'sk2',
      label: '[[1,5,3],[2,8,4]]',
      value: { buildings: [[1, 5, 3], [2, 8, 4]] },
    },
  ] satisfies SampleInput<SkylineInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SkylineState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const pts = s.result.map((p) => `(${p[0]},${p[1]})`).join(' ');
    return { ok: s.result.length > 0, label: pts || 'flat' };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CalInput {
  books: [number, number][];
}

interface CalState {
  events: [number, number][];
  op: string;
  start: number | null;
  end: number | null;
  allowed: boolean | null;
  done: boolean;
}

function record({ books }: CalInput): Frame<CalState>[] {
  const frames: Frame<CalState>[] = [];
  const events: [number, number][] = [];

  const emit = (type: string, note: string, caption: string, s: Partial<CalState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        events: events.map((e) => [...e] as [number, number]),
        op: '',
        start: null,
        end: null,
        allowed: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    'empty calendar',
    `My Calendar I: store [start,end) intervals. Book(start,end) rejects if any overlap: start < e.end && end > e.start.`,
    {},
  );

  for (const [start, end] of books) {
    let clash = false;
    for (const e of events) {
      if (start < e[1] && end > e[0]) {
        clash = true;
        emit(
          'REJECT',
          `clash [${e[0]},${e[1]})`,
          `Book(${start},${end}): overlaps existing [${e[0]},${e[1]}) → return false.`,
          { op: `book [${start},${end})`, start, end, allowed: false, events: events.map((x) => [...x] as [number, number]) },
          'bad',
        );
        break;
      }
    }
    if (!clash) {
      events.push([start, end]);
      emit(
        'BOOK',
        `ok [${start},${end})`,
        `Book(${start},${end}): no overlap → append event. Calendar has ${events.length} booking(s).`,
        { op: `book [${start},${end})`, start, end, allowed: true, events: events.map((x) => [...x] as [number, number]) },
        'good',
      );
    }
  }

  emit('DONE', `${events.length} events`, `Done. ${events.length} booking(s) on calendar.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<CalState>) {
  const s = frame.state;
  const maxT = Math.max(20, ...s.events.flat(), s.end ?? 0);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.allowed !== null && (
          <span className={cn('ml-2 font-mono', s.allowed ? 'text-good' : 'text-bad')}>
            → {s.allowed ? 'true' : 'false'}
          </span>
        )}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>timeline 0–{maxT}</div>
      <div className="relative mt-2 h-8 w-full rounded border border-edge bg-surface2">
        {s.events.map(([a, b], i) => (
          <div
            key={i}
            className={cn(
              'absolute top-1 h-6 rounded bg-accent/30 border border-accent',
              a === s.start && b === s.end && 'ring-2 ring-accent',
            )}
            style={{ left: `${(a / maxT) * 100}%`, width: `${((b - a) / maxT) * 100}%` }}
            title={`[${a},${b})`}
          />
        ))}
      </div>
      <div className="mt-2 space-y-0.5">
        {s.events.map(([a, b], i) => (
          <div key={i} className={cn('font-mono', vizText.sm, 'text-ink')}>
            [{a}, {b})
          </div>
        ))}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CalState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="bookings" v={s.events.length} />
      <InspectorRow k="result" v={s.allowed === null ? '—' : s.allowed ? 'true' : 'false'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-my-calendar-i';
export const title = 'My Calendar I';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'cal1',
      label: '10–20, 15–25 reject, 20–30 ok',
      value: { books: [[10, 20], [15, 25], [20, 30]] },
    },
  ] satisfies SampleInput<CalInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CalState | undefined;
    return s?.done ? { ok: true, label: `${s.events.length} booked` } : { ok: false, label: 'incomplete' };
  },
};

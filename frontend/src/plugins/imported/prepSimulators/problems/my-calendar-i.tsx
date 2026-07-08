import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  vizText,
} from '../../../_shared/vizKit';

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
  const events: [number, number][] = [];

  const { emit, frames } = createPrepRecorder<CalState>(() => ({
    events: events.map((e) => [...e] as [number, number]),
    op: '',
    start: null,
    end: null,
    allowed: null,
    done: false,
  }));

  emit(
    'INIT',
    'empty calendar',
    `My Calendar I: store [start,end) intervals. Book(start,end) rejects if any overlap: start < e.end && end > e.start.`,
    {},
  );

  for (const [start, end] of books) {
    let clash = false;
    for (const e of events) {
      if (start < e[1]! && end > e[0]!) {
        clash = true;
        emit(
          'REJECT',
          `clash [${e[0]!},${e[1]!})`,
          `Book(${start},${end}): overlaps existing [${e[0]!},${e[1]!}) → return false.`,
          {
            op: `book [${start},${end})`,
            start,
            end,
            allowed: false,
            events: events.map((x) => [...x] as [number, number]),
          },
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
        {
          op: `book [${start},${end})`,
          start,
          end,
          allowed: true,
          events: events.map((x) => [...x] as [number, number]),
        },
        'good',
      );
    }
  }

  emit(
    'DONE',
    `${events.length} events`,
    `Done. ${events.length} booking(s) on calendar.`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<CalState>) {
  const s = frame.state;
  const maxT = Math.max(20, ...s.events.flat(), s.end ?? 0);
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.allowed !== null && (
        <RailGroup label="result">
          <RailStat k="ok" v={s.allowed ? 'true' : 'false'} tone={s.allowed ? 'good' : 'bad'} />
        </RailGroup>
      )}
      <RailGroup label="cal">
        <RailStat k="bookings" v={s.events.length} />
        <RailStat k="maxT" v={maxT} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="relative h-8 w-full rounded border border-edge bg-surface2">
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
    </VizStage>
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does My Calendar I detect booking conflicts?',
    choices: [
      {
        label: 'Half-open interval list — overlap if start < e.end and end > e.start',
        correct: true,
      },
      {
        label: 'Sorted merged ranges — AddRange union before each book',
      },
      {
        label: 'Dual heap median — rebalance low and high halves',
      },
      {
        label: 'Point count map — diagonal corner frequency lookup',
      },
    ],
    explain:
      'Stored events are [start,end) pairs; Book scans for any overlapping existing interval.',
  },
  {
    id: 'key-step',
    prompt: 'On REJECT, which condition triggered the clash?',
    choices: [
      {
        label: 'Existing interval overlaps new [start,end) — Book returns false',
        correct: true,
      },
      {
        label: 'Calendar full — maximum number of events reached',
      },
      {
        label: 'start equals end — zero-length intervals forbidden always',
      },
      {
        label: 'Duplicate start rejection — same start time always blocked',
      },
    ],
    explain:
      'The loop finds e where start < e.end && end > e.start, then emits REJECT without appending.',
  },
  {
    id: 'complexity',
    prompt: 'What are typical bounds for My Calendar I?',
    choices: [
      {
        label: 'O(n) Book per call, O(n) space — scan all stored events',
        correct: true,
      },
      {
        label: 'O(log n) Book, O(1) space — tree without stored events',
      },
      {
        label: 'O(1) Book always, O(n) space — hash by start minute only',
      },
      {
        label: 'O(n log n) Book, O(n²) space — resort timeline every insert',
      },
    ],
    explain:
      'Each Book may scan the entire events list; successful books append one more interval.',
  },
  {
    id: 'edge',
    prompt: 'Do [10,20) and [20,30) conflict in this calendar?',
    choices: [
      {
        label: 'No overlap — touching endpoints share a point but do not intersect',
        correct: true,
      },
      {
        label: 'Always conflict — any shared boundary rejects booking',
      },
      {
        label: 'Conflict only if same start — end alignment ignored',
      },
      {
        label: 'Second booking wins — later interval replaces earlier one',
      },
    ],
    explain: 'Half-open intervals overlap only when each starts before the other ends strictly.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'cal1',
      label: '10–20, 15–25 reject, 20–30 ok',
      value: {
        books: [
          [10, 20],
          [15, 25],
          [20, 30],
        ],
      },
    },
  ] satisfies SampleInput<CalInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CalState | undefined;
    return s?.done
      ? { ok: true, label: `${s.events.length} booked` }
      : { ok: false, label: 'incomplete' };
  },
};

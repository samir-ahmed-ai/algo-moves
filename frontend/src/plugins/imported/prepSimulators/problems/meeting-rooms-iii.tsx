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

interface MeetInput {
  n: number;
  meetings: [number, number][];
}

interface BusyMeet {
  end: number;
  room: number;
}

interface MeetState {
  n: number;
  avail: number[];
  busy: BusyMeet[];
  cnt: number[];
  meeting: [number, number] | null;
  assigned: number | null;
  op: string;
  winner: number | null;
  done: boolean;
}

function busyLess(a: BusyMeet, b: BusyMeet): boolean {
  if (a.end === b.end) return a.room < b.room;
  return a.end < b.end;
}

function record({ n, meetings }: MeetInput): Frame<MeetState>[] {
  const sorted = [...meetings].sort((a, b) => a[0]! - b[0]!);
  let avail: number[] = [];
  for (let i = 0; i < n; i++) avail.push(i);
  let busy: BusyMeet[] = [];
  const cnt = new Array(n).fill(0);

  const { emit, frames } = createPrepRecorder<MeetState>(() => ({
    n,
    avail: avail.slice(),
    busy: busy.map((b) => ({ ...b })),
    cnt: cnt.slice(),
    meeting: null,
    assigned: null,
    op: '',
    winner: null,
    done: false,
  }));

  emit(
    'INIT',
    `${n} rooms`,
    `Meeting Rooms III: min-heap avail rooms, busy heap by end time. Assign earliest free room; if none, delay meeting on earliest-ending room.`,
    {},
  );

  for (const m of sorted) {
    const [s, e] = m;
    const freed: number[] = [];
    busy = busy.filter((b) => {
      if (b.end <= s) {
        freed.push(b.room);
        return false;
      }
      return true;
    });
    avail = [...avail, ...freed].sort((a, b) => a - b);

    if (avail.length > 0) {
      const r = avail.shift()!;
      cnt[r]!++;
      busy.push({ end: e, room: r });
      busy.sort((a, b) => (busyLess(a, b) ? -1 : 1));
      emit(
        'BOOK',
        `room ${r}`,
        `Meeting [${s},${e}]: free room ${r} available → assign, busy until ${e}. cnt[${r}]!=${cnt[r]!}.`,
        {
          meeting: m,
          assigned: r,
          op: `[${s},${e})→R${r}`,
          cnt: cnt.slice(),
          avail: avail.slice(),
          busy: busy.slice(),
        },
        'good',
      );
    } else {
      busy.sort((a, b) => (busyLess(a, b) ? -1 : 1));
      const b = busy.shift()!;
      cnt[b.room]!++;
      const newEnd = b.end + (e - s);
      busy.push({ end: newEnd, room: b.room });
      busy.sort((a, b) => (busyLess(a, b) ? -1 : 1));
      emit(
        'DELAY',
        `room ${b.room}`,
        `Meeting [${s},${e}]: all busy — reuse room ${b.room}, ends at ${newEnd}. cnt[${b.room}]!=${cnt[b.room]!}.`,
        {
          meeting: m,
          assigned: b.room,
          op: `[${s},${e})→R${b.room}`,
          cnt: cnt.slice(),
          busy: busy.slice(),
        },
      );
    }
  }

  let winner = 0;
  for (let i = 1; i < n; i++) if (cnt[i]! > cnt[winner]!) winner = i;
  emit(
    'DONE',
    `room ${winner}`,
    `Done. Room ${winner} held the most meetings (${cnt[winner]!}). Counts: [${cnt.join(', ')}].`,
    { op: 'done', winner, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MeetState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.assigned !== null && <RailStat k="room" v={s.assigned} tone="good" />}
      </RailGroup>
      {s.winner !== null && (
        <RailGroup label="most">
          <RailStat k="room" v={s.winner} tone="good" />
        </RailGroup>
      )}
      <RailGroup label="rooms">
        <RailStat k="n" v={s.n} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
        {s.cnt.map((c, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.assigned
                ? 'border-accent bg-accentbg'
                : i === s.winner
                  ? 'border-good'
                  : 'border-edge',
            )}
          >
            R{i}:{c}
          </span>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MeetState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="rooms" v={s.n} />
      <InspectorRow k="assigned" v={s.assigned ?? '—'} />
      <InspectorRow k="counts" v={`[${s.cnt.join(', ')}]`} />
      <InspectorRow k="winner" v={s.winner ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-meeting-rooms-iii';
export const title = 'Meeting Rooms III';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which structures assign meetings to rooms here?',
    choices: [
      {
        label: 'Sorted avail list plus busy heap — free rooms and earliest end times',
        correct: true,
      },
      {
        label: 'Round-robin index — cycle servers without tracking busy until',
      },
      {
        label: 'Half-open calendar events — reject overlapping bookings only',
      },
      {
        label: 'Reservoir sampling — pick uniform random meeting room id',
      },
    ],
    explain:
      'Meetings sorted by start; freed rooms rejoin avail; busy heap orders rooms by meeting end.',
  },
  {
    id: 'key-step',
    prompt: 'On DELAY when no room is free at meeting start, what happens?',
    choices: [
      {
        label: 'Reuse earliest-ending busy room — extend its end by meeting duration',
        correct: true,
      },
      {
        label: 'Drop the meeting — skip assignment when avail is empty',
      },
      {
        label: 'Wait without assigning — leave meeting unscheduled forever',
      },
      {
        label: 'Add new virtual room — grow n dynamically for each delay',
      },
    ],
    explain: 'busy sorted by end; shift earliest finisher and push new end = oldEnd + (e - s).',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for Meeting Rooms III?',
    choices: [
      {
        label: 'O(m log n) time, O(n) space — heap ops per m meetings',
        correct: true,
      },
      {
        label: 'O(m) time, O(1) space — constant work without heap sorting',
      },
      {
        label: 'O(n²) time, O(m) space — scan all rooms linearly each meeting',
      },
      {
        label: 'O(log m) time, O(m) space — binary search meeting starts only',
      },
    ],
    explain: 'Each meeting may sort or filter busy rooms; counts array size is number of rooms n.',
  },
  {
    id: 'edge',
    prompt: 'Before assigning a meeting, how are rooms freed at its start time?',
    choices: [
      {
        label: 'Remove busy entries with end ≤ start — merge ids back into avail sorted',
        correct: true,
      },
      {
        label: 'Clear all busy rooms — reset every room to available each step',
      },
      {
        label: 'Free only lowest room id — ignore end times when releasing',
      },
      {
        label: 'Never free early — busy until explicit DONE frame runs',
      },
    ],
    explain:
      'The loop filters busy where b.end <= s, pushes freed.room into avail, then sorts avail ascending.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'mr1',
      label: '2 rooms · 4 meetings',
      value: {
        n: 2,
        meetings: [
          [0, 10],
          [1, 5],
          [2, 7],
          [3, 4],
        ],
      },
    },
  ] satisfies SampleInput<MeetInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MeetState | undefined;
    return s?.done ? { ok: true, label: `room ${s.winner}` } : { ok: false, label: 'incomplete' };
  },
};

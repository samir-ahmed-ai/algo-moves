import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

function record({ n, meetings }: MeetInput): Frame<MeetState>[] {  const sorted = [...meetings].sort((a, b) => a[0] - b[0]);
  let avail: number[] = [];
  for (let i = 0; i < n; i++) avail.push(i);
  let busy: BusyMeet[] = [];
  const cnt = new Array(n).fill(0);

  const { emit, frames } = createRecorder<MeetState>(() => ({
        n,
        avail: avail.slice(),
        busy: busy.map((b) => ({ ...b })),
        cnt: cnt.slice(),
        meeting: null,
        assigned: null,
        op: '',
        winner: null,
        done: false
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
      cnt[r]++;
      busy.push({ end: e, room: r });
      busy.sort((a, b) => busyLess(a, b) ? -1 : 1);
      emit(
        'BOOK',
        `room ${r}`,
        `Meeting [${s},${e}]: free room ${r} available → assign, busy until ${e}. cnt[${r}]=${cnt[r]}.`,
        { meeting: m, assigned: r, op: `[${s},${e})→R${r}`, cnt: cnt.slice(), avail: avail.slice(), busy: busy.slice() },
        'good',
      );
    } else {
      busy.sort((a, b) => busyLess(a, b) ? -1 : 1);
      const b = busy.shift()!;
      cnt[b.room]++;
      const newEnd = b.end + (e - s);
      busy.push({ end: newEnd, room: b.room });
      busy.sort((a, b) => busyLess(a, b) ? -1 : 1);
      emit(
        'DELAY',
        `room ${b.room}`,
        `Meeting [${s},${e}]: all busy — reuse room ${b.room}, ends at ${newEnd}. cnt[${b.room}]=${cnt[b.room]}.`,
        { meeting: m, assigned: b.room, op: `[${s},${e})→R${b.room}`, cnt: cnt.slice(), busy: busy.slice() },
      );
    }
  }

  let winner = 0;
  for (let i = 1; i < n; i++) if (cnt[i] > cnt[winner]) winner = i;
  emit(
    'DONE',
    `room ${winner}`,
    `Done. Room ${winner} held the most meetings (${cnt[winner]}). Counts: [${cnt.join(', ')}].`,
    { op: 'done', winner, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MeetState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.assigned !== null && <span className="ml-2 font-mono text-good">room {s.assigned}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {s.cnt.map((c, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.assigned ? 'border-accent bg-accentbg' : i === s.winner ? 'border-good' : 'border-edge',
            )}
          >
            R{i}:{c}
          </span>
        ))}
      </div>
      {s.winner !== null && (
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-good')}>most booked: room {s.winner}</div>
      )}
    </div>
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
    id: "pattern",
    prompt: "Which approach fits \"Meeting Rooms III\"?",
    choices: [
      {
        label: "Two Heaps — fits this problem",
        correct: true
      },
      {
        label: "Round-robin load balancer — different approach"
      },
      {
        label: "Copy-on-write version snapshots — different approach"
      },
      {
        label: "Trie dictionary + spell suggest — different approach"
      }
    ],
    explain: "See Meeting Rooms Iii pattern"
  },
  {
    id: "init",
    prompt: "At the start of a run (Meeting Rooms III), what strategy is established?",
    choices: [
      {
        label: "See Meeting Rooms Iii pattern — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "Meeting Rooms III: min-heap avail rooms, busy heap by end time. Assign earliest free room; if none, delay meeting on earliest-ending room."
  },
  {
    id: "key-step",
    prompt: "On the \"DELAY\" step (room ), what happens?",
    choices: [
      {
        label: "Meeting [,]: all busy — reuse — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "Meeting [,]: all busy — reuse room , ends at . cnt[]=."
  },
  {
    id: "state",
    prompt: "What does the `n` field track in the visualization state?",
    choices: [
      {
        label: "Field n in state — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder snapshots `n` on every emit so each frame shows the algorithm mid-step."
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Meeting Rooms III\"?",
    choices: [
      {
        label: "O(m log n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(versions) get time, O(changes) space — wrong order of growth"
      },
      {
        label: "O(logs) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(m log n). O(n). Meeting Rooms Iii"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Done. Room held the most meetings — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "Done. Room  held the most meetings (). Counts: []."
  }
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

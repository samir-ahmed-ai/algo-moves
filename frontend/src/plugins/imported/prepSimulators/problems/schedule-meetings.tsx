import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Interval {
  start: number;
  end: number;
}

interface MeetingsInput {
  intervals: Interval[];
}

interface MeetingsState {
  // Intervals shown on the timeline (sorted once sorting begins).
  cells: Interval[];
  sorted: boolean; // have we committed to the sorted order yet
  i: number | null; // current meeting under inspection
  prev: number | null; // previous meeting (i-1)
  prevEnd: number | null; // sorted[i-1]!.End we are comparing against
  curStart: number | null; // sorted[i]!.Start we are comparing
  conflict: boolean; // did this step find an overlap
  result: boolean | null; // final answer once known
  done: boolean;
}

const fmt = (iv: Interval) => `[${iv.start},${iv.end}]`;

function record({ intervals }: MeetingsInput): Frame<MeetingsState>[] {
  const original = intervals.map((c) => ({ ...c }));

  const { emit, frames } = createPrepRecorder<MeetingsState>(() => ({
    cells: original.map((c) => ({ ...c })),
    sorted: false,
    i: null,
    prev: null,
    prevEnd: null,
    curStart: null,
    conflict: false,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `${original.length} meetings`,
    `Schedule meetings: can one person attend every meeting? They can if and only if no two intervals overlap. Strategy — sort by start time, then check each meeting against the one before it.`,
    {},
  );

  if (original.length <= 1) {
    const result = true;
    emit(
      'DONE',
      'true',
      `With ${original.length} meeting${original.length === 1 ? '' : 's'} there is nothing to overlap, so all meetings can be attended.`,
      { cells: original.map((c) => ({ ...c })), sorted: true, result, done: true },
      'good',
    );
    return frames;
  }

  const sorted = original.slice().sort((a, b) => a.start - b.start);
  emit(
    'SORT',
    'by start',
    `Sort the meetings by start time: ${sorted.map(fmt).join(' ')}. After sorting, an overlap can only happen between adjacent meetings, so a single left-to-right sweep is enough.`,
    { cells: sorted.map((c) => ({ ...c })), sorted: true },
  );

  let result = true;
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1]!.end;
    const curStart = sorted[i]!.start;
    emit(
      'COMPARE',
      `${curStart} vs ${prevEnd}`,
      `Compare meeting ${fmt(sorted[i]!)} with the previous meeting ${fmt(sorted[i - 1]!)}: does it start (${curStart}) before the previous one ends (${prevEnd})?`,
      { cells: sorted.map((c) => ({ ...c })), sorted: true, i, prev: i - 1, prevEnd, curStart },
    );

    if (curStart < prevEnd) {
      result = false;
      emit(
        'CONFLICT',
        `${curStart} < ${prevEnd}`,
        `Overlap found: ${fmt(sorted[i]!)} starts at ${curStart}, which is before ${fmt(sorted[i - 1]!)} ends at ${prevEnd}. The two meetings collide, so not all meetings can be attended — return false.`,
        {
          cells: sorted.map((c) => ({ ...c })),
          sorted: true,
          i,
          prev: i - 1,
          prevEnd,
          curStart,
          conflict: true,
          result: false,
          done: true,
        },
        'bad',
      );
      return frames;
    }

    emit(
      'OK',
      `${curStart} ≥ ${prevEnd}`,
      `No overlap: ${fmt(sorted[i]!)} starts at ${curStart}, at or after ${fmt(sorted[i - 1]!)} ends at ${prevEnd}. These two are compatible — keep sweeping.`,
      { cells: sorted.map((c) => ({ ...c })), sorted: true, i, prev: i - 1, prevEnd, curStart },
      'good',
    );
  }

  emit(
    'DONE',
    'true',
    `Every adjacent pair was compatible — no meeting starts before the previous one ends. One person can attend all ${sorted.length} meetings.`,
    { cells: sorted.map((c) => ({ ...c })), sorted: true, result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MeetingsState>) {
  const s = frame.state;
  const values = s.cells.map((c) => fmt(c));
  const pointers: ArrayPointer[] = [];
  if (s.prev !== null) pointers.push({ i: s.prev, label: 'prev', tone: 'warn', place: 'above' });
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'below' });

  const tone = (idx: number) => {
    if (s.conflict && (idx === s.i || idx === s.prev)) return 'dead';
    if (s.done && s.result === true) return 'found';
    if (idx === s.i) return 'match';
    if (idx === s.prev) return 'in-window';
    return '';
  };

  const verdictText =
    s.result === null ? '…checking' : s.result ? 'can attend all' : 'conflict — cannot attend all';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.sorted ? 'sorted by start' : 'original order'}
        {s.prevEnd !== null && s.curStart !== null && !s.done && (
          <>
            {' · '}
            <span className="font-mono text-ink">
              start {s.curStart} vs end {s.prevEnd}
            </span>
          </>
        )}
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div
        className={cn(
          'mt-1 font-mono',
          vizText.base,
          s.result === true ? 'text-good' : s.result === false ? 'text-bad' : 'text-ink3',
        )}
      >
        → {verdictText}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MeetingsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.i !== null ? fmt(s.cells[s.i]!) : '—';
  const prev = s.prev !== null ? fmt(s.cells[s.prev]!) : '—';
  return (
    <VarGrid>
      <InspectorRow k="count" v={s.cells.length} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="meeting[i]!" v={cur} />
      <InspectorRow k="meeting[i−1]!" v={prev} />
      <InspectorRow k="start[i]!" v={s.curStart ?? '—'} />
      <InspectorRow k="end[i−1]!" v={s.prevEnd ?? '—'} />
      <InspectorRow k="result" v={s.result === null ? '…' : s.result ? 'true' : 'false'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-schedule-meetings';
export const title = 'Schedule meetings';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Schedule meetings"?',
    choices: [
      {
        label: 'Sort by start + adjacency check — fits this problem',
        correct: true,
      },
      {
        label: 'Three-segment interval insert — different approach',
      },
      {
        label: 'Sort by end + DP + binary search — different approach',
      },
      {
        label: 'Sort + merge coverage — different approach',
      },
    ],
    explain: 'Sort by start; any meeting starting before the previous end conflicts',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Schedule meetings), what strategy is established?',
    choices: [
      {
        label: 'Sort by start; any meeting starting — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Schedule meetings: can one person attend every meeting? They can if and only if no two intervals overlap. Strategy — sort by start time, then check each meeting against the one before it.',
  },
  {
    id: 'key-step',
    prompt: 'On the "CONFLICT" step ( < ), what happens?',
    choices: [
      {
        label: 'Overlap found: starts at , which — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain:
      'Overlap found:  starts at , which is before  ends at . The two meetings collide, so not all meetings can be attended — return false.',
  },
  {
    id: 'state',
    prompt: 'What does the `sorted` field track in the visualization state?',
    choices: [
      {
        label: 'have we committed — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain: 'The recorder keeps `sorted` in sync: have we committed to the sorted order yet',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Schedule meetings"?',
    choices: [
      {
        label: 'O(n log n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(s * c) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(n log n). O(n). sort by start; sorted[i]!.Start < sorted[i-1]!.End -> false',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'No overlap: starts at step — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain:
      'No overlap:  starts at , at or after  ends at . These two are compatible — keep sweeping.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'sm1',
      label: '[0,30] [5,10] [15,20] → false',
      value: {
        intervals: [
          { start: 0, end: 30 },
          { start: 5, end: 10 },
          { start: 15, end: 20 },
        ],
      },
    },
    {
      id: 'sm2',
      label: '[7,10] [2,4] → true',
      value: {
        intervals: [
          { start: 7, end: 10 },
          { start: 2, end: 4 },
        ],
      },
    },
  ] satisfies SampleInput<MeetingsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MeetingsState | undefined;
    return s?.result ? { ok: true, label: 'can attend all' } : { ok: false, label: 'conflict' };
  },
};

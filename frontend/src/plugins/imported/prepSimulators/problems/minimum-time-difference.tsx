import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MtdInput {
  timePoints: string[];
}

interface MtdState {
  timePoints: string[]; // original, unsorted labels for reference
  mins: number[]; // times converted to minutes, sorted once conversion is done
  sorted: boolean; // whether mins is already in ascending order
  i: number | null; // current index in the adjacent scan
  prev: number | null; // i-1, the index we compare against
  wrap: boolean; // this frame is examining the wrap-around gap
  best: number | null; // running minimum difference in minutes
  bestPair: [number, number] | null; // indices producing the current best
  done: boolean;
}

// "HH:MM" -> minutes since midnight, matching the Go char arithmetic.
function toMinutes(tp: string): number {
  return (
    (tp.charCodeAt(0) - 48) * 600 +
    (tp.charCodeAt(1) - 48) * 60 +
    (tp.charCodeAt(3) - 48) * 10 +
    (tp.charCodeAt(4) - 48)
  );
}

function fmt(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function record({ timePoints }: MtdInput): Frame<MtdState>[] {
  const raw = timePoints.map(toMinutes);
  const mins = raw.slice().sort((a, b) => a - b);

  const { emit, frames } = createRecorder<MtdState>(() => ({
    timePoints,
    mins: mins.slice(),
    sorted: false,
    i: null,
    prev: null,
    wrap: false,
    best: null,
    bestPair: null,
    done: false,
  }));

  emit(
    'INIT',
    `n=${timePoints.length}`,
    `Minimum Time Difference: find the smallest gap (in minutes) between any two clock times on a 24h circle. First convert each "HH:MM" to minutes since midnight.`,
    { mins: raw.slice() },
  );

  emit(
    'SORT',
    'sort ↑',
    `Sort the minute values ascending: [${mins.map(fmt).join(', ')}]. Once sorted, the closest pair must be adjacent — except for the pair that wraps past midnight.`,
    { mins: mins.slice(), sorted: true },
  );

  // Wrap-around candidate: last time to first time across midnight.
  const last = mins.length - 1;
  let best = 1440 - mins[last] + mins[0];
  let bestPair: [number, number] = [last, 0];
  emit(
    'WRAP',
    `${best}m`,
    `The wrap-around gap crosses midnight: from ${fmt(mins[last])} forward to ${fmt(mins[0])} is 1440 − ${mins[last]} + ${mins[0]} = ${best} min. Seed the best answer with this.`,
    { mins: mins.slice(), sorted: true, i: last, prev: 0, wrap: true, best, bestPair },
  );

  for (let i = 1; i < mins.length; i++) {
    const d = mins[i] - mins[i - 1];
    if (d < best) {
      best = d;
      bestPair = [i - 1, i];
      emit(
        'FILL',
        `${d}m ✓`,
        `Adjacent gap ${fmt(mins[i - 1])} → ${fmt(mins[i])} = ${mins[i]} − ${mins[i - 1]} = ${d} min. That beats the previous best, so the new minimum is ${best} min.`,
        { mins: mins.slice(), sorted: true, i, prev: i - 1, best, bestPair },
        'good',
      );
    } else {
      emit(
        'SCAN',
        `${d}m`,
        `Adjacent gap ${fmt(mins[i - 1])} → ${fmt(mins[i])} = ${d} min. That is not smaller than the current best (${best} min), so the best stays put.`,
        { mins: mins.slice(), sorted: true, i, prev: i - 1, best, bestPair },
      );
    }
  }

  emit(
    'DONE',
    `${best}m`,
    `All adjacent gaps and the wrap-around are checked. The minimum time difference is ${best} minute${best === 1 ? '' : 's'}.`,
    {
      mins: mins.slice(),
      sorted: true,
      best,
      bestPair,
      done: true,
      i: bestPair[1],
      prev: bestPair[0],
    },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MtdState>) {
  const s = frame.state;
  const chars = s.mins.map(fmt);
  const pointers: ArrayPointer[] = [];
  if (s.i !== null)
    pointers.push({ i: s.i, label: s.wrap ? 'last' : 'i', tone: 'accent', place: 'above' });
  if (s.prev !== null)
    pointers.push({ i: s.prev, label: s.wrap ? 'first' : 'i−1', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (s.done && s.bestPair && (i === s.bestPair[0] || i === s.bestPair[1])) return 'found';
    if (s.i === i || s.prev === i) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.sorted ? 'sorted times' : 'times → minutes'}
        {s.best !== null && (
          <>
            {' · '}best = <span className="font-mono text-ink">{s.best}m</span>
          </>
        )}
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.best !== null && s.bestPair && (
        <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink3', vizText.sm)}>
          {s.wrap && !s.done ? 'wrap-around: ' : 'best gap: '}
          {fmt(s.mins[s.bestPair[0]])} ↔ {fmt(s.mins[s.bestPair[1]])} = {s.best}m
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MtdState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (idx: number | null) =>
    idx !== null && idx >= 0 && idx < s.mins.length ? fmt(s.mins[idx]) : '—';
  return (
    <VarGrid>
      <InspectorRow k="n (times)" v={s.timePoints.length} />
      <InspectorRow k="sorted" v={s.sorted ? 'yes' : 'no'} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="times[i]" v={at(s.i)} />
      <InspectorRow k="times[i−1]" v={at(s.prev)} />
      <InspectorRow k="phase" v={s.wrap ? 'wrap-around' : s.done ? 'done' : 'adjacent'} />
      <InspectorRow k="best (min)" v={s.best ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-minimum-time-difference';
export const title = 'Minimum Time Difference';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Minimum Time Difference"?',
    choices: [
      {
        label: 'Sort + Wrap-around — fits this problem',
        correct: true,
      },
      {
        label: 'Stack of unmatched indices — different approach',
      },
      {
        label: 'Adjacent swap — different approach',
      },
      {
        label: 'Bijection map — different approach',
      },
    ],
    explain: 'See Minimum Time Difference pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Minimum Time Difference), what strategy is established?',
    choices: [
      {
        label: 'See Minimum Time Difference pattern — described in INIT caption',
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
      'Minimum Time Difference: find the smallest gap (in minutes) between any two clock times on a 24h circle. First convert each "HH:MM" to minutes since midnight.',
  },
  {
    id: 'key-step',
    prompt: 'On the "FILL" step (m ✓), what happens?',
    choices: [
      {
        label: 'Adjacent gap → = − = — this move caption',
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
      'Adjacent gap  →  =  −  =  min. That beats the previous best, so the new minimum is  min.',
  },
  {
    id: 'state',
    prompt: 'What does the `timePoints` field track in the visualization state?',
    choices: [
      {
        label: 'original, unsorted labels for reference — updated each frame',
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
    explain: 'The recorder keeps `timePoints` in sync: original, unsorted labels for reference',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Minimum Time Difference"?',
    choices: [
      {
        label: 'O(n log n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n^2) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n*k) time, O(n*k) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n log n). O(n). Minimum Time Difference',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'All adjacent gaps and the wrap-around — final DONE caption',
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
      'All adjacent gaps and the wrap-around are checked. The minimum time difference is  minute.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'mtd1', label: '["23:59","00:00"]', value: { timePoints: ['23:59', '00:00'] } },
    {
      id: 'mtd2',
      label: '["00:00","23:59","12:00","12:05"]',
      value: { timePoints: ['00:00', '23:59', '12:00', '12:05'] },
    },
  ] satisfies SampleInput<MtdInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MtdState | undefined;
    const best = s?.best ?? null;
    return best !== null ? { ok: true, label: `${best} min` } : { ok: false, label: 'n/a' };
  },
};

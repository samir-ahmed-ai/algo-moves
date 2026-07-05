import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type Interval = [number, number];

interface MergeInput {
  intervals: Interval[];
}

interface MergeState {
  sorted: Interval[]; // intervals after sort by start
  res: Interval[]; // merged result built so far
  i: number | null; // index of current interval in `sorted`
  lastIdx: number | null; // index in `res` of the interval we compare against
  overlap: boolean | null; // did cur overlap last?
  extended: boolean; // did this step extend last[1]?
  done: boolean;
}

function fmt(iv: Interval): string {
  return `[${iv[0]},${iv[1]}]`;
}

function record({ intervals }: MergeInput): Frame<MergeState>[] {
  // Sort by start time (faithful to sort.Slice in the Go solution).
  const sorted: Interval[] = intervals.map((iv) => [iv[0], iv[1]] as Interval);
  sorted.sort((a, b) => a[0] - b[0]);

  const res: Interval[] = [];

  const { emit, frames } = createRecorder<MergeState>(() => ({
        sorted: sorted.map((iv) => [iv[0], iv[1]] as Interval),
        res: res.map((iv) => [iv[0], iv[1]] as Interval),
        i: null,
        lastIdx: null,
        overlap: null,
        extended: false,
        done: false
      }));

  emit(
    'SORT',
    `sorted by start`,
    `Merge Intervals: sort the intervals by start time so overlaps are always adjacent — ${sorted
      .map(fmt)
      .join(' ')}. Then sweep left to right, extending the open interval whenever the next one touches it.`,
    {},
  );

  // Seed the result with the first interval.
  res.push([sorted[0][0], sorted[0][1]]);
  emit(
    'SEED',
    `open ${fmt(res[0])}`,
    `Start the result with the first interval ${fmt(sorted[0])}. This is the currently "open" interval whose right edge we may stretch as later intervals arrive.`,
    { i: 0, lastIdx: 0 },
  );

  for (let i = 1; i < sorted.length; i++) {
    const lastIdx = res.length - 1;
    const last = res[lastIdx];
    const cur = sorted[i];
    const overlaps = cur[0] <= last[1];

    if (overlaps) {
      const willExtend = cur[1] > last[1];
      if (willExtend) {
        const before = last[1];
        last[1] = cur[1];
        emit(
          'EXTEND',
          `${fmt(res[lastIdx])}`,
          `${fmt(cur)} overlaps the open interval because its start ${cur[0]} ≤ open end ${before}. Its end ${cur[1]} reaches further, so extend the open interval's right edge to ${cur[1]} → ${fmt(res[lastIdx])}.`,
          { i, lastIdx, overlap: true, extended: true },
          'good',
        );
      } else {
        emit(
          'ABSORB',
          `inside ${fmt(last)}`,
          `${fmt(cur)} overlaps (start ${cur[0]} ≤ open end ${last[1]}) but its end ${cur[1]} ≤ ${last[1]}, so it sits entirely inside the open interval ${fmt(last)}. Nothing changes — just absorb it.`,
          { i, lastIdx, overlap: true, extended: false },
        );
      }
    } else {
      res.push([cur[0], cur[1]]);
      emit(
        'NEW',
        `open ${fmt(cur)}`,
        `${fmt(cur)} starts at ${cur[0]}, which is past the open end ${last[1]}, so there is no overlap. Close ${fmt(last)} and open a fresh interval ${fmt(cur)}.`,
        { i, lastIdx: res.length - 1, overlap: false, extended: false },
      );
    }
  }

  emit(
    'DONE',
    `${res.length} merged`,
    `Sweep complete. The overlapping intervals collapsed into ${res.length} disjoint interval${res.length === 1 ? '' : 's'}: ${res
      .map(fmt)
      .join(' ')}.`,
    { i: null, lastIdx: res.length - 1, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MergeState>) {
  const s = frame.state;
  const labels = s.sorted.map(fmt);
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && !s.done) {
    pointers.push({ i: s.i, label: 'cur', tone: 'accent', place: 'above' });
  }
  const curStart = s.i !== null && s.i < s.sorted.length ? s.sorted[s.i][0] : null;
  const tone = (idx: number) => {
    if (s.i === idx && !s.done) return 'match';
    if (s.i !== null && idx < s.i) return 'dead'; // already consumed
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        sorted intervals
        {curStart !== null && !s.done && (
          <>
            {' · '}cur start ={' '}
            <span className="font-mono text-ink">{curStart}</span>
          </>
        )}
      </div>
      <ArrayRow values={labels} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>merged result</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {s.res.length === 0 ? (
          <span className={cn('font-mono', vizText.sm, 'text-ink3')}>·</span>
        ) : (
          s.res.map((iv, k) => {
            const isOpen = !s.done && k === s.res.length - 1;
            return (
              <span
                key={k}
                className={cn(
                  'rounded border px-2 py-0.5 font-mono',
                  vizText.sm,
                  isOpen ? 'border-accent text-accent' : 'border-good text-good',
                )}
              >
                {fmt(iv)}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MergeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.i !== null && s.i < s.sorted.length ? s.sorted[s.i] : null;
  const last =
    s.lastIdx !== null && s.lastIdx >= 0 && s.lastIdx < s.res.length ? s.res[s.lastIdx] : null;
  return (
    <VarGrid>
      <InspectorRow k="cur (sorted[i])" v={cur ? fmt(cur) : '—'} />
      <InspectorRow k="open interval" v={last ? fmt(last) : '—'} />
      <InspectorRow
        k="overlap?"
        v={s.overlap === null ? '—' : s.overlap ? 'yes (cur[0] ≤ end)' : 'no'}
      />
      <InspectorRow k="extended end?" v={s.extended ? 'yes' : s.overlap === false ? 'n/a' : 'no'} />
      <InspectorRow k="merged count" v={s.res.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-merge-intervals';
export const title = 'Merge Intervals';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Merge Intervals\"?",
    choices: [
      {
        label: "Sort + Greedy Merge — fits this problem",
        correct: true
      },
      {
        label: "Sort by end + DP + binary search — different approach"
      },
      {
        label: "Sort + merge coverage — different approach"
      },
      {
        label: "Compare six pairwise distances — different approach"
      }
    ],
    explain: "Sort by start time, then greedily merge: if `curr[0] <= last[1]`, extend `last[1] = max(last[1], curr[1])`"
  },
  {
    id: "key-step",
    prompt: "On the \"EXTEND\" step (), what happens?",
    choices: [
      {
        label: "overlaps the open interval because — this move caption",
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
    explain: " overlaps the open interval because its start  ≤ open end . Its end  reaches further, so extend the open interval's right edge to  → ."
  },
  {
    id: "state",
    prompt: "What does the `sorted` field track in the visualization state?",
    choices: [
      {
        label: "intervals after sort by start — updated each frame",
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
    explain: "The recorder keeps `sorted` in sync: intervals after sort by start"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Merge Intervals\"?",
    choices: [
      {
        label: "O(n log n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(s * c) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n log n). O(n). Sort by start time, then greedily merge: if `curr[0] <= last[1]`, extend `last[1] = max(last[1], curr[1])`; Otherwise, start a new interval"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Sweep complete. The overlapping intervals — final DONE caption",
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
    explain: "Sweep complete. The overlapping intervals collapsed into  disjoint interval: ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'mi1',
      label: '[1,3] [2,6] [8,10] [15,18]',
      value: {
        intervals: [
          [1, 3],
          [2, 6],
          [8, 10],
          [15, 18],
        ] as Interval[],
      },
    },
    {
      id: 'mi2',
      label: '[1,4] [4,5]',
      value: {
        intervals: [
          [1, 4],
          [4, 5],
        ] as Interval[],
      },
    },
  ] satisfies SampleInput<MergeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MergeState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const label = s.res.map((iv) => `[${iv[0]},${iv[1]}]`).join(' ');
    return { ok: true, label };
  },
};

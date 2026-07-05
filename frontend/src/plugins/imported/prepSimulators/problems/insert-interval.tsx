import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

type Interval = [number, number];

interface InsertInput {
  ins: Interval[];
  x: Interval;
}

type Phase = 'init' | 'before' | 'merge' | 'place' | 'after' | 'done';

interface InsertState {
  ins: Interval[];
  x: Interval; // the new interval as it grows by absorbing overlaps
  res: Interval[]; // result built so far
  i: number | null; // index in `ins` currently under consideration
  phase: Phase;
  placedAt: number | null; // index in res where x landed
  done: boolean;
}

const fmt = (iv: Interval) => `[${iv[0]},${iv[1]}]`;

function record({ ins, x }: InsertInput): Frame<InsertState>[] {  const res: Interval[] = [];
  // local mutable copy of x so we never mutate the input tuple
  let xs = x[0];
  let xe = x[1];

  const { emit, frames } = createRecorder<InsertState>(() => ({
        ins: ins,
        x: [xs, xe],
        res: res.map((r) => [r[0], r[1]] as Interval),
        i: null,
        phase: 'init',
        placedAt: null,
        done: false
      }));

  emit('INIT', `insert ${fmt([xs, xe])}`, `Insert Interval: the existing intervals ${ins.map(fmt).join(' ')} are sorted and non-overlapping. We splice in ${fmt([xs, xe])} using three segments — copy everything strictly before it, absorb every overlap into x, then copy everything after.`, { i: null, phase: 'init', placedAt: null });

  let i = 0;

  // Segment 1 — copy intervals that end before x starts (no overlap, left side).
  while (i < ins.length && ins[i][1] < xs) {
    res.push([ins[i][0], ins[i][1]]);
    emit('BEFORE', `copy ${fmt(ins[i])}`, `ins[${i}] = ${fmt(ins[i])} ends at ${ins[i][1]}, which is below x.start = ${xs}, so it sits entirely to the left. Copy it straight into the result.`, { i: i, phase: 'before', placedAt: null });
    i++;
  }

  // Segment 2 — absorb every interval that overlaps x, extending x's bounds.
  while (i < ins.length && ins[i][0] <= xe) {
    const before: Interval = [xs, xe];
    if (ins[i][0] < xs) xs = ins[i][0];
    if (ins[i][1] > xe) xe = ins[i][1];
    emit('MERGE', `absorb ${fmt(ins[i])}`, `ins[${i}] = ${fmt(ins[i])} starts at ${ins[i][0]} ≤ x.end = ${before[1]}, so it overlaps x. Absorb it: x grows from ${fmt(before)} to ${fmt([xs, xe])} by taking the min start and max end.`, { i: i, phase: 'merge', placedAt: null });
    i++;
  }

  // Place the merged x.
  res.push([xs, xe]);
  const placed = res.length - 1;
  emit('PLACE', `place ${fmt([xs, xe])}`, `No more overlaps. The fully merged interval ${fmt([xs, xe])} now goes into the result at position ${placed}.`, { i: null, phase: 'place', placedAt: placed }, 'good');

  // Segment 3 — copy the remaining intervals (all to the right of x).
  while (i < ins.length) {
    res.push([ins[i][0], ins[i][1]]);
    emit('AFTER', `copy ${fmt(ins[i])}`, `ins[${i}] = ${fmt(ins[i])} starts after x.end = ${xe}, so it belongs to the right segment. Copy it across unchanged.`, { i: i, phase: 'after', placedAt: placed });
    i++;
  }

  emit('DONE', `${res.length} intervals`, `Done. The result ${res.map(fmt).join(' ')} stays sorted and non-overlapping. Time O(n), space O(n) for the output list.`, { i: null, phase: 'done', placedAt: placed , done: true }, 'good');

  return frames;
}

function View({ frame }: PluginViewProps<InsertState>) {
  const s = frame.state;

  const inputCells = s.ins.map(fmt);
  const inputPointers: ArrayPointer[] = [];
  if (s.i !== null) {
    const lab = s.phase === 'before' ? 'copy' : s.phase === 'merge' ? 'absorb' : 'i';
    inputPointers.push({ i: s.i, label: lab, tone: s.phase === 'merge' ? 'warn' : 'accent', place: 'above' });
  }
  const inputTone = (idx: number) =>
    s.i === idx ? (s.phase === 'merge' ? 'match' : s.phase === 'after' ? 'match' : 'lo') : '';

  const resCells = s.res.map(fmt);
  const resTone = (idx: number) => (s.placedAt !== null && idx === s.placedAt ? 'found' : 'match');

  const rail = (
    <>
      <RailGroup label="merge">
        <RailStat k="x" v={fmt(s.x)} tone="accent" />
        <RailStat k="phase" v={s.phase} />
        <RailStat k="i" v={s.i ?? '—'} />
        <RailStat k="ins[i]" v={s.i !== null ? fmt(s.ins[s.i]) : '—'} />
      </RailGroup>
      {s.done && <RailResult label="result" value={s.res.map(fmt).join(' ')} tone="good" />}
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      <div className="text-xs text-ink3 mb-1">input intervals</div>
      {inputCells.length > 0 ? (
        <ArrayRow values={inputCells} cellTone={inputTone} pointers={inputPointers} windowRange={null} />
      ) : (
        <div className="font-mono text-sm text-ink3">(none)</div>
      )}

      <div className="text-xs text-ink3 mt-2 mb-1">result</div>
      {resCells.length > 0 ? (
        <ArrayRow values={resCells} cellTone={resTone} pointers={[]} windowRange={null} />
      ) : (
        <div className="font-mono text-sm text-ink3">(empty)</div>
      )}
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<InsertState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="x (merged)" v={fmt(s.x)} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="ins[i]" v={s.i !== null ? fmt(s.ins[s.i]) : '—'} />
      <InspectorRow k="result size" v={s.res.length} />
      <InspectorRow k="x placed at" v={s.placedAt ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-insert-interval';
export const title = 'Insert interval';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Insert interval\"?",
    choices: [
      {
        label: "Three-segment interval insert — fits this problem",
        correct: true
      },
      {
        label: "Compare six pairwise distances — different approach"
      },
      {
        label: "Brute-force nearest store by distance — different approach"
      },
      {
        label: "Sort + Greedy Merge — different approach"
      }
    ],
    explain: "Before / overlap-merge / after segments around the new interval"
  },
  {
    id: "init",
    prompt: "At the start of a run (Insert interval), what strategy is established?",
    choices: [
      {
        label: "Before / overlap-merge / after segments — described in INIT caption",
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
    explain: "Insert Interval: the existing intervals  are sorted and non-overlapping. We splice in  using three segments — copy everything strictly before it, absorb every overlap into x, then copy everything after."
  },
  {
    id: "key-step",
    prompt: "On the \"PLACE\" step (place ), what happens?",
    choices: [
      {
        label: "No more overlaps. The fully merged — this move caption",
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
    explain: "No more overlaps. The fully merged interval  now goes into the result at position ."
  },
  {
    id: "state",
    prompt: "What does the `x` field track in the visualization state?",
    choices: [
      {
        label: "the new interval — updated each frame",
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
    explain: "The recorder keeps `x` in sync: the new interval as it grows by absorbing overlaps"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Insert interval\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(1) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(m·n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n^2) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). copy before; absorb overlaps into x; copy the rest"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Done. The result stays sorted — final DONE caption",
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
    explain: "Done. The result  stays sorted and non-overlapping. Time O(n), space O(n) for the output list."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ii1',
      label: '[[1,3],[6,9]] + [2,5]',
      value: { ins: [[1, 3], [6, 9]], x: [2, 5] } as InsertInput,
    },
    {
      id: 'ii2',
      label: '[[1,2],[3,5],[6,7],[8,10],[12,16]] + [4,8]',
      value: {
        ins: [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]],
        x: [4, 8],
      } as InsertInput,
    },
  ] satisfies SampleInput<InsertInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as InsertState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: true, label: s.res.map(fmt).join(' ') };
  },
};

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createPrepRecorder, railItem } from '../strictHelpers';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface KClosestInput {
  points: [number, number][];
  k: number;
}

interface Pt {
  x: number;
  y: number;
  d2: number; // squared distance to origin: x*x + y*y
}

interface KClosestState {
  points: Pt[]; // current order (mutated as we sort)
  k: number;
  i: number | null; // selection-sort outer boundary
  j: number | null; // scanning index looking for a smaller d2
  minIdx: number | null; // index of smallest d2 found in [i, n)
  compareIdx: number | null; // index currently compared against minIdx
  sortedUpto: number; // cells [0, sortedUpto) are locked in place
  answerCount: number; // once done, the first `answerCount` points are the result
  done: boolean;
}

function record({ points, k }: KClosestInput): Frame<KClosestState>[] {
  const pts: Pt[] = points.map(([x, y]) => ({ x, y, d2: x * x + y * y }));
  const n = pts.length;

  const { emit, frames } = createPrepRecorder<KClosestState>(() => ({
    points: pts.map((p) => ({ ...p })),
    k,
    i: null,
    j: null,
    minIdx: null,
    compareIdx: null,
    sortedUpto: 0,
    answerCount: 0,
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `K Closest Points to Origin: return the ${k} points nearest (0,0). Distance ordering only needs the squared distance x² + y² (no square root), so we sort by that and take the first ${k}.`,
    {},
  );

  for (let idx = 0; idx < n; idx++) {
    const p = pts[idx]!;
    emit(
      'DIST',
      `d²=${p!.d2}`,
      `Point (${p!.x}, ${p!.y}): its squared distance is ${p!.x}² + ${p!.y}² = ${p!.d2}. We compare these squared values directly — the square root would not change the ordering.`,
      { j: idx },
    );
  }

  // Selection sort by d2 ascending — deterministic and easy to animate as the
  // sort the Go `sort.Slice` performs (same result: points ordered by d²).
  for (let i = 0; i < n; i++) {
    let minIdx = i;
    emit(
      'SELECT',
      `min@${i}`,
      `Find the smallest remaining squared distance from position ${i} onward. Start by assuming position ${i} (d²=${pts[i]!.d2}) is the minimum.`,
      { i, minIdx, sortedUpto: i },
    );
    for (let j = i + 1; j < n; j++) {
      emit(
        'COMPARE',
        `${pts[j]!.d2} vs ${pts[minIdx]!.d2}`,
        `Compare position ${j} (d²=${pts[j]!.d2}) against the current minimum at ${minIdx} (d²=${pts[minIdx]!.d2}). ${pts[j]!.d2 < pts[minIdx]!.d2 ? `Smaller — ${j} becomes the new minimum.` : `Not smaller — keep ${minIdx}.`}`,
        { i, j, minIdx, compareIdx: j, sortedUpto: i },
      );
      if (pts[j]!.d2 < pts[minIdx]!.d2) minIdx = j;
    }
    if (minIdx !== i) {
      const tmp = pts[i]!;
      pts[i]! = pts[minIdx]!;
      pts[minIdx]! = tmp;
      emit(
        'SWAP',
        `swap ${i}↔${minIdx}`,
        `The nearest remaining point (d²=${pts[i]!.d2}) was at ${minIdx}; swap it into position ${i}. Positions 0..${i} are now sorted by distance.`,
        { i, minIdx, sortedUpto: i + 1 },
      );
    } else {
      emit(
        'LOCK',
        `lock ${i}`,
        `Position ${i} already holds the nearest remaining point (d²=${pts[i]!.d2}). Lock it in place; positions 0..${i} are sorted.`,
        { i, minIdx: i, sortedUpto: i + 1 },
      );
    }
  }

  emit(
    'DONE',
    `${k} closest`,
    `The points are sorted by squared distance. The first ${k} — ${pts
      .slice(0, k)
      .map((p) => `(${p.x},${p.y})`)
      .join(', ')} — are the ${k} closest to the origin. Time O(n log n), Space O(1).`,
    { sortedUpto: n, answerCount: k, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<KClosestState>) {
  const s = frame.state;
  const values = s.points.map((p) => p.d2);
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null && s.i !== null)
    pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'above' });
  if (s.minIdx !== null) pointers.push({ i: s.minIdx, label: 'min', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (s.done && i < s.answerCount) return 'found';
    if (!s.done && i < s.sortedUpto) return 'found';
    if (i === s.compareIdx) return 'match';
    if (i === s.minIdx && s.i !== null) return 'lo';
    return '';
  };

  const pointLabels = s.points.map((p, i) => {
    const active = !s.done && i === s.compareIdx;
    const locked = s.done ? i < s.answerCount : i < s.sortedUpto;
    return railItem(`(${p.x},${p.y})`, active ? 'accent' : locked ? 'good' : undefined);
  });

  const answerPoints = s.done ? s.points.slice(0, s.answerCount).map((p) => `(${p.x},${p.y})`) : [];

  const rail = (
    <>
      <RailStack label="points" items={pointLabels} />
      <RailGroup label="scan">
        <RailStat k="k" v={s.k} />
        <RailStat k="i" v={s.i ?? '—'} tone="accent" />
        <RailStat k="j" v={s.j !== null && s.i !== null ? s.j : '—'} tone="warn" />
        <RailStat k="sorted" v={s.sortedUpto} />
      </RailGroup>
      {s.done && <RailResult label="closest" value={answerPoints.join(', ')} tone="good" />}
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<KClosestState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = (idx: number | null) =>
    idx !== null && idx >= 0 && idx < s.points.length
      ? `(${s.points[idx]!.x},${s.points[idx]!.y}) d²=${s.points[idx]!.d2}`
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="i (boundary)" v={s.i ?? '—'} />
      <InspectorRow k="j (scan)" v={s.j ?? '—'} />
      <InspectorRow k="min point" v={cur(s.minIdx)} />
      <InspectorRow k="sorted upto" v={s.sortedUpto} />
      <InspectorRow k="result" v={s.done ? `${s.answerCount} closest` : '…sorting'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-k-closest-points-to-origin';
export const title = 'K Closest Points to Origin';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "K Closest Points to Origin"?',
    choices: [
      {
        label: 'Sort — fits this problem',
        correct: true,
      },
      {
        label: 'Uniform random in range — different approach',
      },
      {
        label: 'Gauss sum XOR trick — different approach',
      },
      {
        label: 'Enumerate 2 candidates — different approach',
      },
    ],
    explain: 'See K Closest Points To Origin pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (K Closest Points to Origin), what strategy is established?',
    choices: [
      {
        label: 'See K Closest Points To Origin — described in INIT caption',
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
      'K Closest Points to Origin: return the  points nearest (0,0). Distance ordering only needs the squared distance x² + y² (no square root), so we sort by that and take the first .',
  },
  {
    id: 'key-step',
    prompt: 'On the "COMPARE" step ( vs ), what happens?',
    choices: [
      {
        label: 'Compare position (d²=) against the current — this move caption',
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
      'Compare position  (d²=) against the current minimum at  (d²=). ${pts[j]!.d2 < pts[minIdx]!.d2 ? ',
  },
  {
    id: 'state',
    prompt: 'What does the `points` field track in the visualization state?',
    choices: [
      {
        label: 'current order (mutated as we — updated each frame',
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
    explain: 'The recorder keeps `points` in sync: current order (mutated as we sort)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "K Closest Points to Origin"?',
    choices: [
      {
        label: 'O(n log n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(√n) time, O(√n) space — wrong order of growth',
      },
    ],
    explain: 'O(n log n). O(1). K Closest Points To Origin',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The points are sorted by squared — final DONE caption',
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
      'The points are sorted by squared distance. The first  — ${pts\n      .slice(0, k)\n      .map((p) => ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'kc1',
      label: '[[1,3],[-2,2]], k=1',
      value: {
        points: [
          [1, 3],
          [-2, 2],
        ],
        k: 1,
      },
    },
    {
      id: 'kc2',
      label: '[[3,3],[5,-1],[-2,4]], k=2',
      value: {
        points: [
          [3, 3],
          [5, -1],
          [-2, 4],
        ],
        k: 2,
      },
    },
  ] satisfies SampleInput<KClosestInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as KClosestState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const closest = s.points.slice(0, s.answerCount).map((p) => `(${p.x},${p.y})`);
    return { ok: true, label: closest.join(', ') };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type Point = [number, number];

interface KClosestInput {
  pairs: Point[];
  k: number;
}

interface KClosestState {
  k: number;
  order: Point[]; // current arrangement of points (sorted view as it forms)
  dist: number[]; // distSq aligned with `order`
  sortedUpto: number; // indices [0, sortedUpto) are locked into final sorted position
  i: number | null; // slot being filled this pass (selection sort)
  j: number | null; // candidate index under comparison
  best: number | null; // index of current minimum-distance candidate
  resultUpto: number; // once chosen, [0, resultUpto) is the answer slice
  done: boolean;
}

function distSq(p: Point): number {
  return p[0] * p[0] + p[1] * p[1];
}

function fmtPt(p: Point): string {
  return `(${p[0]},${p[1]})`;
}

function record({ pairs, k }: KClosestInput): Frame<KClosestState>[] {  const order: Point[] = pairs.map((p) => [p[0], p[1]] as Point);
  const dist = order.map(distSq);
  const n = order.length;
  const kClamped = Math.min(k, n);

  const { emit, frames } = createRecorder<KClosestState>(() => ({
        k: kClamped,
        order: order.map((p) => [p[0], p[1]] as Point),
        dist: dist.slice(),
        sortedUpto: 0,
        i: null,
        j: null,
        best: null,
        resultUpto: 0,
        done: false
      }));

  emit(
    'INIT',
    `k=${kClamped}`,
    `Find the ${kClamped} points closest to the origin. Distance to (0,0) is sqrt(x²+y²), but ordering only needs the squared distance x²+y² — so we skip the sqrt and sort by that, then take the first ${kClamped}.`,
    { sortedUpto: 0 },
  );

  // Selection sort by squared distance — each pass exposes a "find the next
  // closest" decision so the animation teaches the sort, matching the Go
  // solution's sort.Slice(distSq i < distSq j) ordering.
  for (let i = 0; i < n; i++) {
    let best = i;
    emit(
      'PASS',
      `pass ${i}`,
      `Looking for the closest remaining point to place at position ${i}. Start by assuming ${fmtPt(order[i])} (dist² = ${dist[i]}) is the closest.`,
      { sortedUpto: i, i, j: i, best },
    );
    for (let j = i + 1; j < n; j++) {
      emit(
        'COMPARE',
        `${dist[j]} vs ${dist[best]}`,
        `Compare ${fmtPt(order[j])} (dist² = ${dist[j]}) against the current closest ${fmtPt(order[best])} (dist² = ${dist[best]}). ${
          dist[j] < dist[best] ? `${dist[j]} < ${dist[best]}, so this one is nearer.` : `${dist[j]} ≥ ${dist[best]}, so keep the current closest.`
        }`,
        { sortedUpto: i, i, j, best },
      );
      if (dist[j] < dist[best]) {
        best = j;
        emit(
          'NEWMIN',
          `best=${best}`,
          `${fmtPt(order[best])} is the new closest remaining point (dist² = ${dist[best]}).`,
          { sortedUpto: i, i, j, best },
        );
      }
    }
    if (best !== i) {
      const tmpP = order[i];
      order[i] = order[best];
      order[best] = tmpP;
      const tmpD = dist[i];
      dist[i] = dist[best];
      dist[best] = tmpD;
      emit(
        'SWAP',
        `place ${fmtPt(order[i])}`,
        `Move the closest remaining point ${fmtPt(order[i])} (dist² = ${dist[i]}) into position ${i}. Positions 0…${i} are now in sorted order.`,
        { sortedUpto: i + 1, i, j: null, best: null },
      );
    } else {
      emit(
        'LOCK',
        `lock ${fmtPt(order[i])}`,
        `${fmtPt(order[i])} (dist² = ${dist[i]}) was already the closest remaining point, so it stays at position ${i}. Positions 0…${i} are sorted.`,
        { sortedUpto: i + 1, i, j: null, best: null },
      );
    }
  }

  emit(
    'SLICE',
    `take ${kClamped}`,
    `The points are fully sorted by squared distance. Take the first ${kClamped} — these are the ${kClamped} points closest to the origin.`,
    { sortedUpto: n, resultUpto: kClamped, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<KClosestState>) {
  const s = frame.state;
  const labels = s.order.map((p) => `(${p[0]},${p[1]})`);
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i < s.order.length) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null && s.j < s.order.length) pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'above' });
  if (s.best !== null && s.best < s.order.length) pointers.push({ i: s.best, label: 'min', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (s.done) return i < s.resultUpto ? 'found' : 'dead';
    if (i < s.sortedUpto) return 'lo';
    if (s.best !== null && i === s.best) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span> · sorting points by{' '}
        <span className="font-mono text-ink">x²+y²</span> (no sqrt)
      </div>
      <ArrayRow values={labels} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        dist² [{s.dist.join(', ')}]
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {labels.slice(0, s.resultUpto).join(', ') || '∅'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<KClosestState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (idx: number | null) =>
    idx !== null && idx >= 0 && idx < s.order.length ? `(${s.order[idx][0]},${s.order[idx][1]})` : '—';
  const distAt = (idx: number | null) =>
    idx !== null && idx >= 0 && idx < s.dist.length ? s.dist[idx] : '—';
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="i (slot)" v={s.i ?? '—'} />
      <InspectorRow k="j (scan)" v={s.j ?? '—'} />
      <InspectorRow k="point[j]" v={at(s.j)} />
      <InspectorRow k="dist²[j]" v={distAt(s.j)} />
      <InspectorRow k="closest so far" v={at(s.best)} />
      <InspectorRow k="dist² best" v={distAt(s.best)} />
      <InspectorRow k="sorted prefix" v={s.sortedUpto} />
      <InspectorRow
        k="result"
        v={s.done ? `[${s.order.slice(0, s.resultUpto).map((p) => `(${p[0]},${p[1]})`).join(', ')}]` : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-find-k-closest-to-center';
export const title = 'find K closest to center';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"find K closest to center\"?",
    choices: [
      {
        label: "Sort by distance to origin — fits this problem",
        correct: true
      },
      {
        label: "Hash map chain reconstruction — different approach"
      },
      {
        label: "Two-pass frequency map — different approach"
      },
      {
        label: "Frequency map — different approach"
      }
    ],
    explain: "Sort points by squared distance, take the first k"
  },
  {
    id: "init",
    prompt: "At the start of a run (find K closest to center), what strategy is established?",
    choices: [
      {
        label: "Sort points by squared distance, take — described in INIT caption",
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
    explain: "Find the  points closest to the origin. Distance to (0,0) is sqrt(x²+y²), but ordering only needs the squared distance x²+y² — so we skip the sqrt and sort by that, then take the first ."
  },
  {
    id: "key-step",
    prompt: "On the \"SWAP\" step (place ), what happens?",
    choices: [
      {
        label: "Move the closest remaining point (dist² — this move caption",
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
    explain: "Move the closest remaining point  (dist² = ) into position . Positions 0… are now in sorted order."
  },
  {
    id: "state",
    prompt: "What does the `order` field track in the visualization state?",
    choices: [
      {
        label: "current arrangement of points (sorted — updated each frame",
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
    explain: "The recorder keeps `order` in sync: current arrangement of points (sorted view as it forms)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"find K closest to center\"?",
    choices: [
      {
        label: "O(n log n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(t log t) time, O(t) space — wrong order of growth"
      },
      {
        label: "O(log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n log n). O(n). compare x*x+y*y (no sqrt); slice [:k]"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "The points are fully sorted — final DONE caption",
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
    explain: "The points are fully sorted by squared distance. Take the first  — these are the  points closest to the origin."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'kc1',
      label: '[(1,3),(-2,2),(5,8),(0,1)] k=2',
      value: { pairs: [[1, 3], [-2, 2], [5, 8], [0, 1]], k: 2 },
    },
    {
      id: 'kc2',
      label: '[(3,3),(5,-1),(-2,4)] k=2',
      value: { pairs: [[3, 3], [5, -1], [-2, 4]], k: 2 },
    },
  ] satisfies SampleInput<KClosestInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as KClosestState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const result = s.order.slice(0, s.resultUpto).map((p) => `(${p[0]},${p[1]})`);
    return { ok: true, label: result.join(', ') || '∅' };
  },
};

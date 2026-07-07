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

interface GeoPoint {
  x: number;
  y: number;
}

interface NearestInput {
  stores: GeoPoint[];
  customers: GeoPoint[];
}

interface NearestState {
  stores: GeoPoint[];
  customers: GeoPoint[];
  ci: number | null; // index of customer currently being processed
  si: number | null; // index of store currently being compared
  d: number | null; // squared distance computed at this step
  best: number; // best (min) squared distance so far for the current customer (-1 = none)
  bestStore: number | null; // store index that owns the current best
  res: number[]; // finalized nearest squared distance per customer (-1 = unfilled)
  done: boolean;
}

const UNFILLED = -1;

// Squared Euclidean distance — matches distED in the Go solution (no sqrt).
function distED(a: GeoPoint, b: GeoPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

const fmtPt = (p: GeoPoint) => `(${p.x},${p.y})`;

function record({ stores, customers }: NearestInput): Frame<NearestState>[] {
  const res = new Array<number>(customers.length).fill(UNFILLED);

  const { emit, frames } = createPrepRecorder<NearestState>(() => ({
    stores,
    customers,
    ci: null,
    si: null,
    d: null,
    best: UNFILLED,
    bestStore: null,
    res: res.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `${customers.length} customers, ${stores.length} stores`,
    `Distance of nearest stores: for every customer we brute-force the squared Euclidean distance (dx²+dy²) to each of the ${stores.length} stores and keep the smallest. No square roots are taken — comparing squared distances preserves the ordering. Time O(s·c), Space O(1).`,
    {},
  );

  for (let i = 0; i < customers.length; i++) {
    const cust = customers[i]!;
    let best = UNFILLED;
    let bestStore: number | null = null;

    emit(
      'CUSTOMER',
      `customer ${i} ${fmtPt(cust!)}`,
      `Start customer ${i} at ${fmtPt(cust!)}. best is reset to ∞ — we have not measured any store for this customer yet.`,
      { ci: i, best, bestStore },
    );

    for (let j = 0; j < stores.length; j++) {
      const store = stores[j]!;
      const d = distED(cust!, store!);

      if (best < 0 || d < best) {
        const improved = best < 0;
        best = d;
        bestStore = j;
        emit(
          'IMPROVE',
          `best=${d}`,
          improved
            ? `Store ${j} ${fmtPt(store!)} is the first store measured: distance² = (${cust!.x}−${store!.x})² + (${cust!.y}−${store!.y})² = ${d}. Set best = ${d}.`
            : `Store ${j} ${fmtPt(store!)} gives distance² = ${d}, which is smaller than the previous best — update best = ${d} (store ${j} is now nearest so far).`,
          { ci: i, si: j, d, best, bestStore },
          'good',
        );
      } else {
        emit(
          'KEEP',
          `d=${d} ≥ ${best}`,
          `Store ${j} ${fmtPt(store!)} gives distance² = ${d}, which is not closer than the current best (${best}). Keep best unchanged.`,
          { ci: i, si: j, d, best, bestStore },
        );
      }
    }

    res[i]! = best;
    emit(
      'RECORD',
      `res[${i}]!=${best}`,
      `All stores checked for customer ${i}. The nearest store is store ${bestStore} with squared distance ${best}, so res[${i}]! = ${best}.`,
      { ci: i, best, bestStore, res: res.slice() },
      'good',
    );
  }

  emit(
    'DONE',
    `[${res.join(', ')}]`,
    `Every customer is resolved. The result array of nearest squared distances is [${res.join(', ')}].`,
    { res: res.slice(), done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<NearestState>) {
  const s = frame.state;
  // Board = the store timeline. Each cell shows the store coordinate.
  const cells = s.stores.map((p) => fmtPt(p));
  const pointers: ArrayPointer[] = [];
  if (s.si !== null) pointers.push({ i: s.si, label: 'check', tone: 'accent', place: 'above' });
  if (s.bestStore !== null)
    pointers.push({ i: s.bestStore, label: 'nearest', tone: 'good', place: 'below' });

  const tone = (i: number) => (s.bestStore === i ? 'found' : s.si === i ? 'match' : '');

  const cust = s.ci !== null ? s.customers[s.ci]! : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        customer{' '}
        <span className="font-mono text-ink">
          {s.ci !== null ? `${s.ci} ${fmtPt(s.customers[s.ci]!)}` : '—'}
        </span>
        {cust && (
          <>
            {' · '}best d² = <span className="font-mono text-ink">{s.best < 0 ? '∞' : s.best}</span>
            {s.d !== null && (
              <>
                {' · '}this d² = <span className="font-mono text-ink">{s.d}</span>
              </>
            )}
          </>
        )}
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        stores (index = store id, value = coordinate)
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        res [{s.res.map((v) => (v === UNFILLED ? '·' : v)).join(', ')}]
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ [{s.res.join(', ')}]</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<NearestState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cust = s.ci !== null ? s.customers[s.ci]! : null;
  const store = s.si !== null ? s.stores[s.si]! : null;
  return (
    <VarGrid>
      <InspectorRow k="customer i" v={s.ci ?? '—'} />
      <InspectorRow k="customer pt" v={cust ? fmtPt(cust) : '—'} />
      <InspectorRow k="store j" v={s.si ?? '—'} />
      <InspectorRow k="store pt" v={store ? fmtPt(store) : '—'} />
      <InspectorRow k="this d²" v={s.d ?? '—'} />
      <InspectorRow k="best d²" v={s.best < 0 ? '∞' : s.best} />
      <InspectorRow k="nearest store" v={s.bestStore ?? '—'} />
      <InspectorRow
        k="filled"
        v={`${s.res.filter((v) => v !== UNFILLED).length}/${s.customers.length}`}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-distance-of-nearest-stores';
export const title = 'Distance of nearest stores';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Distance of nearest stores"?',
    choices: [
      {
        label: 'Brute-force nearest store by distance — fits this problem',
        correct: true,
      },
      {
        label: 'Sort by end + DP + binary search — different approach',
      },
      {
        label: 'Sort + merge coverage — different approach',
      },
      {
        label: 'Sort Starts/Ends + Sweep — different approach',
      },
    ],
    explain: 'For each customer, the minimum squared distance to any store',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Distance of nearest stores), what strategy is established?',
    choices: [
      {
        label: 'For each customer, the minimum squared — described in INIT caption',
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
      'Distance of nearest stores: for every customer we brute-force the squared Euclidean distance (dx²+dy²) to each of the  stores and keep the smallest. No square roots are taken — comparing squared distances preserves the ordering. Time O(s·c), Space O(1).',
  },
  {
    id: 'key-step',
    prompt: 'On the "KEEP" step (d= ≥ ), what happens?',
    choices: [
      {
        label: 'Store gives distance² = , which — this move caption',
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
      'Store   gives distance² = , which is not closer than the current best (). Keep best unchanged.',
  },
  {
    id: 'state',
    prompt: 'What does the `ci` field track in the visualization state?',
    choices: [
      {
        label: 'index of customer currently — updated each frame',
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
    explain: 'The recorder keeps `ci` in sync: index of customer currently being processed',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Distance of nearest stores"?',
    choices: [
      {
        label: 'O(s * c) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n^2) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(s * c). O(1). brute force dx^2+dy^2; keep the min per customer',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every customer is resolved. The result — final DONE caption',
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
    explain: 'Every customer is resolved. The result array of nearest squared distances is [].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'dns1',
      label: '2 stores, 2 customers',
      value: {
        stores: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
        ],
        customers: [
          { x: 1, y: 1 },
          { x: 3, y: 2 },
        ],
      },
    },
    {
      id: 'dns2',
      label: '3 stores, 3 customers',
      value: {
        stores: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
          { x: 2, y: 1 },
        ],
        customers: [
          { x: 1, y: 0 },
          { x: 4, y: 4 },
          { x: 2, y: 2 },
        ],
      },
    },
  ] satisfies SampleInput<NearestInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as NearestState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: true, label: `[${s.res.join(', ')}]` };
  },
};

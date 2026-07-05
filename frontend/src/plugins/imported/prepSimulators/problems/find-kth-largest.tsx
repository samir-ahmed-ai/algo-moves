import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface KthInput {
  nums: number[];
  k: number;
}

interface KthState {
  a: number[]; // live array (mutated by partition swaps)
  k: number;
  target: number; // index n-k that, once a value lands there, is the answer
  lo: number; // active search window low bound
  hi: number; // active search window high bound
  pivot: number | null; // value of the current pivot (a[hi] at partition start)
  pivotIdx: number | null; // index the pivot currently lives at
  i: number | null; // scanning pointer inside partition
  store: number | null; // boundary index where the next "<= pivot" value goes
  p: number | null; // final pivot position returned by a partition
  result: number | null; // the kth largest value, once found
  done: boolean;
}

function record({ nums, k }: KthInput): Frame<KthState>[] {  const a = nums.slice();
  const n = a.length;
  const target = n - k;

  const { emit, frames } = createRecorder<KthState>(() => ({
        a: a.slice(),
        k,
        target,
        lo: 0,
        hi: n - 1,
        pivot: null,
        pivotIdx: null,
        i: null,
        store: null,
        p: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `target=${target}`,
    `Find the ${k}th largest value via Quickselect. In fully sorted order the kth largest sits at index n − k = ${n} − ${k} = ${target}, so we hunt for whatever value ends up at index ${target} — without sorting the whole array.`,
    { lo: 0, hi: n - 1 },
  );

  let lo = 0;
  let hi = n - 1;
  let result: number | null = null;

  while (lo < hi) {
    // --- partition(a, lo, hi) ---
    const pivot = a[hi];
    let store = lo;
    emit(
      'PIVOT',
      `pivot=${pivot}`,
      `Partition the window [${lo}, ${hi}]. Take the last element a[${hi}] = ${pivot} as the pivot. Walk a "store" boundary (start ${store}) — everything left of it will be ≤ pivot.`,
      { lo, hi, pivot, pivotIdx: hi, store, i: lo },
    );

    for (let i = lo; i < hi; i++) {
      if (a[i] <= pivot) {
        if (i !== store) {
          [a[i], a[store]] = [a[store], a[i]];
          emit(
            'SWAP',
            `swap ${i}↔${store}`,
            `a[${i}] = ${a[store]} ≤ ${pivot}, so swap it to the boundary at index ${store} and advance the boundary. Small values pile up on the left.`,
            { lo, hi, pivot, pivotIdx: hi, i, store },
          );
        } else {
          emit(
            'KEEP',
            `keep ${i}`,
            `a[${i}] = ${a[i]} ≤ ${pivot} and it is already at the boundary ${store}, so just advance the boundary.`,
            { lo, hi, pivot, pivotIdx: hi, i, store },
          );
        }
        store++;
      } else {
        emit(
          'PASS',
          `pass ${i}`,
          `a[${i}] = ${a[i]} > ${pivot}, so it belongs on the right — leave it and keep the boundary at ${store}.`,
          { lo, hi, pivot, pivotIdx: hi, i, store },
        );
      }
    }

    [a[store], a[hi]] = [a[hi], a[store]];
    const p = store;
    emit(
      'PLACE',
      `pivot@${p}`,
      `Swap the pivot into the boundary slot ${p}. Now a[${p}] = ${pivot} is in its final sorted position: everything left is ≤ it, everything right is > it.`,
      { lo, hi, pivot, pivotIdx: p, p, store: null, i: null },
    );

    if (p === target) {
      result = a[p];
      emit(
        'FOUND',
        `${a[p]}`,
        `The pivot landed exactly on the target index ${target}, so a[${p}] = ${a[p]} is the ${k}th largest value. Done.`,
        { lo, hi, p, pivotIdx: p, result, done: true },
        'good',
      );
      return frames;
    }

    if (p < target) {
      lo = p + 1;
      emit(
        'RIGHT',
        `lo=${lo}`,
        `Pivot index ${p} < target ${target}, so the answer sits to the right. Discard the left side and search the window [${lo}, ${hi}].`,
        { lo, hi, p, pivotIdx: p },
      );
    } else {
      hi = p - 1;
      emit(
        'LEFT',
        `hi=${hi}`,
        `Pivot index ${p} > target ${target}, so the answer sits to the left. Discard the right side and search the window [${lo}, ${hi}].`,
        { lo, hi, p, pivotIdx: p },
      );
    }
  }

  result = a[lo];
  emit(
    'DONE',
    `${a[lo]}`,
    `The window collapsed to a single cell at index ${lo} = target ${target}, so a[${lo}] = ${a[lo]} is the ${k}th largest value.`,
    { lo, hi: lo, p: lo, result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<KthState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.lo >= 0) pointers.push({ i: s.lo, label: 'lo', tone: 'warn', place: 'above' });
  if (s.hi >= 0 && s.hi !== s.lo) pointers.push({ i: s.hi, label: 'hi', tone: 'warn', place: 'above' });
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'below' });
  if (s.store !== null) pointers.push({ i: s.store, label: 'store', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (s.result !== null && i === s.target) return 'found';
    if (s.pivotIdx === i) return 'mid';
    if (i === s.target) return 'hi';
    if (i >= s.lo && i <= s.hi) return 'in-window';
    return 'dead';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {' · '}target index = n − k ={' '}
        <span className="font-mono text-ink">{s.target}</span>
        {s.pivot !== null && s.result === null && (
          <>
            {' · '}pivot ={' '}
            <span className="font-mono text-ink">{s.pivot}</span>
          </>
        )}
      </div>
      <ArrayRow
        values={s.a}
        cellTone={tone}
        pointers={pointers}
        windowRange={s.lo <= s.hi ? [s.lo, s.hi] : null}
      />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        window [{s.lo}, {s.hi}] · searching index {s.target}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.k}th largest = {s.result}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<KthState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="target (n−k)" v={s.target} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="pivot" v={s.pivot ?? '—'} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="store" v={s.store ?? '—'} />
      <InspectorRow k="p (pivot idx)" v={s.p ?? '—'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-find-kth-largest';
export const title = 'Find Kth largest';

function computeKth(nums: number[], k: number): number {
  const a = nums.slice();
  const target = a.length - k;
  let lo = 0;
  let hi = a.length - 1;
  while (lo < hi) {
    const pivot = a[hi];
    let store = lo;
    for (let i = lo; i < hi; i++) {
      if (a[i] <= pivot) {
        [a[i], a[store]] = [a[store], a[i]];
        store++;
      }
    }
    [a[store], a[hi]] = [a[hi], a[store]];
    const p = store;
    if (p === target) return a[p];
    if (p < target) lo = p + 1;
    else hi = p - 1;
  }
  return a[lo];
}






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Find Kth largest\"?",
    choices: [
      {
        label: "Quickselect / partition — fits this problem",
        correct: true
      },
      {
        label: "Binary search on answer — different approach"
      },
      {
        label: "Hash map chain reconstruction — different approach"
      },
      {
        label: "Two-pass frequency map — different approach"
      }
    ],
    explain: "Partition around a pivot; recurse only the side holding index n-k"
  },
  {
    id: "init",
    prompt: "At the start of a run (Find Kth largest), what strategy is established?",
    choices: [
      {
        label: "Partition around a pivot; recurse — described in INIT caption",
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
    explain: "Find the th largest value via Quickselect. In fully sorted order the kth largest sits at index n − k =  −  = , so we hunt for whatever value ends up at index  — without sorting the whole array."
  },
  {
    id: "key-step",
    prompt: "On the \"PLACE\" step (pivot@), what happens?",
    choices: [
      {
        label: "Swap the pivot into the boundary — this move caption",
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
    explain: "Swap the pivot into the boundary slot . Now a[] =  is in its final sorted position: everything left is ≤ it, everything right is > it."
  },
  {
    id: "state",
    prompt: "What does the `a` field track in the visualization state?",
    choices: [
      {
        label: "live array (mutated by partition — updated each frame",
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
    explain: "The recorder keeps `a` in sync: live array (mutated by partition swaps)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Find Kth largest\"?",
    choices: [
      {
        label: "O(n) average time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(t log t) time, O(t) space — wrong order of growth"
      },
      {
        label: "O(log n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n) average. O(1). target=n-k; partition; move lo/hi toward p"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "The window collapsed to a single — final DONE caption",
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
    explain: "The window collapsed to a single cell at index  = target , so a[] =  is the th largest value."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'kth1', label: '[3,2,1,5,6,4], k=2', value: { nums: [3, 2, 1, 5, 6, 4], k: 2 } },
    { id: 'kth2', label: '[3,2,3,1,2,4,5,5], k=4 → 3', value: { nums: [3, 2, 3, 1, 2, 4, 5, 5], k: 4 } },
  ] satisfies SampleInput<KthInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as KthState | undefined;
    if (!s || s.result === null) return { ok: false, label: 'no result' };
    const expected = computeKth(s.a.slice(), s.k);
    return { ok: s.result === expected, label: `${s.k}th largest = ${s.result}` };
  },
};

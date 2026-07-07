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

interface DeleteKthInput {
  values: number[];
  k: number;
}

interface DeleteKthState {
  k: number;
  /** Original node values, left→right. The chain never changes length here;
   * deleted slots are tracked separately so the board stays aligned. */
  values: number[];
  /** Indices that have been unlinked from the list. */
  deleted: number[];
  /** Index of the node the cursor (`cur`) sits on, or null. */
  cur: number | null;
  /** running step counter (1..k); resets to 0 right after a delete. */
  step: number | null;
  /** count of total nodes (set after the counting pass). */
  total: number | null;
  done: boolean;
}

function record({ values, k }: DeleteKthInput): Frame<DeleteKthState>[] {
  const deleted = new Set<number>();

  const { emit, frames } = createPrepRecorder<DeleteKthState>(() => ({
    k,
    values,
    deleted: [...deleted],
    cur: null,
    step: null,
    total: null,
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `Delete every Kth node in a doubly linked list. We walk left→right with a step counter; each time step reaches k we unlink that node on BOTH sides (prev.next = next, next.prev = prev) and reset the counter. Time O(n), Space O(1).`,
    {},
  );

  // Counting pass — mirrors the Go solution's first loop.
  const total = values.length;
  emit(
    'COUNT',
    `n=${total}`,
    `First pass counts the nodes: n = ${total}. The Go solution does this so it can bail out early if k > n (then nothing is deleted).`,
    { total },
  );

  if (k <= 0 || k > total) {
    emit(
      'SKIP',
      'no-op',
      `k = ${k} is not a valid deletion stride for a list of ${total} nodes (need 1 ≤ k ≤ ${total}), so the list is returned unchanged.`,
      { total, done: true },
      'bad',
    );
    return frames;
  }

  // Walk pass — step++ each node; on step==k unlink and reset.
  let step = 0;
  for (let i = 0; i < total; i++) {
    step++;
    if (step === k) {
      emit(
        'HIT',
        `step==${k}`,
        `Node ${i} (value ${values[i]!}) is the ${k}th since the last reset, so it is the one to delete. step reached k = ${k}.`,
        { cur: i, step, total },
      );
      deleted.add(i);
      step = 0;
      emit(
        'DELETE',
        `unlink ${values[i]!}`,
        `Unlink node ${i}: set prev.next = next and next.prev = prev so it is bypassed on both sides of the DLL. Reset step to 0 and continue from the next node.`,
        { cur: i, step, total },
        'good',
      );
    } else {
      emit(
        'WALK',
        `step ${step}`,
        `Node ${i} (value ${values[i]!}) is kept — it is only #${step} since the last reset (need ${k}). Advance the cursor.`,
        { cur: i, step, total },
      );
    }
  }

  const survivors = values.filter((_, i) => !deleted.has(i));
  emit(
    'DONE',
    survivors.length ? survivors.join(' ⇄ ') : 'empty',
    `Walk complete. After deleting every ${k}th node the surviving list is [${survivors.join(', ')}].`,
    { total, done: true, cur: null, step: null },
    'good',
  );
  return frames;
}

function survivorsOf(values: number[], deleted: number[]): number[] {
  const set = new Set(deleted);
  return values.filter((_, i) => !set.has(i));
}

function View({ frame }: PluginViewProps<DeleteKthState>) {
  const s = frame.state;
  const deleted = new Set(s.deleted);
  const pointers: ArrayPointer[] = [];
  if (s.cur !== null) {
    pointers.push({ i: s.cur, label: 'cur', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (deleted.has(i)) return 'dead';
    if (s.cur === i) return 'match';
    return '';
  };
  const survivors = survivorsOf(s.values, s.deleted);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {s.step !== null && (
          <>
            {' · '}step = <span className="font-mono text-ink">{s.step}</span>
            {' / '}
            {s.k}
          </>
        )}
      </div>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink2')}>
        list: {survivors.length ? survivors.join(' ⇄ ') : '∅'}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → [{survivors.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DeleteKthState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const survivors = survivorsOf(s.values, s.deleted);
  return (
    <VarGrid>
      <InspectorRow k="k (stride)" v={s.k} />
      <InspectorRow k="n (nodes)" v={s.total ?? '—'} />
      <InspectorRow k="cur index" v={s.cur ?? '—'} />
      <InspectorRow k="cur value" v={s.cur !== null ? s.values[s.cur]! : '—'} />
      <InspectorRow k="step" v={s.step !== null ? `${s.step} / ${s.k}` : '—'} />
      <InspectorRow k="deleted" v={s.deleted.length} />
      <InspectorRow k="survivors" v={`[${survivors.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-delete-every-kth-node-in-dll';
export const title = 'Delete every Kth node in DLL';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Delete every Kth node in DLL"?',
    choices: [
      {
        label: 'DLL walk delete — fits this problem',
        correct: true,
      },
      {
        label: 'Circular Scan (3 cases) — different approach',
      },
      {
        label: 'Digit carry — different approach',
      },
      {
        label: 'Iterative reverse — different approach',
      },
    ],
    explain: 'Walk counting; every kth node gets unlinked on both sides',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Delete every Kth node in DLL), what strategy is established?',
    choices: [
      {
        label: 'Walk counting; every kth node gets — described in INIT caption',
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
      'Delete every Kth node in a doubly linked list. We walk left→right with a step counter; each time step reaches k we unlink that node on BOTH sides (prev.next = next, next.prev = prev) and reset the counter. Time O(n), Space O(1).',
  },
  {
    id: 'key-step',
    prompt: 'On the "DELETE" step (unlink ), what happens?',
    choices: [
      {
        label: 'Unlink node : set prev.next = — this move caption',
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
      'Unlink node : set prev.next = next and next.prev = prev so it is bypassed on both sides of the DLL. Reset step to 0 and continue from the next node.',
  },
  {
    id: 'state',
    prompt: 'What does the `k` field track in the visualization state?',
    choices: [
      {
        label: 'Field k in state — updated each frame',
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
    explain: 'The recorder snapshots `k` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Delete every Kth node in DLL"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). step==k -> prev.Next=next, next.Prev=prev, reset step',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Node (value ) is kept — — final DONE caption',
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
      'Node  (value ) is kept — it is only # since the last reset (need ). Advance the cursor.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'dk1', label: '[1,2,3,4,5,6] k=2', value: { values: [1, 2, 3, 4, 5, 6], k: 2 } },
    {
      id: 'dk2',
      label: '[10,20,30,40,50,60,70] k=3',
      value: { values: [10, 20, 30, 40, 50, 60, 70], k: 3 },
    },
  ] satisfies SampleInput<DeleteKthInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DeleteKthState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const survivors = survivorsOf(s.values, s.deleted);
    return { ok: true, label: `[${survivors.join(', ')}]` };
  },
};

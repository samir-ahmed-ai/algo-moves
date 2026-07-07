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

// Input: list A's exclusive prefix, list B's exclusive prefix, and the shared
// tail both lists end with. If `shared` is empty the lists do not intersect.
interface IntersectInput {
  prefixA: number[];
  prefixB: number[];
  shared: number[];
}

// We flatten both lists into one display row:
//   [ ...prefixA, ...shared ]  then  [ ...prefixB, ...shared(repeated for B view) ]
// To keep a single readable chain we show A's nodes followed by B's *exclusive*
// prefix, with the shared tail drawn once and reused by both. Each "node" in the
// row carries which physical node id it is so pa/pb can land on the junction.
interface NodeCell {
  val: number;
  id: number; // physical node identity (shared tail nodes have one id each)
}

interface IntersectState {
  cells: NodeCell[]; // the rendered chain, left → right
  lenA: number; // number of cells that belong to list A (prefixA + shared)
  junctionStart: number; // index in `cells` where the shared tail begins (-1 if none)
  pa: number | null; // index into `cells` for pointer a (null = walked off the end → nil)
  pb: number | null; // index into `cells` for pointer b
  steps: number; // hops taken so far
  resultId: number | null; // physical node id where they met (null = none yet / no intersection)
  done: boolean;
}

// Build the flattened display chain plus a `next` map keyed by cell index that
// faithfully mirrors the Go pointer structure (prefix → shared tail → nil).
function buildChain(input: IntersectInput): {
  cells: NodeCell[];
  headA: number | null;
  headB: number | null;
  nextOf: (idx: number) => number | null;
  junctionStart: number;
  lenA: number;
} {
  const { prefixA, prefixB, shared } = input;
  const cells: NodeCell[] = [];
  let nextId = 0;

  // List A's exclusive prefix.
  const aPrefixIdx: number[] = [];
  for (const v of prefixA) {
    aPrefixIdx.push(cells.length);
    cells.push({ val: v, id: nextId++ });
  }
  // Shared tail — one physical node each, drawn once.
  const sharedIdx: number[] = [];
  for (const v of shared) {
    sharedIdx.push(cells.length);
    cells.push({ val: v, id: nextId++ });
  }
  const lenA = cells.length; // prefixA + shared all belong to A's walk
  // List B's exclusive prefix (drawn after A's chain on the same row).
  const bPrefixIdx: number[] = [];
  for (const v of prefixB) {
    bPrefixIdx.push(cells.length);
    cells.push({ val: v, id: nextId++ });
  }

  // Linear order each list traverses, as indices into `cells`.
  const orderA = [...aPrefixIdx, ...sharedIdx];
  const orderB = [...bPrefixIdx, ...sharedIdx];
  const nextInOrder = new Map<number, number | null>();
  const link = (order: number[]) => {
    for (let i = 0; i < order.length; i++) {
      nextInOrder.set(order[i], i + 1 < order.length ? order[i + 1] : null);
    }
  };
  link(orderA);
  link(orderB);

  const headA = orderA.length ? orderA[0] : null;
  const headB = orderB.length ? orderB[0] : null;
  const nextOf = (idx: number) => nextInOrder.get(idx) ?? null;
  const junctionStart = sharedIdx.length ? sharedIdx[0] : -1;
  return { cells, headA, headB, nextOf, junctionStart, lenA };
}

function record(input: IntersectInput): Frame<IntersectState>[] {
  const { cells, headA, headB, nextOf, junctionStart, lenA } = buildChain(input);
  const { emit, frames } = createRecorder<IntersectState>(() => ({
    cells,
    lenA,
    junctionStart,
    pa: null,
    pb: null,
    steps: 0,
    resultId: null,
    done: false,
  }));

  const idAt = (idx: number | null): number | null => (idx === null ? null : cells[idx].id);
  const label = (idx: number | null) => (idx === null ? 'nil' : `node ${cells[idx].val}`);

  // Mirror the Go guard: if either list is empty there is no intersection.
  if (headA === null || headB === null) {
    emit(
      'INIT',
      'empty list',
      'One of the lists is empty, so there is no node where they can intersect. Return nil.',
      { done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'INIT',
    'pa=a, pb=b',
    `Two pointers reset: pa starts at list A's head, pb at list B's head. Each pointer walks its own list, then hops to the OTHER list's head. After at most one hop each they have travelled lenA + lenB nodes, so they line up and meet at the junction (or both hit nil together).`,
    { pa: headA, pb: headB },
  );

  let pa: number | null = headA;
  let pb: number | null = headB;
  let steps = 0;
  const MAX = (cells.length + 2) * 4; // safety bound; real loop is ≤ lenA+lenB+1

  while (idAt(pa) !== idAt(pb)) {
    if (steps > MAX) break; // defensive; never reached for valid inputs

    // Advance pa: Next, or jump to B's head when it falls off the end.
    if (pa === null) {
      pa = headB;
      emit(
        'JUMP_A',
        'pa → B head',
        `pa reached the end of list A (nil), so it jumps to list B's head (${label(pa)}). This is the reset that equalises the two path lengths.`,
        { pa, pb, steps },
      );
    } else {
      pa = nextOf(pa);
      emit('STEP_A', 'pa = pa.Next', `pa advances one node to ${label(pa)}.`, { pa, pb, steps });
    }

    // Advance pb: Next, or jump to A's head when it falls off the end.
    if (pb === null) {
      pb = headA;
      emit(
        'JUMP_B',
        'pb → A head',
        `pb reached the end of list B (nil), so it jumps to list A's head (${label(pb)}). Now both pointers have the SAME remaining distance to the junction.`,
        { pa, pb, steps },
      );
    } else {
      pb = nextOf(pb);
      emit('STEP_B', 'pb = pb.Next', `pb advances one node to ${label(pb)}.`, { pa, pb, steps });
    }

    steps++;
    emit(
      'COMPARE',
      idAt(pa) === idAt(pb) ? 'pa == pb' : 'pa != pb',
      idAt(pa) === idAt(pb)
        ? `pa and pb now point at the SAME physical node — the loop ends here.`
        : `pa is at ${label(pa)}, pb is at ${label(pb)}. They are different nodes, so keep walking.`,
      { pa, pb, steps },
      idAt(pa) === idAt(pb) ? 'good' : undefined,
    );
  }

  const resultId = idAt(pa);
  if (resultId !== null) {
    emit(
      'FOUND',
      `node ${cells[pa as number].val}`,
      `pa == pb at the shared node ${cells[pa as number].val} — that is the intersection where both lists merge. Return it.`,
      { pa, pb, steps, resultId, done: true },
      'good',
    );
  } else {
    emit(
      'DONE',
      'no intersection',
      `Both pointers reached nil at the same time, meaning the lists never share a node. Return nil.`,
      { pa, pb, steps, resultId: null, done: true },
      'bad',
    );
  }

  return frames;
}

function View({ frame }: PluginViewProps<IntersectState>) {
  const s = frame.state;
  if (!s.cells.length) {
    return (
      <div className="board-area">
        <div className={cn(vizText.sm, 'text-ink3')}>empty lists — no intersection</div>
      </div>
    );
  }

  const values = s.cells.map((c) => c.val);
  const pointers: ArrayPointer[] = [];
  if (s.pa !== null) pointers.push({ i: s.pa, label: 'pa', tone: 'accent', place: 'above' });
  if (s.pb !== null) pointers.push({ i: s.pb, label: 'pb', tone: 'warn', place: 'below' });

  const tone = (i: number) => {
    if (s.resultId !== null && s.cells[i].id === s.resultId) return 'found';
    if (s.junctionStart >= 0 && i >= s.junctionStart && i < s.lenA) return 'in-window';
    return '';
  };

  // A label that makes the two-list split + shared tail legible.
  const cellLabel = (i: number) => {
    if (s.junctionStart >= 0 && i >= s.junctionStart && i < s.lenA) return '★';
    return i < s.lenA ? 'A' : 'B';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        A nodes + shared tail (★) on the left · B's exclusive prefix on the right · meeting node
        turns green
      </div>
      <ArrayRow
        values={values}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={cellLabel}
      />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.junctionStart >= 0
          ? '→ both lists merge at the ★ tail'
          : '→ no shared tail (lists are disjoint)'}
      </div>
      {s.done && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.resultId !== null ? 'text-good' : 'text-ink3',
          )}
        >
          {s.resultId !== null
            ? `→ intersection at node ${s.cells.find((c) => c.id === s.resultId)?.val}`
            : '→ nil (no intersection)'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<IntersectState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (idx: number | null) => (idx === null ? 'nil' : String(s.cells[idx].val));
  return (
    <VarGrid>
      <InspectorRow k="pa" v={at(s.pa)} />
      <InspectorRow k="pb" v={at(s.pb)} />
      <InspectorRow
        k="pa == pb"
        v={s.pa !== null && s.pb !== null && s.cells[s.pa].id === s.cells[s.pb].id ? 'yes' : 'no'}
      />
      <InspectorRow k="hops" v={s.steps} />
      <InspectorRow
        k="result"
        v={
          s.resultId !== null
            ? `node ${s.cells.find((c) => c.id === s.resultId)?.val}`
            : s.done
              ? 'nil'
              : '…'
        }
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-find-intersection-of-two-lists';
export const title = 'Find intersection of two lists';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find intersection of two lists"?',
    choices: [
      {
        label: 'Two pointers reset — fits this problem',
        correct: true,
      },
      {
        label: 'Josephus simulation — different approach',
      },
      {
        label: 'Interweave (3-pass, no map) — different approach',
      },
      {
        label: 'Iterative Group Reversal — different approach',
      },
    ],
    explain: "Each pointer hops to the other list's head; they meet at the junction",
  },
  {
    id: 'key-step',
    prompt: 'On the "FOUND" step (node ), what happens?',
    choices: [
      {
        label: 'pa == pb at the shared — this move caption',
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
      'pa == pb at the shared node  — that is the intersection where both lists merge. Return it.',
  },
  {
    id: 'state',
    prompt: 'What does the `cells` field track in the visualization state?',
    choices: [
      {
        label: 'the rendered chain, left → — updated each frame',
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
    explain: 'The recorder keeps `cells` in sync: the rendered chain, left → right',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find intersection of two lists"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). pa: a then b, pb: b then a, until pa==pb',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'pa == pb at the shared — final DONE caption',
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
      'pa == pb at the shared node  — that is the intersection where both lists merge. Return it.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'fi1',
      label: 'A=[3,7] B=[9] tail=[8,4,5]',
      value: { prefixA: [3, 7], prefixB: [9], shared: [8, 4, 5] },
    },
    {
      id: 'fi2',
      label: 'A=[2,6] B=[1] tail=[] (disjoint)',
      value: { prefixA: [2, 6], prefixB: [1], shared: [] },
    },
  ] satisfies SampleInput<IntersectInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IntersectState | undefined;
    if (!s) return { ok: false, label: 'no run' };
    if (s.resultId !== null) {
      const node = s.cells.find((c) => c.id === s.resultId);
      return { ok: true, label: `intersection @ ${node?.val}` };
    }
    return { ok: true, label: 'nil (disjoint)' };
  },
};

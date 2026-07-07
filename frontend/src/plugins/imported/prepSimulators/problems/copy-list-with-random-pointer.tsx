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

// The input describes a list by its node values plus, for each node, the index
// of the node its Random pointer targets (or null). e.g. random[0]! = 2 means
// node 0's random points at node 2; null means it points at nothing.
interface CopyListInput {
  vals: number[];
  random: (number | null)[];
}

// We model the interweaved chain as a flat array of "slots". Each slot is either
// an original node or its freshly inserted clone. orig[k]! = true when slot k is
// an original. The Random pointers are stored as slot-index targets so the View
// can draw an arrow line.
interface Slot {
  val: number;
  orig: boolean; // true = original node, false = clone
  random: number | null; // target slot index for this node's Random pointer
}

interface CopyListState {
  slots: Slot[];
  pass: 1 | 2 | 3;
  cur: number | null; // current slot under inspection
  ranSrc: number | null; // slot whose random we are wiring (pass 2)
  ranDst: number | null; // slot the random points to (pass 2)
  cloneVals: number[]; // values of the separated clone list (pass 3 output)
  done: boolean;
}

function record({ vals, random }: CopyListInput): Frame<CopyListState>[] {
  const n = vals.length;

  // Build the interweaved slot model up front so the View always has a stable
  // array; passes mutate `slots[].random` and we snapshot per frame.
  const slots: Slot[] = [];
  for (let i = 0; i < n; i++) {
    slots.push({ val: vals[i]!, orig: true, random: null }); // original
    slots.push({ val: vals[i]!, orig: false, random: null }); // clone (inserted)
  }
  // Original slot for original index i sits at 2*i; its clone at 2*i + 1.
  const cloneVals: number[] = [];

  const { emit, frames } = createPrepRecorder<CopyListState>(() => ({
    slots: slots.map((sl) => ({ ...sl })),
    pass: 1,
    cur: null,
    ranSrc: null,
    ranDst: null,
    cloneVals: cloneVals.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Copy List with Random Pointer using the Interweave trick (O(1) extra space, no hash map). Each clone is woven in right after its original so we can find it in place. The chain below already shows clones (lighter cells) sitting after each original.`,
    { pass: 1 },
  );

  // Pass 1: interweave clones after originals. (Already materialised in `slots`,
  // so here we just narrate node by node.)
  for (let i = 0; i < n; i++) {
    const origSlot = 2 * i;
    const cloneSlot = 2 * i + 1;
    emit(
      'WEAVE',
      `clone(${vals[i]!})`,
      `Pass 1 — insert a clone of node ${vals[i]!} immediately after it: cur.Next = clone, clone.Next = old next. Now slot ${cloneSlot} holds the copy of slot ${origSlot}.`,
      { pass: 1, cur: cloneSlot },
    );
  }

  // Pass 2: assign random pointers. For each original at 2*i, if it has a random
  // to original index r, the clone's random is the node right after that target:
  // cur.Next.Random = cur.Random.Next  ->  slot (2*r + 1).
  emit(
    'PASS2',
    'wire randoms',
    `Pass 2 — wire each clone's Random. Because every clone sits right after its original, the copy of original r is exactly one step past it. So clone.Random = original.Random.Next.`,
    { pass: 2, cur: 0 },
  );
  for (let i = 0; i < n; i++) {
    const origSlot = 2 * i;
    const cloneSlot = 2 * i + 1;
    const r = random[i]!;
    if (r === null || r === undefined) {
      emit(
        'RANDOM',
        `node ${vals[i]!} rand=∅`,
        `Original ${vals[i]!} has no Random pointer, so its clone keeps Random = null. Move two slots forward (skip the clone).`,
        { pass: 2, cur: origSlot },
      );
      continue;
    }
    const targetCloneSlot = 2 * r + 1;
    slots[cloneSlot]!.random = targetCloneSlot;
    emit(
      'RANDOM',
      `clone→${vals[r]!}`,
      `Original ${vals[i]!}.Random points at original ${vals[r]!} (slot ${2 * r}). Its clone must point at the COPY of ${vals[r]!}, which is the next slot (${targetCloneSlot}). Set clone.Random = original.Random.Next.`,
      { pass: 2, cur: origSlot, ranSrc: cloneSlot, ranDst: targetCloneSlot },
    );
  }

  // Pass 3: separate the two interleaved lists.
  emit(
    'PASS3',
    'unzip lists',
    `Pass 3 — unzip. Walk the woven chain, detaching every other node so the originals reform their list and the clones form the deep copy. We collect the clone values left to right.`,
    { pass: 3, cur: 0 },
  );
  for (let i = 0; i < n; i++) {
    const cloneSlot = 2 * i + 1;
    cloneVals.push(slots[cloneSlot]!.val);
    emit(
      'SPLIT',
      `take ${vals[i]!}'`,
      `Detach the clone of ${vals[i]!} (slot ${cloneSlot}) into the copy list, and relink original ${vals[i]!}.Next to the following original. Copy list so far: [${cloneVals.join(', ')}].`,
      { pass: 3, cur: cloneSlot, cloneVals: cloneVals.slice() },
    );
  }

  emit(
    'DONE',
    `copied ${n}`,
    `Done — the deep copy [${cloneVals.join(', ')}] is fully detached with its own Next and Random pointers, all in O(n) time and O(1) extra space.`,
    { pass: 3, cloneVals: cloneVals.slice(), done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<CopyListState>) {
  const s = frame.state;
  const values = s.slots.map((sl) => (sl.orig ? `${sl.val}` : `${sl.val}'`));
  const pointers: ArrayPointer[] = [];
  if (s.cur !== null) pointers.push({ i: s.cur, label: 'cur', tone: 'accent', place: 'above' });
  if (s.ranSrc !== null) pointers.push({ i: s.ranSrc, label: 'rnd', tone: 'warn', place: 'below' });
  if (s.ranDst !== null) pointers.push({ i: s.ranDst, label: '→', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    const sl = s.slots[i]!;
    if (s.done) return sl!.orig ? 'dead' : 'found';
    if (i === s.cur) return 'match';
    if (i === s.ranDst) return 'found';
    if (i === s.ranSrc) return 'in-window';
    return sl!.orig ? '' : 'lo';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        Pass <span className="font-mono text-ink">{s.pass}</span> · originals = plain, clones ={' '}
        <span className="font-mono text-ink">v'</span> (lighter)
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.ranSrc !== null && s.ranDst !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          clone[{s.ranSrc}]!.Random → slot {s.ranDst} ({values[s.ranDst]!})
        </div>
      )}
      <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink3', vizText.base)}>
        copy → [{s.cloneVals.join(', ')}]{!s.done && s.pass < 3 ? ' …building' : ''}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CopyListState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curSl = s.cur !== null ? s.slots[s.cur]! : null;
  return (
    <VarGrid>
      <InspectorRow k="pass" v={s.pass} />
      <InspectorRow k="cur slot" v={s.cur ?? '—'} />
      <InspectorRow k="cur node" v={curSl ? `${curSl.val}${curSl.orig ? '' : "'"}` : '—'} />
      <InspectorRow k="random src" v={s.ranSrc ?? '—'} />
      <InspectorRow k="random dst" v={s.ranDst ?? '—'} />
      <InspectorRow k="copy length" v={s.cloneVals.length} />
      <InspectorRow k="copy" v={s.cloneVals.length ? `[${s.cloneVals.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-copy-list-with-random-pointer';
export const title = 'Copy List with Random Pointer';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Copy List with Random Pointer"?',
    choices: [
      {
        label: 'Interweave (3-pass, no map) — fits this problem',
        correct: true,
      },
      {
        label: 'DLL walk delete — different approach',
      },
      {
        label: 'Merge sort list — different approach',
      },
      {
        label: 'DFS flatten — different approach',
      },
    ],
    explain:
      '**Interweave** technique (O(1) space, no hashmap): insert cloned node right after each original',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Copy List with Random Pointer), what strategy is established?',
    choices: [
      {
        label: '**Interweave** technique (O(1) space — described in INIT caption',
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
      'Copy List with Random Pointer using the Interweave trick (O(1) extra space, no hash map). Each clone is woven in right after its original so we can find it in place. The chain below already shows clones (lighter cells) sitting after each original.',
  },
  {
    id: 'key-step',
    prompt: 'On the "RANDOM" step (clone→), what happens?',
    choices: [
      {
        label: 'Original .Random points at original (slot — this move caption',
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
      'Original .Random points at original  (slot ). Its clone must point at the COPY of , which is the next slot (). Set clone.Random = original.Random.Next.',
  },
  {
    id: 'state',
    prompt: 'What does the `cur` field track in the visualization state?',
    choices: [
      {
        label: 'current slot under inspection — updated each frame',
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
    explain: 'The recorder keeps `cur` in sync: current slot under inspection',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Copy List with Random Pointer"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(max(n,m)) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      "O(n). O(1). **Interweave** technique (O(1) space, no hashmap): insert cloned node right after each original; Pass 2: set `curr.Next.Random = curr.Random.Next` (clone's rand",
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Done — the deep copy [] — final DONE caption',
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
      'Done — the deep copy [] is fully detached with its own Next and Random pointers, all in O(n) time and O(1) extra space.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'cl1',
      label: '[7,13,11,10] rnd→[∅,0,3,2]',
      value: { vals: [7, 13, 11, 10], random: [null, 0, 3, 2] },
    },
    {
      id: 'cl2',
      label: '[1,2] rnd→[1,1]',
      value: { vals: [1, 2], random: [1, 1] },
    },
  ] satisfies SampleInput<CopyListInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CopyListState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    return { ok: s.done, label: `copy [${s.cloneVals.join(',')}]` };
  },
};

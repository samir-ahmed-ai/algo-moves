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

interface InsertInput {
  // The circular list as a flat array of values in list order, starting at head.
  // The last element links back to the first (the wrap-around point).
  list: number[];
  insertVal: number;
}

interface InsertState {
  chain: number[]; // the (possibly grown) list values in order
  insertVal: number;
  prev: number | null; // index of `prev` node in chain
  cur: number | null; // index of `cur` node in chain
  reason: string; // which case fired ('' until decided)
  inserted: number | null; // index where the new value landed in chain (after insert)
  done: boolean;
}

function record({ list, insertVal }: InsertInput): Frame<InsertState>[] {
  const { emit, frames } = createRecorder<InsertState>(() => ({
    chain: list,
    insertVal,
    prev: null,
    cur: null,
    reason: '',
    inserted: null,
    done: false,
  }));

  // Empty-list case: the new node points to itself.
  if (list.length === 0) {
    emit(
      'EMPTY',
      'self-loop',
      `The list is empty, so the new node ${insertVal} becomes the whole list and links to itself, forming a one-node circle.`,
      { chain: [insertVal], inserted: 0, done: true },
      'good',
    );
    return frames;
  }

  const n = list.length;
  emit(
    'INIT',
    `insert ${insertVal}`,
    `Insert ${insertVal} into the sorted circular list. Walk pairs (prev, cur) starting at head until we find the gap where ${insertVal} fits. prev = head (index 0), cur = the next node.`,
    { prev: 0, cur: 1 % n },
  );

  let prev = 0;
  let cur = 1 % n;
  const head = 0;

  // Helper: insert between prev and cur, splicing the new value into the array.
  const spliceAt = (prevIdx: number): { chain: number[]; insertedAt: number } => {
    const chain = list.slice();
    const at = prevIdx + 1; // new node sits right after prev in list order
    chain.splice(at, 0, insertVal);
    return { chain, insertedAt: at };
  };

  // Mirror the Go `for {}` loop exactly.
  while (true) {
    const pv = list[prev];
    const cv = list[cur];

    // Case 1: normal sorted range — prev <= insertVal <= cur.
    if (pv <= insertVal && insertVal <= cv) {
      emit(
        'CASE1',
        `${pv} ≤ ${insertVal} ≤ ${cv}`,
        `Case 1 (normal range): prev=${pv} ≤ ${insertVal} ≤ cur=${cv}, so ${insertVal} fits in this ascending gap. Stop and splice it between them.`,
        { prev, cur, reason: 'normal range' },
        'good',
      );
      const { chain, insertedAt } = spliceAt(prev);
      emit(
        'INSERT',
        `between ${pv} and ${cv}`,
        `Splice the new node between ${pv} and ${cur === head ? '(head) ' : ''}${cv}: prev.Next = node, node.Next = cur. The list stays sorted.`,
        { chain, inserted: insertedAt, prev, cur, reason: 'normal range', done: true },
        'good',
      );
      return frames;
    }

    // Case 2: wrap-around point — prev > cur is the max→min boundary.
    if (pv > cv) {
      emit(
        'WRAP',
        `${pv} > ${cv}`,
        `prev=${pv} > cur=${cv}: this is the wrap-around point (largest value links back to smallest). A new max or new min belongs right here.`,
        { prev, cur, reason: 'wrap-around' },
      );
      if (insertVal >= pv || insertVal <= cv) {
        emit(
          'CASE2',
          `${insertVal} is new ${insertVal >= pv ? 'max' : 'min'}`,
          `Case 2: ${insertVal} ${insertVal >= pv ? `≥ ${pv} (new maximum)` : `≤ ${cv} (new minimum)`}, so it belongs at the wrap boundary. Stop and splice it here.`,
          { prev, cur, reason: 'wrap-around' },
          'good',
        );
        const { chain, insertedAt } = spliceAt(prev);
        emit(
          'INSERT',
          `at wrap point`,
          `Splice the new node at the boundary between ${pv} and ${cv}: prev.Next = node, node.Next = cur.`,
          { chain, inserted: insertedAt, prev, cur, reason: 'wrap-around', done: true },
          'good',
        );
        return frames;
      }
    }

    // Advance: prev, cur = cur, cur.Next.
    const nextCur = (cur + 1) % n;
    emit(
      'ADVANCE',
      `prev→${list[cur]}, cur→${list[nextCur]}`,
      `${insertVal} does not fit between ${pv} and ${cv}. Step forward: prev = ${list[cur]}, cur = ${list[nextCur]}.`,
      { prev: cur, cur: nextCur, reason: '' },
    );
    prev = cur;
    cur = nextCur;

    // Case 3: full loop with no gap found (all values equal) — insert anywhere.
    if (prev === head) {
      emit(
        'CASE3',
        'full loop',
        `prev came back to the head — we circled the whole list without finding a gap (every value is equal). Insert ${insertVal} anywhere; here, right after the head.`,
        { prev, cur, reason: 'full loop' },
      );
      const { chain, insertedAt } = spliceAt(prev);
      emit(
        'INSERT',
        `anywhere`,
        `Splice the new node between ${list[prev]} and ${list[cur]}: prev.Next = node, node.Next = cur. With all values equal the order is unchanged.`,
        { chain, inserted: insertedAt, prev, cur, reason: 'full loop', done: true },
        'good',
      );
      return frames;
    }
  }
}

function View({ frame }: PluginViewProps<InsertState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.prev !== null && !s.done)
    pointers.push({ i: s.prev, label: 'prev', tone: 'warn', place: 'above' });
  if (s.cur !== null && !s.done)
    pointers.push({ i: s.cur, label: 'cur', tone: 'accent', place: 'above' });
  if (s.inserted !== null)
    pointers.push({ i: s.inserted, label: 'new', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (s.inserted === i) return 'found';
    if (!s.done && (s.prev === i || s.cur === i)) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        insertVal = <span className="font-mono text-ink">{s.insertVal}</span>
        {s.reason && (
          <>
            {' · '}case = <span className="font-mono text-ink">{s.reason}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.chain} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.chain.join(' → ')}
        {s.chain.length > 0 ? ' →↺' : '∅'}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ [{s.chain.join(', ')}]</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<InsertState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="insertVal" v={s.insertVal} />
      <InspectorRow
        k="prev"
        v={s.prev !== null && !s.done ? `${s.chain[s.prev]} (i=${s.prev})` : '—'}
      />
      <InspectorRow
        k="cur"
        v={s.cur !== null && !s.done ? `${s.chain[s.cur]} (i=${s.cur})` : '—'}
      />
      <InspectorRow k="case" v={s.reason || '…'} />
      <InspectorRow k="len" v={s.chain.length} />
      <InspectorRow k="result" v={s.done ? `[${s.chain.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-insert-into-a-sorted-circular-linked-list';
export const title = 'Insert into a Sorted Circular Linked List';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Insert into a Sorted Circular Linked List"?',
    choices: [
      {
        label: 'Circular Scan (3 cases) — fits this problem',
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
    explain: 'Three cases for insertion between `prev` and `curr`:',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Insert into a Sorted Circular Linked List), what strategy is established?',
    choices: [
      {
        label: 'Three cases for insertion between `prev` — described in INIT caption',
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
      'Insert  into the sorted circular list. Walk pairs (prev, cur) starting at head until we find the gap where  fits. prev = head (index 0), cur = the next node.',
  },
  {
    id: 'key-step',
    prompt: 'On the "CASE2" step ( is new ), what happens?',
    choices: [
      {
        label: 'Case 2: ${insertVal >= pv ? — this move caption',
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
    explain: 'Case 2:  ${insertVal >= pv ? ',
  },
  {
    id: 'state',
    prompt: 'What does the `chain` field track in the visualization state?',
    choices: [
      {
        label: 'the (possibly grown) list values — updated each frame',
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
    explain: 'The recorder keeps `chain` in sync: the (possibly grown) list values in order',
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "Insert into a Sorted Circular Linked List"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). Three cases for insertion between `prev` and `curr`:',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Splice the new node between — final DONE caption',
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
      'Splice the new node between  and : prev.Next = node, node.Next = cur. With all values equal the order is unchanged.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ic1', label: '[3,4,1] insert 2', value: { list: [3, 4, 1], insertVal: 2 } },
    { id: 'ic2', label: '[1,3,5] insert 0', value: { list: [1, 3, 5], insertVal: 0 } },
  ] satisfies SampleInput<InsertInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as InsertState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: true, label: `[${s.chain.join(', ')}]` };
  },
};

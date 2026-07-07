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

interface PrintFromEndInput {
  values: number[];
}

type Phase = 'init' | 'descend' | 'base' | 'unwind' | 'done';

interface PrintFromEndState {
  values: number[]; // the linked list node values, head → tail
  cur: number | null; // index of the node printFromEnd is currently called on
  stack: number[]; // indices of nodes whose recursive call is still open (deepest last)
  out: number[]; // output array as it is being built up on the unwind
  phase: Phase;
  done: boolean;
}

function record({ values }: PrintFromEndInput): Frame<PrintFromEndState>[] {
  const stack: number[] = [];
  const out: number[] = [];

  const { emit, frames } = createPrepRecorder<PrintFromEndState>(() => ({
    values,
    cur: null,
    stack: stack.slice(),
    out: out.slice(),
    phase: 'descend',
    done: false,
  }));

  emit(
    'INIT',
    `n=${values.length}`,
    `Print from end: recurse all the way to the tail first, then append each value as the call stack unwinds. out = rec(next); out = append(out, head.Val). The result lists the values back-to-front.`,
    { phase: 'init' },
  );

  // Faithful recursion: printFromEnd(head) = append(printFromEnd(head.Next), head.Val).
  // We model nodes as indices into `values`; head.Next of the last node is nil.
  function printFromEnd(i: number): void {
    if (i >= values.length) {
      // head == nil → return nil (empty output)
      emit(
        'BASE',
        'nil → []',
        `We have walked past the tail (head == nil), so this deepest call returns an empty list. Now every open call unwinds, appending its own value.`,
        { cur: null, phase: 'base' },
      );
      return;
    }

    stack.push(i);
    emit(
      'DESCEND',
      `rec(node ${i})`,
      `Call printFromEnd on node ${i} (value ${values[i]!}). Before doing anything, it recurses into the next node — so node ${i} waits on the stack until the deeper call returns.`,
      { cur: i, phase: 'descend' },
    );

    printFromEnd(i + 1);

    // Unwind: out = append(out, head.Val)
    out.push(values[i]!);
    stack.pop();
    emit(
      'UNWIND',
      `append ${values[i]!}`,
      `The deeper call returned, so node ${i}'s call resumes and appends its value ${values[i]!} to the output. Because the tail finished first, values come out in reverse order.`,
      { cur: i, phase: 'unwind' },
    );
  }

  if (values.length === 0) {
    emit(
      'BASE',
      'nil → []',
      `The list is empty (head == nil), so there is nothing to print — the result is the empty list.`,
      { cur: null, phase: 'base' },
    );
  } else {
    printFromEnd(0);
  }

  emit(
    'DONE',
    `[${out.join(', ')}]`,
    `All calls have unwound. The output is the node values reversed: [${out.join(', ')}].`,
    { cur: null, phase: 'done', done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PrintFromEndState>) {
  const s = frame.state;
  const onStack = new Set(s.stack);
  const pointers: ArrayPointer[] = [];
  if (s.cur !== null) {
    pointers.push({
      i: s.cur,
      label: s.phase === 'unwind' ? 'append' : 'cur',
      tone: s.phase === 'unwind' ? 'good' : 'accent',
      place: 'above',
    });
  }
  const tone = (i: number) => {
    if (s.cur === i && s.phase === 'unwind') return 'found';
    if (s.cur === i) return 'match';
    if (onStack.has(i)) return 'in-window';
    return '';
  };
  // Render the values as a node chain with → arrows between them.
  const chain = s.values.length ? s.values.join(' → ') + ' → nil' : 'nil';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        list: <span className="font-mono text-ink">{chain}</span>
      </div>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        call stack:{' '}
        <span className="font-mono text-ink">
          {s.stack.length ? s.stack.map((i) => `${i}`).join(' → ') : '∅'}
        </span>
      </div>
      <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink', vizText.base)}>
        out = [{s.out.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PrintFromEndState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (nodes)" v={s.values.length} />
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="cur node" v={s.cur ?? '—'} />
      <InspectorRow k="cur val" v={s.cur !== null ? s.values[s.cur]! : '—'} />
      <InspectorRow k="stack depth" v={s.stack.length} />
      <InspectorRow k="out" v={`[${s.out.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-print-from-end';
export const title = 'Print from end';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Print from end"?',
    choices: [
      {
        label: 'Recursion / stack — fits this problem',
        correct: true,
      },
      {
        label: 'Hash map clone — different approach',
      },
      {
        label: 'Merge sort list — different approach',
      },
      {
        label: 'Linear scan — different approach',
      },
    ],
    explain: 'Recurse to the tail, then append while the stack unwinds',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Print from end), what strategy is established?',
    choices: [
      {
        label: 'Recurse to the tail, then append — described in INIT caption',
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
      'Print from end: recurse all the way to the tail first, then append each value as the call stack unwinds. out = rec(next); out = append(out, head.Val). The result lists the values back-to-front.',
  },
  {
    id: 'key-step',
    prompt: 'On the "UNWIND" step (append ), what happens?',
    choices: [
      {
        label: 'The deeper call returned, so node — this move caption',
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
      "The deeper call returned, so node 's call resumes and appends its value  to the output. Because the tail finished first, values come out in reverse order.",
  },
  {
    id: 'state',
    prompt: 'What does the `values` field track in the visualization state?',
    choices: [
      {
        label: 'the linked list node values — updated each frame',
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
    explain: 'The recorder keeps `values` in sync: the linked list node values, head → tail',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Print from end"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
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
    explain: 'O(n). O(n). out=rec(next); out=append(out,head.Val)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'All calls have unwound. The output — final DONE caption',
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
    explain: 'All calls have unwound. The output is the node values reversed: [].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'pfe1', label: '1 → 2 → 3 → 4', value: { values: [1, 2, 3, 4] } },
    { id: 'pfe2', label: '5 → 9 → 2', value: { values: [5, 9, 2] } },
  ] satisfies SampleInput<PrintFromEndInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PrintFromEndState | undefined;
    return s ? { ok: true, label: `[${s.out.join(', ')}]` } : { ok: false, label: 'no output' };
  },
};

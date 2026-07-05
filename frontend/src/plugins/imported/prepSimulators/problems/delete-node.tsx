import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface DeleteNodeInput {
  /** The linked-list values, left → right (head first). */
  list: number[];
  /** Index (0-based) of the node we are handed a pointer to and must delete. */
  target: number;
}

interface DeleteNodeState {
  /** Current chain of values, head → tail. Shrinks by one once we skip. */
  chain: number[];
  /** Index of the node we must delete (the pointer we were handed). */
  node: number | null;
  /** Index of node.Next — the value we steal / the link we skip over. */
  next: number | null;
  /** True once the value copy has happened (node now holds next's value). */
  copied: boolean;
  /** True once the next node has been spliced out of the chain. */
  removed: boolean;
  done: boolean;
}

function record({ list, target }: DeleteNodeInput): Frame<DeleteNodeState>[] {
  const { emit, frames } = createRecorder<DeleteNodeState>(() => ({
        chain: list.slice(),
        node: null,
        next: null,
        copied: false,
        removed: false,
        done: false
      }));

  // Work on a mutable copy so the View can show the chain shrinking.
  const chain = list.slice();
  const node = target;
  const next = target + 1;

  emit(
    'INIT',
    `delete node ${target}`,
    `We are handed only a pointer to the node at index ${target} (value ${list[target]}) — we cannot see the head or the previous node. The trick: copy the next node's value over this one, then unlink the next node.`,
    { chain: chain.slice(), node },
  );

  emit(
    'INSPECT',
    `next = ${list[next]}`,
    `Look at node.Next (value ${list[next]}). Because we can overwrite this node's data, deleting "this" node really means making it impersonate its successor.`,
    { chain: chain.slice(), node, next },
  );

  // node.Val = node.Next.Val
  chain[node] = list[next];
  emit(
    'COPY',
    `node.Val = ${list[next]}`,
    `Steal the successor's value: node.Val = node.Next.Val, so the node at index ${target} now holds ${list[next]}. The original value ${list[target]} is gone, but a duplicate of ${list[next]} now sits at two places.`,
    { chain: chain.slice(), node, next, copied: true },
  );

  // node.Next = node.Next.Next  — splice out the (now duplicate) next node.
  chain.splice(next, 1);
  emit(
    'SKIP',
    `node.Next = node.Next.Next`,
    `Now relink past the successor: node.Next = node.Next.Next. The duplicate node is unlinked, leaving exactly one copy of ${list[next]}. The list is one shorter and the target is effectively deleted.`,
    { chain: chain.slice(), node, next: null, copied: true, removed: true, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DeleteNodeState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.node !== null) pointers.push({ i: s.node, label: 'node', tone: 'accent', place: 'above' });
  if (s.next !== null) pointers.push({ i: s.next, label: 'next', tone: 'warn', place: 'below' });

  const tone = (i: number) => {
    if (s.done && i === s.node) return 'found';
    if (i === s.node) return 'match';
    if (i === s.next) return 'dead';
    return '';
  };

  const arrows = s.chain.map((v) => String(v)).join(' → ');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        delete the node at <span className="font-mono text-ink">node</span> using only that pointer
      </div>
      <ArrayRow values={s.chain} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.removed ? 'list' : 'chain'}: {arrows || '∅'}
      </div>
      {s.copied && !s.removed && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          node.Val ← node.Next.Val (now duplicated)
        </div>
      )}
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {arrows || '∅'}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DeleteNodeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="node idx" v={s.node ?? '—'} />
      <InspectorRow k="node.Val" v={s.node !== null && s.node < s.chain.length ? s.chain[s.node] : '—'} />
      <InspectorRow k="next idx" v={s.next ?? '—'} />
      <InspectorRow k="next.Val" v={s.next !== null && s.next < s.chain.length ? s.chain[s.next] : '—'} />
      <InspectorRow k="copied" v={s.copied ? 'yes' : 'no'} />
      <InspectorRow k="list length" v={s.chain.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-delete-node';
export const title = 'Delete node';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Delete node\"?",
    choices: [
      {
        label: "Copy next then delete — fits this problem",
        correct: true
      },
      {
        label: "Hash map clone — different approach"
      },
      {
        label: "Merge sort list — different approach"
      },
      {
        label: "DFS flatten — different approach"
      }
    ],
    explain: "Steal the next node's value, then skip over it"
  },
  {
    id: "init",
    prompt: "At the start of a run (Delete node), what strategy is established?",
    choices: [
      {
        label: "Steal the next node's value, then — described in INIT caption",
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
    explain: "We are handed only a pointer to the node at index  (value ) — we cannot see the head or the previous node. The trick: copy the next node's value over this one, then unlink the next node."
  },
  {
    id: "key-step",
    prompt: "On the \"COPY\" step (node.Val = ), what happens?",
    choices: [
      {
        label: "Steal the successor's value: node.Val = — this move caption",
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
    explain: "Steal the successor's value: node.Val = node.Next.Val, so the node at index  now holds . The original value  is gone, but a duplicate of  now sits at two places."
  },
  {
    id: "state",
    prompt: "What does the `chain` field track in the visualization state?",
    choices: [
      {
        label: "Field chain in state — updated each frame",
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
    explain: "The recorder snapshots `chain` on every emit so each frame shows the algorithm mid-step."
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Delete node\"?",
    choices: [
      {
        label: "O(1) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(max(n,m)) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(m·n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(1). O(1). node.Val=next.Val; node.Next=next.Next"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Now relink past the successor: node.Next — final DONE caption",
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
    explain: "Now relink past the successor: node.Next = node.Next.Next. The duplicate node is unlinked, leaving exactly one copy of . The list is one shorter and the target is effectively deleted."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'dn1', label: '[4,5,1,9] delete idx 1', value: { list: [4, 5, 1, 9], target: 1 } },
    { id: 'dn2', label: '[1,2,3,4] delete idx 0', value: { list: [1, 2, 3, 4], target: 0 } },
  ] satisfies SampleInput<DeleteNodeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DeleteNodeState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    return { ok: true, label: `[${s.chain.join(',')}]` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
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

export const simulator: ProblemSimulator = {
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

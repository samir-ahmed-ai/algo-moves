import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/TreeBoard';

interface BstInput {
  /** Level-order array; null marks an absent slot. Children of i are 2i+1, 2i+2. Must be a valid BST. */
  tree: (number | null)[];
}

type Status = 'idle' | 'active' | 'done';

interface BstState {
  tree: (number | null)[];
  status: Status[]; // per-node visit status by tree index
  active: number | null; // node index currently being visited
  order: number[]; // in-order sequence of node indices linked so far
  first: number | null; // tree index of smallest node (head of DLL)
  last: number | null; // tree index of most recently linked node
  closed: boolean; // circular links first<->last connected
  done: boolean;
}

function record({ tree }: BstInput): Frame<BstState>[] {  const status: Status[] = tree.map(() => 'idle');
  const order: number[] = [];
  let first: number | null = null;
  let last: number | null = null;

  const val = (i: number) => tree[i] as number;

  const { emit, frames } = createRecorder<BstState>(() => ({
        tree,
        status: status.slice(),
        active: null,
        order: order.slice(),
        first,
        last,
        closed: false,
        done: false
      }));

  emit(
    'INIT',
    'in-order DFS',
    'Convert a BST into a sorted circular doubly linked list in place. An in-order traversal of a BST visits nodes in ascending order, so we walk in-order and splice each node onto the tail of a growing list. Time O(n), Space O(h) for the recursion stack.',
    {},
  );

  const inorder = (i: number) => {
    if (i >= tree.length || tree[i] == null) return;
    const l = 2 * i + 1;
    const r = 2 * i + 2;

    // Recurse left first — smaller values are linked before this node.
    if (l < tree.length && tree[l] != null) {
      emit(
        'GO_LEFT',
        `left of ${val(i)}`,
        `Before linking node ${val(i)}, recurse into its left subtree so every smaller value is placed first — that keeps the list sorted.`,
        { active: i, status: status.slice() },
      );
    }
    inorder(l);

    // Visit node i: this is the "process" step of in-order.
    status[i] = 'active';
    if (last != null) {
      emit(
        'LINK',
        `${val(last)} → ${val(i)}`,
        `Visit node ${val(i)}. The previous in-order node was ${val(last)}, so link last.Right = ${val(i)} and ${val(i)}.Left = ${val(last)}, appending ${val(i)} to the tail of the list.`,
        { active: i },
      );
    } else {
      first = i;
      emit(
        'FIRST',
        `first = ${val(i)}`,
        `Visit node ${val(i)}. There is no previous node, so ${val(i)} is the smallest value and becomes first (the head of the doubly linked list).`,
        { active: i },
      );
    }
    order.push(i);
    last = i;
    status[i] = 'done';
    emit(
      'ADVANCE',
      `last = ${val(i)}`,
      `Mark ${val(i)} as the most recent node (last = ${val(i)}). Its right subtree will be linked next.`,
      { active: i },
    );

    // Recurse right — larger values are linked after this node.
    if (r < tree.length && tree[r] != null) {
      emit(
        'GO_RIGHT',
        `right of ${val(i)}`,
        `Now recurse into ${val(i)}'s right subtree to link the values that come after it.`,
        { active: i },
      );
    }
    inorder(r);
  };

  inorder(0);

  // Close the ring: connect head and tail so it is circular.
  if (first != null && last != null) {
    emit(
      'CLOSE',
      `${val(last)} ⇄ ${val(first)}`,
      `Traversal done. Close the circle: first.Left = last (${val(first)}.Left = ${val(last)}) and last.Right = first (${val(last)}.Right = ${val(first)}). Return first (${val(first)}) as the head.`,
      { closed: true, done: true },
      'good',
    );
  } else {
    emit('DONE', 'empty tree', 'The tree is empty, so there is nothing to link — return null.', { done: true }, 'bad');
  }

  return frames;
}

function View({ frame }: PluginViewProps<BstState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    const st = s.status[i] ?? 'idle';
    if (st === 'active') return 'team-1';
    if (st === 'done') return 'team-2';
    return 'team-0';
  };
  const chain = s.order.map((i) => s.tree[i]);
  const chainStr = chain.length ? chain.join(' ⇄ ') : '·';
  const headVal = s.first !== null ? s.tree[s.first] : null;
  const tailVal = s.last !== null ? s.tree[s.last] : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        in-order build:{' '}
        {headVal !== null && (
          <>
            first = <span className="font-mono text-ink">{headVal}</span>
          </>
        )}
        {tailVal !== null && (
          <>
            {' · '}last = <span className="font-mono text-ink">{tailVal}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.base, s.closed ? 'text-good' : 'text-ink')}>
        {s.closed ? `⤺ ${chainStr} ⤸ (circular)` : chainStr}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>sorted doubly linked list, head → tail</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BstState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const nodeVal = (i: number | null) => (i !== null && s.tree[i] != null ? s.tree[i] : '—');
  return (
    <VarGrid>
      <InspectorRow k="active node" v={s.active !== null ? nodeVal(s.active) : '—'} />
      <InspectorRow k="first (head)" v={nodeVal(s.first)} />
      <InspectorRow k="last (tail)" v={nodeVal(s.last)} />
      <InspectorRow k="linked count" v={s.order.length} />
      <InspectorRow k="list" v={s.order.length ? s.order.map((i) => s.tree[i]).join(',') : '…'} />
      <InspectorRow k="circular" v={s.closed ? 'yes' : s.done ? 'empty' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-convert-binary-search-tree-to-sorted-doubly-linked-list';
export const title = 'Convert Binary Search Tree to Sorted Doubly Linked List';

export const simulator: ProblemSimulator = {
  inputs: [
    // Level-order BST: 4 / (2,5) / (1,3) -> in-order 1 2 3 4 5
    { id: 'bst1', label: 'BST [4,2,5,1,3]', value: { tree: [4, 2, 5, 1, 3] } },
    // Level-order BST: 3 / (1,4) / (null,2,null,5) -> in-order 1 2 3 4 5
    { id: 'bst2', label: 'BST [3,1,4,null,2,null,5]', value: { tree: [3, 1, 4, null, 2, null, 5] } },
  ] satisfies SampleInput<BstInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BstState | undefined;
    if (!s || s.order.length === 0) return { ok: false, label: 'empty' };
    const seq = s.order.map((i) => s.tree[i]);
    return { ok: s.closed, label: seq.join(' ⇄ ') };
  },
};

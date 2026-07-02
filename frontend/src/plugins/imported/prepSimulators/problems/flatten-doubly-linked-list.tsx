import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// A multilevel doubly linked list node, given as an adjacency-style description.
// `next` / `child` index into the `nodes` array; -1 means nil. We rebuild the
// real linked structure inside `record` so the DFS mirrors the Go solution.
interface NodeSpec {
  val: number;
  next: number; // index of the next sibling, or -1
  child: number; // index of the child head, or -1
}

interface FlattenInput {
  nodes: NodeSpec[];
}

interface FlattenState {
  // Final flattened order of node values, revealed progressively. Slots not yet
  // stitched into the flat chain show '·'.
  chain: (number | string)[];
  prevPos: number | null; // position in `chain` of the running tail (`prev`)
  curPos: number | null; // position in `chain` of the node being processed
  linkedCount: number; // how many leading positions are now stitched
  descending: boolean; // are we about to splice a child sublist in?
  done: boolean;
}

// Runtime node used during the faithful DFS re-implementation.
interface MNode {
  id: number;
  val: number;
  prev: MNode | null;
  next: MNode | null;
  child: MNode | null;
}

function build(nodes: NodeSpec[]): MNode | null {
  if (nodes.length === 0) return null;
  const ms: MNode[] = nodes.map((n, id) => ({ id, val: n.val, prev: null, next: null, child: null }));
  nodes.forEach((n, id) => {
    ms[id].next = n.next >= 0 ? ms[n.next] : null;
    ms[id].child = n.child >= 0 ? ms[n.child] : null;
  });
  return ms[0];
}

function record({ nodes }: FlattenInput): Frame<FlattenState>[] {  const head = build(nodes);

  // The flattened order is exactly DFS preorder (node, then child subtree, then
  // the saved next). Precompute it so the View can show each value in its final
  // column while we reveal the stitching one link at a time.
  const order: MNode[] = [];
  const preorder = (node: MNode | null) => {
    while (node) {
      order.push(node);
      if (node.child) preorder(node.child);
      node = node.next;
    }
  };
  preorder(head);

  const posOf = new Map<number, number>();
  order.forEach((nd, i) => posOf.set(nd.id, i));
  const allVals = order.map((nd) => nd.val);
  const total = order.length;

  const { emit, frames } = createRecorder<FlattenState>(() => ({
        chain: allVals.map(() => '·'),
        prevPos: null,
        curPos: null,
        linkedCount: 0,
        descending: false,
        done: false
      }), {
    merge: (base, partial) => {
      const linkedCount = partial.linkedCount ?? base.linkedCount;
      const chain = allVals.map((v, i) => (i < linkedCount ? v : '·'));
      return { ...base, ...partial, chain, linkedCount };
    },
  });

  if (!head) {
    emit('DONE', 'empty', 'The list is empty, so the flattened list is also empty.', { done: true }, 'good');
    return frames;
  }

  emit(
    'INIT',
    `${total} nodes`,
    `Flatten the multilevel doubly linked list into a single level. We DFS in preorder: each time a node has a child, splice that whole child sublist in right after it, then continue with the saved next. We keep a running tail "prev" and link prev↔node as we go.`,
    { linkedCount: 0 },
  );

  // Faithful re-implementation of the Go DFS, but emitting a frame per stitch.
  let prev: MNode | null = null;
  let linked = 0;

  const dfs = (node: MNode | null): MNode | null => {
    if (!node) return null;
    const pos = posOf.get(node.id)!;
    if (prev) {
      // prev.next = node; node.prev = prev — splice this node onto the tail.
      prev.next = node;
      node.prev = prev;
      linked = Math.max(linked, pos + 1);
      emit(
        'LINK',
        `${prev.val}→${node.val}`,
        `Link the running tail ${prev.val} to ${node.val}: prev.next = node and node.prev = prev. ${node.val} is now stitched into the flat chain at position ${pos}.`,
        { prevPos: posOf.get(prev.id)!, curPos: pos, linkedCount: linked },
      );
    } else {
      // First node: it heads the chain, nothing before it.
      linked = Math.max(linked, pos + 1);
      emit(
        'HEAD',
        `head=${node.val}`,
        `${node.val} is the head of the flattened list — there is no previous node, so prev starts here.`,
        { prevPos: null, curPos: pos, linkedCount: linked },
      );
    }
    prev = node;
    const next = node.next;

    if (node.child) {
      emit(
        'DESCEND',
        `child of ${node.val}`,
        `${node.val} has a child list. Recurse into the child first (DFS), flatten it, and remember its tail so we can re-attach the saved next afterwards.`,
        { prevPos: pos, curPos: pos, linkedCount: linked, descending: true },
      );
      const tail = dfs(node.child)!;
      node.next = node.child;
      node.child.prev = node;
      node.child = null;
      if (next) {
        tail.next = next;
        next.prev = tail;
      }
      emit(
        'ATTACH',
        `tail=${tail.val}`,
        `The child sublist is flattened; its tail is ${tail.val}. Re-attach the saved next (${next ? next.val : 'none'}) after that tail and clear the child pointer. Continue with prev = ${tail.val}.`,
        { prevPos: posOf.get(tail.id)!, curPos: posOf.get(tail.id)!, linkedCount: linked },
      );
      prev = tail;
    }

    if (next) return dfs(next);
    return node;
  };

  dfs(head);
  linked = total;

  emit(
    'DONE',
    `${total} nodes`,
    `Every level is spliced into one chain. The flattened order is ${allVals.join(' → ')}. Time O(n) — each node visited once; Space O(h) — recursion depth is the multilevel height.`,
    { linkedCount: total, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<FlattenState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.prevPos !== null) pointers.push({ i: s.prevPos, label: 'prev', tone: 'warn', place: 'below' });
  if (s.curPos !== null) pointers.push({ i: s.curPos, label: 'node', tone: 'accent', place: 'above' });

  const tone = (i: number) => {
    if (s.done) return 'found';
    if (i === s.curPos) return 'match';
    if (i < s.linkedCount) return 'in-window';
    return 'dead';
  };

  const linkedVals = s.chain.filter((c) => c !== '·');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        flattened so far:{' '}
        <span className="font-mono text-ink">{linkedVals.length ? linkedVals.join(' → ') : '—'}</span>
      </div>
      <ArrayRow values={s.chain} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        {s.descending ? 'descending into a child sublist…' : 'columns are the final flat order; · = not stitched yet'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FlattenState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const val = (pos: number | null) =>
    pos !== null && pos >= 0 && pos < s.chain.length ? s.chain[pos] : '—';
  return (
    <VarGrid>
      <InspectorRow k="total nodes" v={s.chain.length} />
      <InspectorRow k="prev (tail)" v={val(s.prevPos)} />
      <InspectorRow k="node (current)" v={val(s.curPos)} />
      <InspectorRow k="linked" v={`${s.linkedCount}/${s.chain.length}`} />
      <InspectorRow k="phase" v={s.descending ? 'descend child' : s.done ? 'done' : 'walk'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-flatten-doubly-linked-list';
export const title = 'Flatten doubly linked list';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      // 1 - 2 - 3 - 4 with 2 owning a child sublist 7 - 8 - 9.
      // Flattened: 1 2 7 8 9 3 4
      id: 'fl1',
      label: '1-2-3-4, child 7-8-9 under 2',
      value: {
        nodes: [
          { val: 1, next: 1, child: -1 }, // 0
          { val: 2, next: 2, child: 4 }, //  1
          { val: 3, next: 3, child: -1 }, // 2
          { val: 4, next: -1, child: -1 }, // 3
          { val: 7, next: 5, child: -1 }, // 4 (child head of 2)
          { val: 8, next: 6, child: -1 }, // 5
          { val: 9, next: -1, child: -1 }, // 6
        ],
      },
    },
    {
      // 1 - 2 - 3 ; 2 has child 4 ; 4 has child 5. Flattened: 1 2 4 5 3
      id: 'fl2',
      label: '1-2-3, nested children 4→5',
      value: {
        nodes: [
          { val: 1, next: 1, child: -1 }, // 0
          { val: 2, next: 2, child: 3 }, //  1
          { val: 3, next: -1, child: -1 }, // 2
          { val: 4, next: -1, child: 4 }, // 3 (child of 2)
          { val: 5, next: -1, child: -1 }, // 4 (child of 4)
        ],
      },
    },
  ] satisfies SampleInput<FlattenInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FlattenState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const vals = s.chain.filter((c) => c !== '·');
    return { ok: true, label: vals.length ? vals.join(' ') : 'empty' };
  },
};

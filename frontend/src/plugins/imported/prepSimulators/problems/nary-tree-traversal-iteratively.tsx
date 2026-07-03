import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { NaryTreeBoard, type NaryNode } from '../../../../components/board/NaryTreeBoard';

/**
 * N-ary iterative pre-order traversal with an explicit stack.
 *
 * Faithful to solution.go `preOrderIter`:
 *   stack = [root]
 *   while stack not empty:
 *     curr = stack.pop()
 *     res.append(curr.Val)
 *     for i := len(children)-1 .. 0: stack.push(children[i])   // reversed
 *
 * Pushing children in reverse means the leftmost child ends up on top of the
 * stack and is visited first, giving classic pre-order (root, then children L→R).
 */

/** Adjacency form of the tree: node i's value + child indices (0 is the root). */
interface NaryTreeInput {
  nodes: { val: number; children: number[] }[];
}

interface TraversalState {
  labels: string[]; // node value labels, index-aligned with input nodes
  children: number[][]; // children[i] = child indices of node i
  stack: number[]; // current explicit stack (bottom → top)
  res: number[]; // pre-order output collected so far (values)
  curr: number | null; // node index just popped / being processed
  visited: boolean[]; // emitted-to-result flag per node index
  done: boolean;
}

function record({ nodes }: NaryTreeInput): Frame<TraversalState>[] {  const labels = nodes.map((n) => String(n.val));
  const children = nodes.map((n) => n.children);
  const visited = new Array<boolean>(nodes.length).fill(false);
  const res: number[] = [];

  const { emit, frames } = createRecorder<TraversalState>(() => ({
        labels: labels,
        children: children,
        res: res.slice(),
        visited: visited.slice(),
        stack: [],
        curr: null,
        done: false
      }));

  if (nodes.length === 0) {
    emit('DONE', 'empty', 'The tree is empty, so pre-order traversal returns nothing.', { stack: [], curr: null , done: true }, 'bad');
    return frames;
  }

  const stack: number[] = [0];
  emit('INIT', 'push root', `Pre-order traversal with an explicit stack. Seed the stack with the root (node ${labels[0]}). We pop a node, emit its value, then push its children in reverse so the leftmost child is processed first.`, { stack: stack, curr: null });

  while (stack.length > 0) {
    const curr = stack.pop()!;
    emit('POP', `pop ${labels[curr]}`, `Pop the top of the stack: node ${labels[curr]}. In pre-order we emit a node the moment we pop it.`, { stack: stack, curr: curr });

    res.push(nodes[curr].val);
    visited[curr] = true;
    emit('EMIT', `emit ${labels[curr]}`, `Append ${labels[curr]} to the result. Output so far: [${res.join(', ')}].`, { stack: stack, curr: curr }, 'good');

    const kids = children[curr];
    if (kids.length === 0) {
      emit('LEAF', 'no children', `Node ${labels[curr]} is a leaf, so there is nothing to push. Continue with whatever is on top of the stack.`, { stack: stack, curr: curr });
    } else {
      for (let i = kids.length - 1; i >= 0; i--) {
        stack.push(kids[i]);
      }
      const pushedLabels = kids.map((c) => labels[c]);
      emit('PUSH', `push children`, `Push node ${labels[curr]}'s children in reverse order (${[...pushedLabels].reverse().join(', ')}) so the first child ${pushedLabels[0]} lands on top and gets visited next. Stack top → bottom: [${stack.slice().reverse().map((i) => labels[i]).join(', ')}].`, { stack: stack, curr: curr });
    }
  }

  emit('DONE', `${res.length} nodes`, `Stack is empty — traversal complete. Pre-order result: [${res.join(', ')}].`, { stack: [], curr: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<TraversalState>) {
  const s = frame.state;
  const boardNodes: NaryNode[] = s.labels.map((label, i) => ({ label, children: s.children[i] }));
  const nodeClass = (i: number) =>
    s.curr === i ? 'team-1' : s.visited[i] ? 'team-2' : 'team-0';

  const stackTop = s.stack.length > 0 ? s.stack[s.stack.length - 1] : null;

  const rail = (
    <>
      <RailStack
        label="stack"
        topLabel="top"
        items={s.stack.slice().reverse().map((i) => s.labels[i])}
      />
      <RailGroup label="current">
        <RailStat k="pop" v={s.curr !== null ? s.labels[s.curr] : '—'} tone="accent" />
        <RailStat k="next" v={stackTop !== null ? s.labels[stackTop] : '—'} />
      </RailGroup>
      <RailResult label="result" value={s.res.length ? `[${s.res.join(', ')}]` : '…'} tone={s.done ? 'good' : 'accent'} />
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      {boardNodes.length > 0 && (
        <NaryTreeBoard nodes={boardNodes} nodeClass={nodeClass} activeNode={s.curr} highlightNode={s.curr} />
      )}
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TraversalState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const top = s.stack.length > 0 ? s.labels[s.stack[s.stack.length - 1]] : '—';
  return (
    <VarGrid>
      <InspectorRow k="curr (popped)" v={s.curr !== null ? s.labels[s.curr] : '—'} />
      <InspectorRow k="stack top" v={top} />
      <InspectorRow k="stack size" v={s.stack.length} />
      <InspectorRow k="visited" v={s.visited.filter(Boolean).length} />
      <InspectorRow k="result" v={s.res.length ? `[${s.res.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-nary-tree-traversal-iteratively';
export const title = 'Nary tree traversal iteratively';

// Sample 1 — a 6-node tree:
//        1
//      / | \
//     2  3  4
//    / \
//   5   6
// Pre-order: 1, 2, 5, 6, 3, 4
const sample1: NaryTreeInput = {
  nodes: [
    { val: 1, children: [1, 2, 3] }, // 0
    { val: 2, children: [4, 5] }, // 1
    { val: 3, children: [] }, // 2
    { val: 4, children: [] }, // 3
    { val: 5, children: [] }, // 4
    { val: 6, children: [] }, // 5
  ],
};

// Sample 2 — deeper chain with a branch:
//      10
//     /  \
//    20   30
//    |
//    40
//   /  \
//  50   60
// Pre-order: 10, 20, 40, 50, 60, 30
const sample2: NaryTreeInput = {
  nodes: [
    { val: 10, children: [1, 2] }, // 0
    { val: 20, children: [3] }, // 1
    { val: 30, children: [] }, // 2
    { val: 40, children: [4, 5] }, // 3
    { val: 50, children: [] }, // 4
    { val: 60, children: [] }, // 5
  ],
};

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'nary1', label: 'root 1 · [2,3,4] kids', value: sample1 },
    { id: 'nary2', label: 'root 10 · deeper', value: sample2 },
  ] satisfies SampleInput<NaryTreeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TraversalState | undefined;
    const res = s?.res ?? [];
    return { ok: res.length > 0, label: `[${res.join(', ')}]` };
  },
};

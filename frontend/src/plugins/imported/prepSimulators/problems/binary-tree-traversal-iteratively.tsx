import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailStack, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

interface TraversalInput {
  /** Level-order values; null marks an absent node (children of i are 2i+1, 2i+2). */
  tree: (number | null)[];
}

interface TraversalState {
  tree: (number | null)[];
  cur: number | null; // index of the current node (2i+1/2i+2 layout); null = walked off the tree
  stack: number[]; // node indices sitting on the explicit stack
  visited: number[]; // node indices already emitted to the output
  out: number[]; // in-order values collected so far
  done: boolean;
}

function record({ tree }: TraversalInput): Frame<TraversalState>[] {  const n = tree.length;
  const left = (i: number) => 2 * i + 1;
  const right = (i: number) => 2 * i + 2;
  const exists = (i: number) => i >= 0 && i < n && tree[i] !== null;
  const val = (i: number) => tree[i] as number;

  const stack: number[] = [];
  const visited: number[] = [];
  const out: number[] = [];
  let cur: number | null = exists(0) ? 0 : null;

  const { emit, frames } = createRecorder<TraversalState>(() => ({
        tree: tree,
        cur: cur,
        stack: stack.slice(),
        visited: visited.slice(),
        out: out.slice(),
        done: false
      }));

  emit('INIT', 'iterative in-order', `In-order traversal without recursion: use an explicit stack. Repeatedly push the entire left spine, then pop a node to visit it and dive into its right subtree. Time O(n), Space O(h).`, {});

  // for cur != nil || len(stack) > 0
  while (cur !== null || stack.length > 0) {
    // Push the whole left spine.
    while (cur !== null) {
      stack.push(cur);
      const c = cur;
      emit('PUSH', `push ${val(c)}`, `cur is node ${val(c)} — push it onto the stack, then walk to its left child. We keep diving left, remembering each node so we can come back to it.`, {});
      cur = exists(left(c)) ? left(c) : null;
    }

    // cur is null: pop the deepest un-visited node and visit it.
    const top = stack.pop() as number;
    cur = top;
    out.push(val(top));
    visited.push(top);
    emit('VISIT', `visit ${val(top)}`, `Left is exhausted, so pop node ${val(top)} and visit it — append ${val(top)} to the output. In-order visits the left subtree, then the node, then the right subtree.`, {}, 'good');

    // cur = cur.Right — dive into the right subtree next.
    cur = exists(right(top)) ? right(top) : null;
    emit('RIGHT', cur !== null ? `go right → ${val(cur)}` : 'no right child', cur !== null
        ? `Now move to node ${val(top)}'s right child (${val(cur)}) and repeat: its left spine gets pushed next.`
        : `Node ${val(top)} has no right child, so cur becomes null. Next loop we pop the stack again (or stop if it is empty).`, {});
  }

  emit('DONE', `[${out.join(', ')}]`, `Both cur and the stack are empty, so every node is visited. The in-order sequence is [${out.join(', ')}].`, { done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<TraversalState>) {
  const s = frame.state;
  const onStack = new Set(s.stack);
  const isVisited = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.cur === i) return 'team-1';
    if (isVisited.has(i)) return 'team-2';
    if (onStack.has(i)) return 'team-1';
    return 'team-0';
  };
  const stackVals = s.stack.map((i) => String(s.tree[i]));
  const outVals = s.out.map(String);
  const curVal = s.cur !== null ? String(s.tree[s.cur]) : '—';
  return (
    <VizStage rail={<>
      <RailGroup label="cur">
        <RailStat k="node" v={curVal} tone="accent" />
      </RailGroup>
      <RailStack label="stack" items={stackVals} />
      {s.done
        ? <RailResult label="out" value={`[${s.out.join(', ')}]`} tone="good" />
        : <RailStack label="out" items={outVals} />}
    </>}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.cur} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TraversalState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.cur !== null ? s.tree[s.cur] : 'null';
  const stackVals = s.stack.map((i) => s.tree[i]);
  return (
    <VarGrid>
      <InspectorRow k="cur" v={curVal ?? 'null'} />
      <InspectorRow k="stack size" v={s.stack.length} />
      <InspectorRow k="stack" v={stackVals.length ? `[${stackVals.join(', ')}]` : '[]'} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow k="out" v={`[${s.out.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-binary-tree-traversal-iteratively';
export const title = 'Binary tree traversal iteratively';

export const simulator: ProblemSimulator = {
  inputs: [
    // In-order of this tree is [4, 2, 5, 1, 3].
    { id: 'bt1', label: 'in-order of small tree', value: { tree: [1, 2, 3, 4, 5] } },
    // Right-leaning BST-ish tree; in-order is [1, 2, 3, 4].
    { id: 'bt2', label: 'right-leaning tree', value: { tree: [2, 1, 3, null, null, null, 4] } },
  ] satisfies SampleInput<TraversalInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TraversalState | undefined;
    const out = s?.out ?? [];
    return { ok: out.length > 0, label: `[${out.join(', ')}]` };
  },
};

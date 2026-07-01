import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LeavesInput {
  /** Level-order array; null marks an absent slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface LeavesState {
  tree: (number | null)[];
  current: number | null; // node index currently being visited (ring)
  visited: number[]; // node indices fully processed
  leaves: number[]; // node indices identified as leaves
  out: number[]; // collected leaf values, in order
  done: boolean;
}

function record({ tree }: LeavesInput): Frame<LeavesState>[] {  const n = tree.length;
  const visited: number[] = [];
  const leaves: number[] = [];
  const out: number[] = [];

  const { emit, frames } = createRecorder<LeavesState>(() => ({
        tree,
        current: null,
        visited: [...visited],
        leaves: [...leaves],
        out: [...out],
        done: false
      }));

  const has = (i: number) => i >= 0 && i < n && tree[i] != null;
  const leftOf = (i: number) => 2 * i + 1;
  const rightOf = (i: number) => 2 * i + 2;

  emit(
    'INIT',
    'collect leaves',
    `Print Leaves: walk the tree post-order and collect every node with no children. A node is a leaf when both its left and right children are missing.`,
    {},
  );

  const dfs = (i: number) => {
    if (!has(i)) return;
    const val = tree[i];
    const l = leftOf(i);
    const r = rightOf(i);
    const leaf = !has(l) && !has(r);

    emit(
      'VISIT',
      `node ${val}`,
      `Visit node ${val}. Check its children: left is ${has(l) ? tree[l] : 'nil'}, right is ${has(r) ? tree[r] : 'nil'}.`,
      { current: i },
    );

    if (leaf) {
      leaves.push(i);
      out.push(val as number);
      emit(
        'LEAF',
        `leaf ${val}`,
        `Both children are nil, so node ${val} is a leaf. Append ${val} to the output → [${out.join(', ')}].`,
        { current: i },
        'good',
      );
      visited.push(i);
      return;
    }

    // Not a leaf: recurse into children (post-order: left then right).
    if (has(l)) dfs(l);
    if (has(r)) dfs(r);
    visited.push(i);
    emit(
      'BACK',
      `done ${val}`,
      `Node ${val} has children, so it is not a leaf — we only descended through it. Both subtrees are handled; return upward.`,
      { current: i },
    );
  };

  dfs(0);

  emit(
    'DONE',
    `[${out.join(', ')}]`,
    `Traversal complete. The leaves, left to right, are [${out.join(', ')}].`,
    { done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<LeavesState>) {
  const s = frame.state;
  const leafSet = new Set(s.leaves);
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.current === i) return 'team-1';
    if (leafSet.has(i)) return 'team-2';
    if (visitedSet.has(i)) return 'team-2';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink')}>
        leaves → [{s.out.join(', ')}]
      </div>
      <div className={cn(vizText.sm, 'text-ink3')}>
        ring = current node · green = leaf/visited · a node is a leaf when both children are nil
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LeavesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current !== null ? s.tree[s.current] : null;
  return (
    <VarGrid>
      <InspectorRow k="current node" v={curVal ?? '—'} />
      <InspectorRow k="leaves found" v={s.leaves.length} />
      <InspectorRow k="output" v={`[${s.out.join(', ')}]`} />
      <InspectorRow k="status" v={s.done ? 'done' : 'walking'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-print-leaves';
export const title = 'Print leaves';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'pl1',
      label: '[1,2,3,4,5,·,6]',
      value: { tree: [1, 2, 3, 4, 5, null, 6] },
    },
    {
      id: 'pl2',
      label: '[5,3,8,1,·,·,9]',
      value: { tree: [5, 3, 8, 1, null, null, 9] },
    },
  ] satisfies SampleInput<LeavesInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LeavesState | undefined;
    const out = s?.out ?? [];
    return { ok: out.length > 0, label: `[${out.join(', ')}]` };
  },
};

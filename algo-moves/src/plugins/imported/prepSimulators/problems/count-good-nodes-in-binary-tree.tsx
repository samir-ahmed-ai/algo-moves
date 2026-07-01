import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface GoodNodesInput {
  // Level-order binary tree; null marks an absent slot. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
}

interface GoodNodesState {
  tree: (number | null)[];
  current: number | null; // node index being visited
  maxVal: number | null; // greatest value seen on the path from root to this node
  good: number[]; // indices confirmed "good" so far
  visited: number[]; // indices whose subtree DFS has fully returned
  count: number; // running count of good nodes
  done: boolean;
}

function record({ tree }: GoodNodesInput): Frame<GoodNodesState>[] {
  const frames: Frame<GoodNodesState>[] = [];
  const good: number[] = [];
  const visited: number[] = [];
  let count = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<GoodNodesState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        current: null,
        maxVal: null,
        good: good.slice(),
        visited: visited.slice(),
        count,
        done: false,
        ...s,
      },
    });

  const rootVal = tree[0];

  emit(
    'INIT',
    'start DFS',
    `Count Good Nodes: a node is "good" when no ancestor on its root path has a strictly greater value. We DFS from the root carrying maxVal = the greatest value seen so far on the path. Seed maxVal with the root's value ${rootVal ?? '—'}.`,
    { current: 0, maxVal: rootVal ?? null },
  );

  // Faithful re-implementation of the Go dfs(node, maxVal) -> int.
  const dfs = (i: number, maxVal: number): number => {
    if (i >= tree.length || tree[i] == null) return 0;
    const val = tree[i] as number;

    let cnt = 0;
    let nextMax = maxVal;
    if (val >= maxVal) {
      cnt = 1;
      nextMax = val;
      count += 1;
      good.push(i);
      emit(
        'GOOD',
        `${val} >= ${maxVal}`,
        `Visit node ${val}. maxVal on this path is ${maxVal}, and ${val} >= ${maxVal}, so no ancestor beats it — node ${val} is GOOD. Count is now ${count}. Carry maxVal = ${nextMax} into its children.`,
        { current: i, maxVal: nextMax },
        'good',
      );
    } else {
      emit(
        'SKIP',
        `${val} < ${maxVal}`,
        `Visit node ${val}. maxVal on this path is ${maxVal}, and ${val} < ${maxVal}, so an ancestor is larger — node ${val} is NOT good. Carry maxVal = ${maxVal} unchanged into its children.`,
        { current: i, maxVal },
        'bad',
      );
    }

    const left = dfs(2 * i + 1, nextMax);
    const right = dfs(2 * i + 2, nextMax);

    visited.push(i);
    emit(
      'RETURN',
      `subtree=${cnt + left + right}`,
      `Node ${val}'s subtree is fully explored. It contributes ${cnt} (itself) + ${left} (left subtree) + ${right} (right subtree) = ${cnt + left + right} good nodes back up to its parent.`,
      { current: i, maxVal: nextMax },
    );

    return cnt + left + right;
  };

  const answer = rootVal == null ? 0 : dfs(0, rootVal);

  emit(
    'DONE',
    `${answer} good`,
    `DFS is complete. Every path was checked against its running maximum, giving ${answer} good node${answer === 1 ? '' : 's'} in the tree. Time O(n) — one visit per node; Space O(h) — the recursion stack is as deep as the tree.`,
    { current: null, maxVal: null, count: answer, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<GoodNodesState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.current === i) return 'team-1';
    if (s.good.includes(i) || s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        maxVal on path ={' '}
        <span className="font-mono text-ink">{s.maxVal ?? '—'}</span>
        {' · '}good so far ={' '}
        <span className="font-mono text-good">{s.count}</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        green ring = current · filled = good/visited · a node is good when node.val {'>='} maxVal on its path
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<GoodNodesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current !== null ? s.tree[s.current] : null;
  return (
    <VarGrid>
      <InspectorRow k="node.val" v={curVal ?? '—'} />
      <InspectorRow k="maxVal (path)" v={s.maxVal ?? '—'} />
      <InspectorRow
        k="node.val ≥ maxVal?"
        v={curVal != null && s.maxVal != null ? (curVal >= s.maxVal ? 'yes → good' : 'no') : '—'}
      />
      <InspectorRow k="good count" v={s.count} />
      <InspectorRow k="visited" v={s.visited.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-count-good-nodes-in-binary-tree';
export const title = 'Count Good Nodes in Binary Tree';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'gn1', label: '[3,1,4,3,null,1,5]', value: { tree: [3, 1, 4, 3, null, 1, 5] } },
    { id: 'gn2', label: '[3,3,null,4,2]', value: { tree: [3, 3, null, 4, 2] } },
  ] satisfies SampleInput<GoodNodesInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as GoodNodesState | undefined;
    const v = s?.count ?? 0;
    return { ok: true, label: `${v} good node${v === 1 ? '' : 's'}` };
  },
};

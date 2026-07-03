import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// The tree is given as a level-order array (null = absent slot) so it renders on
// the binary TreeBoard. Children of index i live at 2i+1 and 2i+2; the algorithm
// walks whatever children a node actually has, so it stays a faithful N-ary
// post-order LCA even though the layout is binary.
interface LcaInput {
  tree: (number | null)[];
  a: number; // value of the first target node
  b: number; // value of the second target node
}

interface LcaState {
  tree: (number | null)[];
  a: number;
  b: number;
  active: number | null; // node index currently being visited
  visited: number[]; // indices we have fully processed
  onPath: number[]; // indices on the current recursion stack
  count: number | null; // child hits recorded at the active node
  result: number | null; // index of the LCA once decided
  done: boolean;
}

function childrenOf(tree: (number | null)[], i: number): number[] {
  const out: number[] = [];
  for (const c of [2 * i + 1, 2 * i + 2]) {
    if (c < tree.length && tree[c] != null) out.push(c);
  }
  return out;
}

function record({ tree, a, b }: LcaInput): Frame<LcaState>[] {  const visited: number[] = [];
  const stack: number[] = [];

  const { emit, frames } = createRecorder<LcaState>(() => ({
        tree,
        a,
        b,
        active: null,
        visited: [...visited],
        onPath: [...stack],
        count: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `find LCA(${a}, ${b})`,
    `Lowest Common Ancestor of ${a} and ${b}: recurse post-order. Each node reports whether it (or its subtree) contained a target. The deepest node where two different children each report a hit is the LCA.`,
    {},
  );

  // Post-order DFS. Returns the index of the discovered LCA / hit node, or -1.
  const dfs = (i: number): number => {
    stack.push(i);
    const val = tree[i];
    emit(
      'VISIT',
      `node ${val}`,
      `Descend into node ${val}. If it is a target we return immediately; otherwise we ask each child whether the subtree below holds ${a} or ${b}.`,
      { active: i, count: 0 },
    );

    if (val === a || val === b) {
      emit(
        'HIT',
        `node ${val} is a target`,
        `Node ${val} is one of the targets, so this subtree contains a match. Return node ${val} up to the parent as a hit.`,
        { active: i, count: null },
        'good',
      );
      stack.pop();
      visited.push(i);
      return i;
    }

    let found = -1;
    let count = 0;
    for (const c of childrenOf(tree, i)) {
      const lca = dfs(c);
      if (lca !== -1) {
        count++;
        found = lca;
        emit(
          'HIT-COUNT',
          `hits at ${val}: ${count}`,
          `Child subtree under node ${val} reported a hit (${tree[lca]}). That is hit #${count} for node ${val}. Two hits from different children would make ${val} the LCA.`,
          { active: i, count },
        );
      } else {
        emit(
          'MISS',
          `child of ${val} empty`,
          `That child subtree of node ${val} held neither target — nothing to propagate. Keep the hit count at ${count}.`,
          { active: i, count },
        );
      }
    }

    stack.pop();
    visited.push(i);

    if (count >= 2) {
      emit(
        'LCA',
        `LCA = ${val}`,
        `Node ${val} received hits from ${count} different children, so ${a} and ${b} split here. Node ${val} is the lowest common ancestor.`,
        { active: i, count, result: i, done: true },
        'good',
      );
      return i;
    }

    emit(
      'PROPAGATE',
      `bubble up from ${val}`,
      count === 1
        ? `Only one child of node ${val} had a hit, so ${val} is not the split point yet. Propagate the found node (${found !== -1 ? tree[found] : '—'}) upward.`
        : `No child of node ${val} had a hit, so this subtree is empty. Return "nothing" to the parent.`,
      { active: i, count },
    );
    return found;
  };

  const answer = dfs(0);

  if (answer !== -1 && !frames[frames.length - 1]?.state.done) {
    // Root itself turned out to be the propagated node (e.g. root is a target
    // or the LCA bubbled all the way to the root without a >=2 split there).
    emit(
      'RESULT',
      `LCA = ${tree[answer]}`,
      `The recursion settled on node ${tree[answer]} as the lowest common ancestor of ${a} and ${b}.`,
      { active: answer, result: answer, done: true },
      'good',
    );
  } else if (answer === -1) {
    emit('NONE', 'no LCA', `Neither ${a} nor ${b} was found in the tree, so there is no common ancestor.`, { done: true }, 'bad');
  }

  return frames;
}

function View({ frame }: PluginViewProps<LcaState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.result === i) return 'team-1';
    if (s.active === i) return 'team-1';
    if (s.visited.includes(i)) return 'team-2';
    if (s.onPath.includes(i)) return 'team-1';
    return 'team-0';
  };
  const targetIdx = (v: number) => s.tree.findIndex((x) => x === v);
  const aIdx = targetIdx(s.a);
  const bIdx = targetIdx(s.b);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        LCA of <span className="font-mono text-ink">{s.a}</span> and{' '}
        <span className="font-mono text-ink">{s.b}</span>
        {s.count !== null && s.active !== null && !s.done && (
          <>
            {' · '}hits at <span className="font-mono text-ink">{s.tree[s.active]}</span> ={' '}
            <span className="font-mono text-ink">{s.count}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        targets: {s.a}
        {aIdx === -1 ? ' (missing)' : ''}, {s.b}
        {bIdx === -1 ? ' (missing)' : ''}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ LCA = {s.tree[s.result]}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LcaState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="targets" v={`${s.a}, ${s.b}`} />
      <InspectorRow k="active node" v={s.active !== null ? (s.tree[s.active] ?? '—') : '—'} />
      <InspectorRow k="child hits" v={s.count ?? '—'} />
      <InspectorRow k="stack depth" v={s.onPath.length} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow k="LCA" v={s.result !== null ? (s.tree[s.result] ?? '—') : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-nary-tree-lowest-common-ancestor';
export const title = 'Find lowest common ancestor';

// Level-order tree (binary slots, N-ary walk):
//            3
//          /   \
//         5      1
//        / \    / \
//       6   2  0   8
//          / \
//         7   4
const SAMPLE_TREE: (number | null)[] = [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4];

function computeLca(tree: (number | null)[], a: number, b: number): number | null {
  const children = (i: number) =>
    [2 * i + 1, 2 * i + 2].filter((c) => c < tree.length && tree[c] != null);
  const dfs = (i: number): number => {
    if (tree[i] === a || tree[i] === b) return i;
    let found = -1;
    let count = 0;
    for (const c of children(i)) {
      const r = dfs(c);
      if (r !== -1) {
        count++;
        found = r;
      }
    }
    if (count >= 2) return i;
    return found;
  };
  const idx = dfs(0);
  return idx === -1 ? null : (tree[idx] as number);
}

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'lca1', label: 'LCA(7, 4) → 2', value: { tree: SAMPLE_TREE, a: 7, b: 4 } },
    { id: 'lca2', label: 'LCA(6, 4) → 5', value: { tree: SAMPLE_TREE, a: 6, b: 4 } },
  ] satisfies SampleInput<LcaInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LcaState | undefined;
    if (!s) return { ok: false, label: 'no run' };
    const ans = computeLca(s.tree, s.a, s.b);
    return ans !== null ? { ok: true, label: `LCA = ${ans}` } : { ok: false, label: 'no LCA' };
  },
};

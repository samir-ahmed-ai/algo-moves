import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LcaInput {
  // Level-order binary tree; null marks an absent slot. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
  p: number; // index of target node p
  q: number; // index of target node q
}

interface LcaState {
  tree: (number | null)[];
  p: number;
  q: number;
  current: number | null; // node index currently being visited (pre-order enter)
  returned: number | null; // index this call is returning up to its parent (-1 for nil)
  visited: number[]; // indices whose DFS has fully returned
  path: number[]; // active recursion-stack indices (root → current)
  lca: number | null; // the discovered LCA index
  done: boolean;
}

const NIL = -1;

function record({ tree, p, q }: LcaInput): Frame<LcaState>[] {
  const frames: Frame<LcaState>[] = [];
  const visited: number[] = [];
  const path: number[] = [];
  let lca: number | null = null;

  const valOf = (i: number) => (i >= 0 && i < tree.length ? tree[i] : null);

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<LcaState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        p,
        q,
        current: null,
        returned: null,
        visited: visited.slice(),
        path: path.slice(),
        lca,
        done: false,
        ...s,
      },
    });

  const pVal = valOf(p);
  const qVal = valOf(q);

  emit(
    'INIT',
    'start DFS',
    `Lowest Common Ancestor: find the deepest node that is an ancestor of both p (node ${pVal ?? '—'}) and q (node ${qVal ?? '—'}). We run a post-order DFS: a call returns a target the moment it lands on p or q, and any node that catches a non-nil result from BOTH sides is the LCA.`,
    { current: 0 },
  );

  // Faithful re-implementation of the Go lowestCommonAncestor(root, p, q).
  // Returns an index (or NIL) instead of a *TreeNode.
  const dfs = (i: number): number => {
    if (i >= tree.length || tree[i] == null) {
      emit(
        'NIL',
        'root == nil',
        `Reached an empty slot — there is no node here, so this branch returns nil and contributes nothing upward.`,
        { current: null, returned: NIL },
      );
      return NIL;
    }

    const val = tree[i] as number;
    path.push(i);

    if (i === p || i === q) {
      const who = i === p ? 'p' : 'q';
      emit(
        'HIT',
        `found ${who}`,
        `Enter node ${val}. It is ${who} (a target), so per the base case we return this node immediately without recursing further — its own subtree can't hold a lower common ancestor than itself.`,
        { current: i, returned: i },
        'good',
      );
      path.pop();
      visited.push(i);
      return i;
    }

    emit(
      'VISIT',
      `visit ${val}`,
      `Enter node ${val}. It isn't p or q, so recurse into its left and right subtrees and see what each side sends back.`,
      { current: i },
    );

    const left = dfs(2 * i + 1);
    const right = dfs(2 * i + 2);

    path.pop();
    visited.push(i);

    if (left !== NIL && right !== NIL) {
      const lVal = valOf(left);
      const rVal = valOf(right);
      lca = i;
      emit(
        'SPLIT',
        `LCA = ${val}`,
        `Node ${val} received a target from BOTH sides: ${lVal} came up the left, ${rVal} came up the right. p and q live in different subtrees here, so node ${val} is their lowest common ancestor.`,
        { current: i, returned: i, lca: i },
        'good',
      );
      return i;
    }

    if (left !== NIL) {
      emit(
        'PASS',
        `bubble ${valOf(left)}`,
        `Only the left side returned something (${valOf(left)}); the right returned nil. Node ${val} passes that non-nil result straight up — both targets (or the single one found so far) are on the left.`,
        { current: i, returned: left },
      );
      return left;
    }

    emit(
      'PASS',
      right === NIL ? 'return nil' : `bubble ${valOf(right)}`,
      right === NIL
        ? `Both sides returned nil — neither p nor q is under node ${val}. It returns nil to its parent.`
        : `Only the right side returned something (${valOf(right)}); the left returned nil. Node ${val} passes that result up unchanged.`,
      { current: i, returned: right },
    );
    return right;
  };

  const result = dfs(0);
  const ansVal = valOf(result);

  emit(
    'DONE',
    ansVal == null ? 'no LCA' : `LCA = ${ansVal}`,
    ansVal == null
      ? `DFS finished without both targets bubbling into one node — no common ancestor was found.`
      : `DFS complete. The value that bubbled to the top is ${ansVal}, so the lowest common ancestor of p (${pVal}) and q (${qVal}) is node ${ansVal}. Time O(n) — each node is visited once; Space O(h) — the recursion stack is as deep as the tree.`,
    { current: null, returned: null, lca: result === NIL ? null : result, done: true },
    ansVal == null ? 'bad' : 'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<LcaState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.lca === i) return 'team-2';
    if (s.current === i) return 'team-1';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  const pVal = s.p >= 0 && s.p < s.tree.length ? s.tree[s.p] : null;
  const qVal = s.q >= 0 && s.q < s.tree.length ? s.tree[s.q] : null;
  const lcaVal = s.lca !== null ? s.tree[s.lca] : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        p = <span className="font-mono text-ink">{pVal ?? '—'}</span>
        {' · '}q = <span className="font-mono text-ink">{qVal ?? '—'}</span>
        {' · '}LCA = <span className="font-mono text-good">{lcaVal ?? '…'}</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        green ring = current call · filled = returned/done · LCA catches a target from both sides
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LcaState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current !== null ? s.tree[s.current] : null;
  const retVal = s.returned == null ? null : s.returned === NIL ? 'nil' : s.tree[s.returned];
  const lcaVal = s.lca !== null ? s.tree[s.lca] : null;
  const pVal = s.p >= 0 && s.p < s.tree.length ? s.tree[s.p] : null;
  const qVal = s.q >= 0 && s.q < s.tree.length ? s.tree[s.q] : null;
  return (
    <VarGrid>
      <InspectorRow k="p / q" v={`${pVal ?? '—'} / ${qVal ?? '—'}`} />
      <InspectorRow k="current node" v={curVal ?? '—'} />
      <InspectorRow k="returns" v={retVal ?? '—'} />
      <InspectorRow k="stack depth" v={s.path.length} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow k="LCA" v={lcaVal ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-lowest-common-ancestor-of-a-binary-tree';
export const title = 'Lowest Common Ancestor of a Binary Tree';

export const simulator: ProblemSimulator = {
  inputs: [
    // Tree: [3,5,1,6,2,0,8,null,null,7,4]; p = node 5 (index 1), q = node 1 (index 2) → LCA 3.
    { id: 'lca1', label: 'LCA(5,1) → 3', value: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 1, q: 2 } },
    // Same tree; p = node 5 (index 1), q = node 4 (index 10) → LCA 5 (5 is ancestor of 4).
    { id: 'lca2', label: 'LCA(5,4) → 5', value: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 1, q: 10 } },
  ] satisfies SampleInput<LcaInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LcaState | undefined;
    if (!s || s.lca === null) return { ok: false, label: 'no LCA' };
    const v = s.tree[s.lca];
    return { ok: true, label: `LCA = ${v}` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// Level-order tree: children of i are 2i+1 and 2i+2; null marks an absent slot.
// `p` and `q` are node indices into that array (the two nodes to measure between).
interface DistInput {
  tree: (number | null)[];
  p: number;
  q: number;
}

type Phase = 'INIT' | 'LCA' | 'DEPTH_P' | 'DEPTH_Q' | 'DONE';

interface DistState {
  tree: (number | null)[];
  p: number;
  q: number;
  phase: Phase;
  active: number | null; // node currently under inspection (ring)
  visited: number[]; // nodes already resolved / on the settled path
  lca: number | null; // LCA index once found
  depthP: number | null; // depth from lca down to p
  depthQ: number | null; // depth from lca down to q
  answer: number | null; // depthP + depthQ
}

// Children helpers over the level-order array.
const left = (i: number) => 2 * i + 1;
const right = (i: number) => 2 * i + 2;
const exists = (tree: (number | null)[], i: number) => i >= 0 && i < tree.length && tree[i] != null;
const val = (tree: (number | null)[], i: number) => (exists(tree, i) ? tree[i] : '·');

function record({ tree, p, q }: DistInput): Frame<DistState>[] {  const visited: number[] = [];

  const { emit, frames } = createRecorder<DistState>(() => ({
        tree,
        p,
        q,
        phase: 'INIT',
        active: null,
        visited: visited.slice(),
        lca: null,
        depthP: null,
        depthQ: null,
        answer: null
      }));

  emit(
    'INIT',
    'start',
    `Find the distance between node ${val(tree, p)} and node ${val(tree, q)}. The plan: first find their lowest common ancestor (LCA), then the distance is depth(LCA→${val(tree, p)}) + depth(LCA→${val(tree, q)}). Time O(n), Space O(h).`,
    { active: 0 },
  );

  // --- Phase 1: post-order LCA search (mirrors findLCA). ---
  // Returns the found index, or -1 when p/q not present in this subtree.
  const findLCA = (i: number): number => {
    if (!exists(tree, i)) return -1;
    emit(
      'LCA',
      `visit ${val(tree, i)}`,
      `LCA search visits node ${val(tree, i)}. If it equals a target we return it; otherwise we recurse into both children and let the answers bubble up.`,
      { active: i },
    );
    if (i === p || i === q) {
      visited.push(i);
      emit(
        'LCA',
        `hit ${val(tree, i)}`,
        `Node ${val(tree, i)} is one of the two targets, so this subtree reports itself upward as a candidate.`,
        { active: i },
        'good',
      );
      return i;
    }
    const l = findLCA(left(i));
    const r = findLCA(right(i));
    if (l >= 0 && r >= 0) {
      visited.push(i);
      emit(
        'LCA',
        `lca=${val(tree, i)}`,
        `One target came back from the left subtree and the other from the right — node ${val(tree, i)} is where they split, so it is the lowest common ancestor.`,
        { active: i, lca: i },
        'good',
      );
      return i;
    }
    const up = l >= 0 ? l : r;
    if (up >= 0) {
      emit(
        'LCA',
        `pass up ${val(tree, up)}`,
        `Only one side found a target under node ${val(tree, i)}, so we pass that candidate (${val(tree, up)}) up unchanged.`,
        { active: i },
      );
    }
    return up;
  };

  const lca = findLCA(0);

  // --- depth helper (mirrors depth): steps DOWN from `from` to `target`. ---
  // Records each node on the descent; returns hop count or -1 if not found.
  const measure = (from: number, target: number, targetPhase: Phase): number => {
    const search = (i: number): number => {
      if (!exists(tree, i)) return -1;
      emit(
        targetPhase,
        `at ${val(tree, i)}`,
        `Measuring depth from the LCA (${val(tree, lca)}) down to ${val(tree, target)}: currently standing on node ${val(tree, i)}.`,
        { active: i, lca },
      );
      if (i === target) return 0;
      const dl = search(left(i));
      if (dl >= 0) {
        visited.push(i);
        return dl + 1;
      }
      const dr = search(right(i));
      if (dr >= 0) {
        visited.push(i);
        return dr + 1;
      }
      return -1;
    };
    if (!visited.includes(target)) visited.push(target);
    return search(from);
  };

  emit(
    'DEPTH_P',
    'measure p',
    `LCA settled at node ${val(tree, lca)}. Now walk down from it to node ${val(tree, p)}, counting one hop per edge.`,
    { active: lca, lca },
  );
  const depthP = measure(lca, p, 'DEPTH_P');
  emit(
    'DEPTH_P',
    `depthP=${depthP}`,
    `Reached node ${val(tree, p)} — it sits ${depthP} edge${depthP === 1 ? '' : 's'} below the LCA. depth(LCA→${val(tree, p)}) = ${depthP}.`,
    { active: p, lca, depthP },
    'good',
  );

  emit(
    'DEPTH_Q',
    'measure q',
    `Now walk down from the LCA (${val(tree, lca)}) to the other node, ${val(tree, q)}.`,
    { active: lca, lca, depthP },
  );
  const depthQ = measure(lca, q, 'DEPTH_Q');
  emit(
    'DEPTH_Q',
    `depthQ=${depthQ}`,
    `Reached node ${val(tree, q)} — ${depthQ} edge${depthQ === 1 ? '' : 's'} below the LCA. depth(LCA→${val(tree, q)}) = ${depthQ}.`,
    { active: q, lca, depthP, depthQ },
    'good',
  );

  const answer = depthP + depthQ;
  emit(
    'DONE',
    `distance=${answer}`,
    `Distance = depth(LCA→${val(tree, p)}) + depth(LCA→${val(tree, q)}) = ${depthP} + ${depthQ} = ${answer}. That is the number of edges on the path between the two nodes.`,
    { lca, depthP, depthQ, answer },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DistState>) {
  const s = frame.state;
  const targets = new Set([s.p, s.q]);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (i === s.lca && s.lca !== null) return 'team-2';
    if (s.visited.includes(i)) return 'team-2';
    if (targets.has(i)) return 'team-1';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        targets ={' '}
        <span className="font-mono text-ink">{val(s.tree, s.p)}</span>
        {' & '}
        <span className="font-mono text-ink">{val(s.tree, s.q)}</span>
        {s.lca !== null && (
          <>
            {' · LCA = '}
            <span className="font-mono text-ink">{val(s.tree, s.lca)}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        depthP = {s.depthP ?? '·'} {' · '} depthQ = {s.depthQ ?? '·'}
        {s.answer !== null && (
          <span className="ml-2 text-good">→ distance = {s.answer}</span>
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DistState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="p" v={val(s.tree, s.p)} />
      <InspectorRow k="q" v={val(s.tree, s.q)} />
      <InspectorRow k="current" v={s.active !== null ? val(s.tree, s.active) : '—'} />
      <InspectorRow k="LCA" v={s.lca !== null ? val(s.tree, s.lca) : '…'} />
      <InspectorRow k="depth(LCA→p)" v={s.depthP ?? '…'} />
      <InspectorRow k="depth(LCA→q)" v={s.depthQ ?? '…'} />
      <InspectorRow k="distance" v={s.answer ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-find-distance-of-two-nodes';
export const title = 'Find distance of two nodes';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'fd1',
      label: '6 ↔ 4 in [3,5,1,6,2,0,8,·,·,7,4]',
      value: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 3, q: 10 },
    },
    {
      id: 'fd2',
      label: '4 ↔ 8 (deeper split)',
      value: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 10, q: 6 },
    },
  ] satisfies SampleInput<DistInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DistState | undefined;
    return s && s.answer !== null
      ? { ok: true, label: `distance = ${s.answer}` }
      : { ok: false, label: 'no path' };
  },
};

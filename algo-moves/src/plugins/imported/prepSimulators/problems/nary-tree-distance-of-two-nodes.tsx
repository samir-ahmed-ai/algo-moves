import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { NaryTreeBoard, type NaryNode } from '../../../../components/NaryTreeBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface DistanceInput {
  /** Flat n-ary tree; node 0 is the root, children are indices into this list. */
  nodes: NaryNode[];
  /** Index of the first target node. */
  a: number;
  /** Index of the second target node. */
  b: number;
}

type Phase = 'lca' | 'level' | 'done';

interface DistanceState {
  nodes: NaryNode[];
  a: number;
  b: number;
  phase: Phase;
  /** Current node being inspected (ring). */
  active: number | null;
  /** Nodes already visited/settled this phase (team-2). */
  visited: number[];
  /** The LCA once found. */
  lca: number | null;
  /** Which target we are measuring the level distance to, if in the level phase. */
  measureTo: number | null;
  /** BFS frontier during a levelDistance run. */
  frontier: number[];
  /** Current BFS level counter. */
  level: number | null;
  distA: number | null;
  distB: number | null;
  answer: number | null;
  done: boolean;
}

function record({ nodes, a, b }: DistanceInput): Frame<DistanceState>[] {  const label = (i: number) => nodes[i]?.label ?? `#${i}`;

  const base: DistanceState = {
    nodes,
    a,
    b,
    phase: 'lca',
    active: null,
    visited: [],
    lca: null,
    measureTo: null,
    frontier: [],
    level: null,
    distA: null,
    distB: null,
    answer: null,
    done: false,
  };

  const { emit, frames } = createRecorder<DistanceState>(() => ({
        ...base
      }));

  emit('INIT', `dist(${label(a)}, ${label(b)})`, `Distance of two nodes in an n-ary tree. Plan: find the lowest common ancestor (LCA) of ${label(a)} and ${label(b)}, then add the two downward level distances from the LCA. Answer = levelDistance(lca, a) + levelDistance(lca, b). Time O(n), Space O(h).`, { phase: 'lca' });

  // --- Phase 1: LCA (faithful recursive post-order, counting matching subtrees) ---
  const lcaVisited: number[] = [];

  const findLca = (root: number): number | null => {
    lcaVisited.push(root);
    if (root === a || root === b) {
      emit('LCA_HIT', `reached ${label(root)}`, `Recursing into ${label(root)}: it is one of our targets, so this subtree reports ${label(root)} back up to its parent.`, { phase: 'lca', active: root, visited: [...lcaVisited] });
      return root;
    }
    emit('LCA_DESCEND', `visit ${label(root)}`, `Visiting ${label(root)}. Neither target yet, so we recurse into each child and count how many child subtrees contain a target.`, { phase: 'lca', active: root, visited: [...lcaVisited] });

    let found: number | null = null;
    let count = 0;
    for (const child of nodes[root].children) {
      const res = findLca(child);
      if (res !== null) {
        count++;
        found = res;
      }
    }

    if (count >= 2) {
      emit('LCA_FOUND', `LCA = ${label(root)}`, `Two different child subtrees of ${label(root)} each returned a target, so the paths to ${label(a)} and ${label(b)} split here. ${label(root)} is the lowest common ancestor.`, { phase: 'lca', active: root, visited: [...lcaVisited], lca: root }, 'good');
      return root;
    }
    if (found !== null) {
      emit('LCA_BUBBLE', `bubble ${label(found)}`, `Only one subtree under ${label(root)} contained a target (${label(found)}). ${label(root)} is not the split point, so it passes ${label(found)} further up.`, { phase: 'lca', active: root, visited: [...lcaVisited] });
    }
    return found;
  };

  const lcaIdx = findLca(0);
  const lca = lcaIdx ?? 0;

  // --- Phase 2: levelDistance via BFS from the LCA ---
  const levelDistance = (from: number, target: number): number => {
    if (from === target) {
      emit('LEVEL_ZERO', `${label(target)} is the LCA`, `Measuring from the LCA ${label(from)} down to ${label(target)}: it is the LCA itself, so the level distance is 0.`, { phase: 'level', active: from, lca, measureTo: target, level: 0, visited: [from] });
      return 0;
    }

    let level = 0;
    let frontier: number[] = [...nodes[from].children];
    const seen: number[] = [from];

    emit('LEVEL_START', `BFS from ${label(from)}`, `Measuring from LCA ${label(from)} down to ${label(target)}. Start a level-by-level BFS: level 0 is the LCA, its children sit at level 1.`, { phase: 'level', active: from, lca, measureTo: target, level, frontier: [...frontier], visited: [...seen] });

    while (frontier.length > 0) {
      level++;
      const next: number[] = [];
      for (const node of frontier) {
        seen.push(node);
        if (node === target) {
          emit('LEVEL_HIT', `${label(target)} at level ${level}`, `Found ${label(target)} on BFS level ${level}. So the downward distance from the LCA ${label(from)} to ${label(target)} is ${level}.`, { phase: 'level', active: node, lca, measureTo: target, level, frontier: [...frontier], visited: [...seen] }, 'good');
          return level;
        }
        for (const c of nodes[node].children) next.push(c);
      }
      emit('LEVEL_STEP', `level ${level}`, `Scanned every node on level ${level} without hitting ${label(target)}. Descend to level ${level + 1} using their children as the new frontier.`, { phase: 'level', active: null, lca, measureTo: target, level, frontier: [...next], visited: [...seen] });
      frontier = next;
    }
    return -1;
  };

  const distA = levelDistance(lca, a);
  base.distA = distA;
  const distB = levelDistance(lca, b);
  base.distB = distB;
  const answer = distA + distB;

  emit('DONE', `distance = ${answer}`, `Combine the two downward distances: levelDistance(${label(lca)}, ${label(a)}) = ${distA} and levelDistance(${label(lca)}, ${label(b)}) = ${distB}. The distance between ${label(a)} and ${label(b)} is ${distA} + ${distB} = ${answer}.`, { phase: 'done', lca, distA, distB, answer, done: true, visited: [lca, a, b] }, 'good');

  return frames;
}

function View({ frame }: PluginViewProps<DistanceState>) {
  const s = frame.state;
  const label = (i: number | null) => (i !== null && s.nodes[i] ? s.nodes[i].label : '—');
  const nodeClass = (i: number) => {
    if (i === s.active) return 'team-1';
    if (i === s.lca && s.lca !== null) return 'team-2';
    if (i === s.a || i === s.b) return 'team-2';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  const rail = (
    <>
      <RailGroup label="targets">
        <RailStat k="a" v={label(s.a)} />
        <RailStat k="b" v={label(s.b)} />
      </RailGroup>
      <RailGroup label="search">
        <RailStat k="phase" v={s.phase} />
        <RailStat k="active" v={label(s.active)} tone="accent" />
        <RailStat k="LCA" v={s.lca !== null ? label(s.lca) : '…'} tone={s.lca !== null ? 'good' : undefined} />
        {s.phase === 'level' && s.measureTo !== null && (
          <>
            <RailStat k="→" v={label(s.measureTo)} />
            <RailStat k="level" v={s.level ?? '—'} tone="accent" />
          </>
        )}
      </RailGroup>
      <RailGroup label="dists">
        <RailStat k={`d(lca,${label(s.a)})`} v={s.distA ?? '…'} />
        <RailStat k={`d(lca,${label(s.b)})`} v={s.distB ?? '…'} />
      </RailGroup>
      {s.answer !== null && (
        <RailResult label="distance" value={s.answer} tone="good" />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <NaryTreeBoard nodes={s.nodes} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DistanceState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const label = (i: number | null) => (i !== null && s.nodes[i] ? s.nodes[i].label : '—');
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="target a" v={label(s.a)} />
      <InspectorRow k="target b" v={label(s.b)} />
      <InspectorRow k="active" v={label(s.active)} />
      <InspectorRow k="LCA" v={s.lca !== null ? label(s.lca) : '…'} />
      <InspectorRow k="BFS level" v={s.level ?? '—'} />
      <InspectorRow k="levelDist(lca,a)" v={s.distA ?? '…'} />
      <InspectorRow k="levelDist(lca,b)" v={s.distB ?? '…'} />
      <InspectorRow k="distance" v={s.answer ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-nary-tree-distance-of-two-nodes';
export const title = 'Find distance of two nodes';

// Shared sample tree (flat n-ary list; node 0 is the root):
//        1
//     /  |  \
//    2   3   4
//   / \      |
//  5   6     7
//  |
//  8
const SAMPLE_NODES: NaryNode[] = [
  { label: '1', children: [1, 2, 3] }, // 0
  { label: '2', children: [4, 5] },    // 1
  { label: '3', children: [] },        // 2
  { label: '4', children: [6] },       // 3
  { label: '5', children: [7] },       // 4
  { label: '6', children: [] },        // 5
  { label: '7', children: [] },        // 6
  { label: '8', children: [] },        // 7
];

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'nd1',
      label: 'dist(8, 7) → 5',
      value: { nodes: SAMPLE_NODES, a: 7, b: 6 },
    },
    {
      id: 'nd2',
      label: 'dist(8, 6) → 3',
      value: { nodes: SAMPLE_NODES, a: 7, b: 5 },
    },
  ] satisfies SampleInput<DistanceInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DistanceState | undefined;
    return s && s.answer !== null
      ? { ok: true, label: `distance ${s.answer}` }
      : { ok: false, label: 'no distance' };
  },
};

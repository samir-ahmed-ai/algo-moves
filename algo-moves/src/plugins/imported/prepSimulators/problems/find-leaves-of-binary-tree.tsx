import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailStack, RailResult } from '../../../_shared/vizKit';

interface LeavesInput {
  /** Level-order array; null marks an absent child slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface LeavesState {
  tree: (number | null)[];
  active: number | null; // node index currently being processed
  visited: number[]; // indices already assigned a height (done)
  height: (number | null)[]; // height per node index (null = not yet computed)
  layers: number[][]; // res: layers[h] = node VALUES grouped at height h
  removedLayer: number | null; // which layer index the active node just joined
  done: boolean;
}

function record({ tree }: LeavesInput): Frame<LeavesState>[] {
  const frames: Frame<LeavesState>[] = [];
  const height = new Array<number | null>(tree.length).fill(null);
  const visited: number[] = [];
  const layers: number[][] = [];

  const snap = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    removedLayer: number | null,
    done: boolean,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        active,
        visited: visited.slice(),
        height: height.slice(),
        layers: layers.map((l) => l.slice()),
        removedLayer,
        done,
      },
    });

  snap(
    'INIT',
    `${visited.length} placed`,
    `Find Leaves groups every node by its height — the distance to its farthest leaf. Leaves have height 0, their parents height 1, and so on. A post-order DFS computes each height from the children, then drops the node into layer[height].`,
    null,
    null,
    false,
  );

  // dfs returns the height of node index i, or -1 for a missing node (mirrors Go's nil -> -1).
  const dfs = (i: number): number => {
    if (i >= tree.length || tree[i] == null) return -1;

    snap(
      'ENTER',
      `node ${tree[i]}`,
      `Descend into node ${tree[i]}. Before we can place it we must know how tall its subtrees are, so recurse left then right first (post-order).`,
      i,
      null,
      false,
    );

    const left = dfs(2 * i + 1);
    const right = dfs(2 * i + 2);
    const h = Math.max(left, right) + 1; // leaf: max(-1,-1)+1 = 0

    if (h === layers.length) layers.push([]);
    layers[h].push(tree[i] as number);
    height[i] = h;
    visited.push(i);

    snap(
      'PLACE',
      `h=${h}`,
      `Node ${tree[i]}: left height ${left}, right height ${right}, so its height is max(${left}, ${right}) + 1 = ${h}. It joins layer ${h}${h === 0 ? ' (a leaf)' : ''}, which now reads [${layers[h].join(', ')}].`,
      i,
      h,
      false,
      h === 0 ? 'good' : undefined,
    );

    return h;
  };

  dfs(0);

  snap(
    'DONE',
    `${layers.length} layers`,
    `Every node is placed. The result peels the tree leaf-layer by leaf-layer: ${layers
      .map((l, idx) => `layer ${idx} = [${l.join(', ')}]`)
      .join(', ')}.`,
    null,
    null,
    true,
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<LeavesState>) {
  const s = frame.state;
  const activeSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (activeSet.has(i)) return 'team-2';
    return 'team-0';
  };
  const activeVal = s.active !== null ? s.tree[s.active] : null;
  const activeHeight = s.active !== null ? s.height[s.active] : null;
  const layerItems = s.layers.map((l, idx) => ({ label: `L${idx}[${l.join(',')}]`, tone: idx === s.removedLayer ? 'accent' as const : undefined }));
  const resultLabel = s.done ? s.layers.map((l) => `[${l.join(',')}]`).join('') : undefined;
  const rail = (
    <>
      <RailGroup label="node">
        <RailStat k="val" v={activeVal ?? '—'} tone="accent" />
        <RailStat k="h" v={activeHeight ?? '—'} />
        <RailStat k="placed" v={s.visited.length} />
      </RailGroup>
      <RailStack label="layers" items={layerItems} />
      {s.done && resultLabel !== undefined && <RailResult label="answer" value={resultLabel} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LeavesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const activeVal = s.active !== null ? s.tree[s.active] : null;
  const activeHeight = s.active !== null ? s.height[s.active] : null;
  return (
    <VarGrid>
      <InspectorRow k="active node" v={activeVal ?? '—'} />
      <InspectorRow k="height(active)" v={activeHeight ?? '—'} />
      <InspectorRow k="layer joined" v={s.removedLayer ?? '—'} />
      <InspectorRow k="layers so far" v={s.layers.length} />
      <InspectorRow k="placed" v={s.visited.length} />
      <InspectorRow
        k="result"
        v={s.done ? s.layers.map((l) => `[${l.join(',')}]`).join('') : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-find-leaves-of-binary-tree';
export const title = 'Find Leaves of Binary Tree';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'fl1', label: '[1,2,3,4,5]', value: { tree: [1, 2, 3, 4, 5] } },
    { id: 'fl2', label: '[1,2,3,null,4]', value: { tree: [1, 2, 3, null, 4] } },
  ] satisfies SampleInput<LeavesInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LeavesState | undefined;
    if (!s || s.layers.length === 0) return { ok: false, label: 'empty' };
    const label = s.layers.map((l) => `[${l.join(',')}]`).join('');
    return { ok: true, label };
  },
};

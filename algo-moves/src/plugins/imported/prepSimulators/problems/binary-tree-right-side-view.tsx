import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailStack, RailResult } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/TreeBoard';

interface RightViewInput {
  /** Level-order array; null marks an absent child. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface RightViewState {
  tree: (number | null)[];
  current: number | null; // node index being visited (null on INIT/DONE)
  depth: number | null; // depth of the current node
  visited: number[]; // node indices already entered by DFS
  res: number[]; // one value per depth: the first (rightmost) node seen there
  taken: number[]; // node indices whose value was pushed into res
  done: boolean;
}

function record({ tree }: RightViewInput): Frame<RightViewState>[] {
  const visited: number[] = [];
  const taken: number[] = [];
  const res: number[] = [];

  const { emit, frames } = createRecorder<RightViewState>(() => ({
    tree,
    current: null,
    depth: null,
    visited: visited.slice(),
    res: res.slice(),
    taken: taken.slice(),
    done: false,
  }));

  emit(
    'INIT',
    'root, depth 0',
    'Right Side View: standing to the right of the tree, which nodes can you see? Do a DFS that visits the RIGHT child before the left. The first node reached at each depth is the rightmost — record it.',
  );

  const dfs = (i: number, depth: number) => {
    if (i >= tree.length || tree[i] == null) return; // null node → nothing to see
    visited.push(i);
    const val = tree[i] as number;

    if (depth === res.length) {
      // First node encountered at this depth → it is the rightmost visible one.
      res.push(val);
      taken.push(i);
      emit(
        'RECORD',
        `depth ${depth} → ${val}`,
        `Depth ${depth} is new: res.length is now the depth we just reached, so this node (${val}) is the FIRST — and therefore rightmost — one seen at depth ${depth}. Record ${val}.`,
        { current: i, depth },
        'good',
      );
    } else {
      // A rightmost node at this depth was already recorded; this one is hidden.
      emit(
        'VISIT',
        `depth ${depth}, hidden`,
        `Node ${val} sits at depth ${depth}, but we already saw a node at that depth (${res[depth]}), which was further right. ${val} is hidden behind it — visit but do not record.`,
        { current: i, depth },
      );
    }

    dfs(2 * i + 2, depth + 1); // RIGHT child first
    dfs(2 * i + 1, depth + 1); // then left
  };

  dfs(0, 0);

  emit(
    'DONE',
    `[${res.join(', ')}]`,
    `DFS finished. Reading top-to-bottom, the rightmost node at each depth gives the right side view: [${res.join(', ')}].`,
    { done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<RightViewState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.current === i) return 'team-1';
    if (s.taken.includes(i)) return 'team-2';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  const curVal = s.current !== null ? s.tree[s.current] : null;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="node" v={curVal ?? '—'} tone="accent" />
        <RailStat k="depth" v={s.depth ?? '—'} />
      </RailGroup>
      <RailStack label="right view" items={s.res.map(String)} />
      {s.done && <RailResult label="answer" value={`[${s.res.join(', ')}]`} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<RightViewState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current !== null ? s.tree[s.current] : null;
  return (
    <VarGrid>
      <InspectorRow k="current node" v={curVal ?? '—'} />
      <InspectorRow k="depth" v={s.depth ?? '—'} />
      <InspectorRow k="res.length" v={s.res.length} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow k="right view" v={s.res.length ? `[${s.res.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-binary-tree-right-side-view';
export const title = 'Binary Tree Right Side View';

export const simulator: ProblemSimulator = {
  inputs: [
    // [1,2,3,null,5,null,4] → [1,3,4]
    { id: 'rv1', label: '[1,2,3,·,5,·,4]', value: { tree: [1, 2, 3, null, 5, null, 4] } },
    // [1,null,3] → [1,3]  (right-leaning chain)
    { id: 'rv2', label: '[1,·,3] right-leaning', value: { tree: [1, null, 3] } },
  ] satisfies SampleInput<RightViewInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RightViewState | undefined;
    const res = s?.res ?? [];
    return { ok: res.length > 0, label: `[${res.join(', ')}]` };
  },
};

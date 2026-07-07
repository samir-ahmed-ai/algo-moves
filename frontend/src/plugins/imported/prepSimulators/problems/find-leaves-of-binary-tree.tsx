import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder, railItem } from '../strictHelpers';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailStack,
  RailResult,
} from '../../../_shared/vizKit';

interface LeavesInput {
  /** Level-order array; null marks an absent child slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface LeavesState {
  tree: (number | null)[];
  active: number | null; // node index currently being processed
  visited: number[]; // indices already assigned a height (done)
  height: (number | null)[]; // height per node index (null = not yet computed)
  layers: number[][]; // res: layers[h]! = node VALUES grouped at height h
  removedLayer: number | null; // which layer index the active node just joined
  done: boolean;
}

function record({ tree }: LeavesInput): Frame<LeavesState>[] {
  const height = new Array<number | null>(tree.length).fill(null);
  const visited: number[] = [];
  const layers: number[][] = [];

  const { emit, frames } = createPrepRecorder<LeavesState>(() => ({
    tree: tree,
    visited: visited.slice(),
    height: height.slice(),
    layers: layers.map((l) => l.slice()),
    active: null,
    removedLayer: null,
    done: false,
  }));
  // renamed from snap

  emit(
    'INIT',
    `${visited.length} placed`,
    `Find Leaves groups every node by its height — the distance to its farthest leaf. Leaves have height 0, their parents height 1, and so on. A post-order DFS computes each height from the children, then drops the node into layer[height]!.`,
    { active: null, removedLayer: null, done: false },
  );

  // dfs returns the height of node index i, or -1 for a missing node (mirrors Go's nil -> -1).
  const dfs = (i: number): number => {
    if (i >= tree.length || tree[i]! == null) return -1;

    emit(
      'ENTER',
      `node ${tree[i]!}`,
      `Descend into node ${tree[i]!}. Before we can place it we must know how tall its subtrees are, so recurse left then right first (post-order).`,
      { active: i, removedLayer: null, done: false },
    );

    const left = dfs(2 * i + 1);
    const right = dfs(2 * i + 2);
    const h = Math.max(left, right) + 1; // leaf: max(-1,-1)+1 = 0

    if (h === layers.length) layers.push([]);
    layers[h]!.push(tree[i]! as number);
    height[i]! = h;
    visited.push(i);

    emit(
      'PLACE',
      `h=${h}`,
      `Node ${tree[i]!}: left height ${left}, right height ${right}, so its height is max(${left}, ${right}) + 1 = ${h}. It joins layer ${h}${h === 0 ? ' (a leaf)' : ''}, which now reads [${layers[h]!.join(', ')}].`,
      { active: i, removedLayer: h, done: false },
    );

    return h;
  };

  dfs(0);

  emit(
    'DONE',
    `${layers.length} layers`,
    `Every node is placed. The result peels the tree leaf-layer by leaf-layer: ${layers
      .map((l, idx) => `layer ${idx} = [${l.join(', ')}]`)
      .join(', ')}.`,
    { active: null, removedLayer: null, done: true },
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
  const activeVal = s.active !== null ? s.tree[s.active]! : null;
  const activeHeight = s.active !== null ? s.height[s.active]! : null;
  const layerItems = s.layers.map((l, idx) =>
    railItem(`L${idx}[${l.join(',')}]`, idx === s.removedLayer ? 'accent' : undefined),
  );
  const resultLabel = s.done ? s.layers.map((l) => `[${l.join(',')}]`).join('') : undefined;
  const rail = (
    <>
      <RailGroup label="node">
        <RailStat k="val" v={activeVal ?? '—'} tone="accent" />
        <RailStat k="h" v={activeHeight ?? '—'} />
        <RailStat k="placed" v={s.visited.length} />
      </RailGroup>
      <RailStack label="layers" items={layerItems} />
      {s.done && resultLabel !== undefined && (
        <RailResult label="answer" value={resultLabel} tone="good" />
      )}
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
  const activeVal = s.active !== null ? s.tree[s.active]! : null;
  const activeHeight = s.active !== null ? s.height[s.active]! : null;
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find Leaves of Binary Tree"?',
    choices: [
      {
        label: 'Height-based DFS — fits this problem',
        correct: true,
      },
      {
        label: 'Mirror compare — different approach',
      },
      {
        label: 'BFS + Column Map — different approach',
      },
      {
        label: 'Column map BFS — different approach',
      },
    ],
    explain: 'A node\'s "height" (distance to farthest leaf) determines which group it belongs to',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Find Leaves of Binary Tree), what strategy is established?',
    choices: [
      {
        label: 'A node\'s "height" (distance to farthest — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Find Leaves groups every node by its height — the distance to its farthest leaf. Leaves have height 0, their parents height 1, and so on. A post-order DFS computes each height from the children, then drops the node into layer[height]!.',
  },
  {
    id: 'key-step',
    prompt: 'On the "PLACE" step (h=), what happens?',
    choices: [
      {
        label: 'Node : left height , right — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain:
      'Node : left height , right height , so its height is max(, ) + 1 = . It joins layer , which now reads [].',
  },
  {
    id: 'state',
    prompt: 'What does the `active` field track in the visualization state?',
    choices: [
      {
        label: 'node index currently being processed — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain: 'The recorder keeps `active` in sync: node index currently being processed',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find Leaves of Binary Tree"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(h+k) time, O(h) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(n). O(n). A node\'s "height" (distance to farthest leaf) determines which group it belongs to; Leaves have height 0, their parents height 1, etc.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every node is placed. The result — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain:
      'Every node is placed. The result peels the tree leaf-layer by leaf-layer: ${layers\n      .map((l, idx) => ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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

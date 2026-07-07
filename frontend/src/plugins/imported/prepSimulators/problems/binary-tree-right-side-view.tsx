import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
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
import { TreeBoard } from '../../../../components/board/TreeBoard';

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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Binary Tree Right Side View"?',
    choices: [
      {
        label: 'DFS right-first — fits this problem',
        correct: true,
      },
      {
        label: 'Inorder DFS (find two inversions) — different approach',
      },
      {
        label: 'Post-order height — different approach',
      },
      {
        label: 'Tree build + iterative pre-order — different approach',
      },
    ],
    explain:
      'DFS: visit **right child first**, then left. First node at each depth is the rightmost.',
  },
  {
    id: 'key-step',
    prompt: 'On the "VISIT" step (depth , hidden), what happens?',
    choices: [
      {
        label: 'Node sits at depth , but — this move caption',
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
      'Node  sits at depth , but we already saw a node at that depth (), which was further right.  is hidden behind it — visit but do not record.',
  },
  {
    id: 'state',
    prompt: 'What does the `current` field track in the visualization state?',
    choices: [
      {
        label: 'node index being visited (null — updated each frame',
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
    explain: 'The recorder keeps `current` in sync: node index being visited (null on INIT/DONE)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Binary Tree Right Side View"?',
    choices: [
      {
        label: 'O(n) time, O(h) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(h) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(n). O(h). DFS: visit **right child first**, then left. First node at each depth is the rightmost.; If `depth == len(res)`, this is the first node seen at this depth → add',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'DFS finished. Reading top-to-bottom — final DONE caption',
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
      'DFS finished. Reading top-to-bottom, the rightmost node at each depth gives the right side view: [].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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

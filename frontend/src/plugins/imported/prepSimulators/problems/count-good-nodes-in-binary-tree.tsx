import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { createPrepRecorder } from '../strictHelpers';
import {
  InspectorRow,
  RailGroup,
  RailResult,
  RailStat,
  VarGrid,
  VizEmpty,
  VizStage,
} from '../../../_shared/vizKit';

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
  const good: number[] = [];
  const visited: number[] = [];
  let count = 0;

  const { emit, frames } = createPrepRecorder<GoodNodesState>(() => ({
    tree,
    current: null,
    maxVal: null,
    good: good.slice(),
    visited: visited.slice(),
    count,
    done: false,
  }));

  const rootVal = tree[0]!;

  emit(
    'INIT',
    'start DFS',
    `Count Good Nodes: a node is "good" when no ancestor on its root path has a strictly greater value. We DFS from the root carrying maxVal = the greatest value seen so far on the path. Seed maxVal with the root's value ${rootVal ?? '—'}.`,
    { current: 0, maxVal: rootVal ?? null },
  );

  // Faithful re-implementation of the Go dfs(node, maxVal) -> int.
  const dfs = (i: number, maxVal: number): number => {
    if (i >= tree.length || tree[i]! == null) return 0;
    const val = tree[i]! as number;

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
  const rail = (
    <>
      <RailGroup label="path">
        <RailStat k="maxVal" v={s.maxVal ?? '—'} tone="accent" />
        <RailStat k="good" v={s.count} tone={s.count > 0 ? 'good' : undefined} />
      </RailGroup>
      {s.done && <RailResult label="answer" value={s.count} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<GoodNodesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current !== null ? s.tree[s.current]! : null;
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Count Good Nodes in Binary Tree"?',
    choices: [
      {
        label: 'DFS with max tracking — fits this problem',
        correct: true,
      },
      {
        label: 'BFS levels — different approach',
      },
      {
        label: 'BFS + Direction Toggle — different approach',
      },
      {
        label: 'Inorder DFS (find two inversions) — different approach',
      },
    ],
    explain: 'DFS passing `maxVal` seen so far on the path from root',
  },
  {
    id: 'key-step',
    prompt: 'On the "SKIP" step ( < ), what happens?',
    choices: [
      {
        label: 'Visit node . maxVal on this — this move caption',
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
      'Visit node . maxVal on this path is , and  < , so an ancestor is larger — node  is NOT good. Carry maxVal =  unchanged into its children.',
  },
  {
    id: 'state',
    prompt: 'What does the `current` field track in the visualization state?',
    choices: [
      {
        label: 'node index being visited — updated each frame',
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
    explain: 'The recorder keeps `current` in sync: node index being visited',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Count Good Nodes in Binary Tree"?',
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
      "O(n). O(h). DFS passing `maxVal` seen so far on the path from root; If `node.Val >= maxVal`, it's good; update `maxVal`",
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'DFS is complete. Every path — final DONE caption',
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
      'DFS is complete. Every path was checked against its running maximum, giving  good node in the tree. Time O(n) — one visit per node; Space O(h) — the recursion stack is as deep as the tree.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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

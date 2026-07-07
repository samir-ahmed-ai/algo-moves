import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SumOfNodesInput {
  // Level-order binary tree; null marks an absent slot. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
}

interface SumOfNodesState {
  tree: (number | null)[];
  current: number | null; // node index currently being visited
  visited: number[]; // indices whose subtree DFS has fully returned
  total: number; // running total of every value summed so far
  lastSubtree: number | null; // sum just returned by the most recent subtree
  done: boolean;
}

function record({ tree }: SumOfNodesInput): Frame<SumOfNodesState>[] {
  const visited: number[] = [];
  let total = 0;

  const { emit, frames } = createPrepRecorder<SumOfNodesState>(() => ({
    tree,
    current: null,
    visited: visited.slice(),
    total,
    lastSubtree: null,
    done: false,
  }));

  emit(
    'INIT',
    'start DFS',
    `Sum of Nodes: total the value of every node. DFS the tree so each node returns node.val + sum(left) + sum(right); a missing (nil) child contributes 0. Start at the root.`,
    { current: tree.length > 0 && tree[0]! != null ? 0 : null },
  );

  // Faithful re-implementation of the Go sumOfNodes(root) -> int.
  const dfs = (i: number): number => {
    if (i >= tree.length || tree[i]! == null) {
      emit(
        'NIL',
        'nil -> 0',
        `Reached an empty (nil) child. There is nothing to add here, so this branch returns 0.`,
        { current: null },
      );
      return 0;
    }
    const val = tree[i]! as number;

    emit(
      'VISIT',
      `visit ${val}`,
      `Visit node ${val}. Its subtree sum is ${val} + sum(left) + sum(right). Descend into the left child first.`,
      { current: i },
    );

    const left = dfs(2 * i + 1);
    emit(
      'LEFT',
      `left=${left}`,
      `Left subtree of node ${val} summed to ${left}. Now descend into the right child.`,
      { current: i, lastSubtree: left },
    );

    const right = dfs(2 * i + 2);
    emit(
      'RIGHT',
      `right=${right}`,
      `Right subtree of node ${val} summed to ${right}. Both children are done, so add this node's own value.`,
      { current: i, lastSubtree: right },
    );

    const subtree = val + left + right;
    total += val;
    visited.push(i);
    emit(
      'RETURN',
      `${val}+${left}+${right}=${subtree}`,
      `Node ${val}'s subtree total is ${val} + ${left} + ${right} = ${subtree}. Running total of visited values is now ${total}. Return ${subtree} up to the parent.`,
      { current: i, lastSubtree: subtree },
      'good',
    );

    return subtree;
  };

  const answer = dfs(0);

  emit(
    'DONE',
    `sum=${answer}`,
    `DFS is complete. Every node was added exactly once, giving a total of ${answer}. Time O(n) — one visit per node; Space O(h) — the recursion stack is as deep as the tree.`,
    { current: null, total: answer, lastSubtree: answer, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SumOfNodesState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.current === i) return 'team-1';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  const curVal = s.current !== null ? s.tree[s.current]! : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        node = <span className="font-mono text-ink">{curVal ?? '—'}</span>
        {' · '}running total = <span className="font-mono text-good">{s.total}</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        green ring = current · filled = summed · each node returns val + sum(L) + sum(R), nil {'->'}{' '}
        0
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SumOfNodesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current !== null ? s.tree[s.current]! : null;
  const nodeCount = s.tree.filter((v) => v != null).length;
  return (
    <VarGrid>
      <InspectorRow k="node.val" v={curVal ?? '—'} />
      <InspectorRow k="last subtree" v={s.lastSubtree ?? '—'} />
      <InspectorRow k="running total" v={s.total} />
      <InspectorRow k="visited" v={`${s.visited.length} / ${nodeCount}`} />
      <InspectorRow k="answer" v={s.done ? s.total : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-sum-of-nodes';
export const title = 'Sum of nodes';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Sum of nodes"?',
    choices: [
      {
        label: 'DFS sum — fits this problem',
        correct: true,
      },
      {
        label: 'BFS + Sort per column — different approach',
      },
      {
        label: 'BST range check — different approach',
      },
      {
        label: 'DFS right-first — different approach',
      },
    ],
    explain: 'Total = value + left total + right total',
  },
  {
    id: 'key-step',
    prompt: 'On the "RIGHT" step (right=), what happens?',
    choices: [
      {
        label: 'Right subtree of node summed — this move caption',
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
      "Right subtree of node  summed to . Both children are done, so add this node's own value.",
  },
  {
    id: 'state',
    prompt: 'What does the `current` field track in the visualization state?',
    choices: [
      {
        label: 'node index currently being visited — updated each frame',
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
    explain: 'The recorder keeps `current` in sync: node index currently being visited',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Sum of nodes"?',
    choices: [
      {
        label: 'O(n) time, O(h) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(1) amortized time, O(h) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(h). nil->0; val+sum(L)+sum(R)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'DFS is complete. Every node — final DONE caption',
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
      'DFS is complete. Every node was added exactly once, giving a total of . Time O(n) — one visit per node; Space O(h) — the recursion stack is as deep as the tree.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'sn1', label: '[1,2,3,4,5,6,7]', value: { tree: [1, 2, 3, 4, 5, 6, 7] } },
    { id: 'sn2', label: '[5,3,8,null,4,null,10]', value: { tree: [5, 3, 8, null, 4, null, 10] } },
  ] satisfies SampleInput<SumOfNodesInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SumOfNodesState | undefined;
    const v = s?.total ?? 0;
    return { ok: true, label: `sum = ${v}` };
  },
};

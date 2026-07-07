import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/board/TreeBoard';

// Level-order array; null marks an absent slot. Children of i are 2i+1, 2i+2.
type LevelOrderTree = (number | null)[];

interface PathSumInput {
  tree: LevelOrderTree;
}

interface PathSumState {
  tree: LevelOrderTree;
  active: number | null; // node index currently being processed (post-order)
  visited: number[]; // node indices whose gain has been computed
  left: number | null; // floored gain coming up from the left child
  right: number | null; // floored gain coming up from the right child
  through: number | null; // best path THROUGH this node: val + left + right
  best: number; // running global maximum path sum
  gain: number | null; // value this node returns to its parent: val + max(left, right)
  result: number | null; // final answer, set on the DONE frame
  done: boolean;
}

const NEG_INF = -(2 ** 31);

const leftChild = (i: number) => 2 * i + 1;
const rightChild = (i: number) => 2 * i + 2;

function record({ tree }: PathSumInput): Frame<PathSumState>[] {
  const visited: number[] = [];
  let best = NEG_INF;

  const { emit, frames } = createPrepRecorder<PathSumState>(() => ({
    tree,
    active: null,
    visited: visited.slice(),
    left: null,
    right: null,
    through: null,
    best,
    gain: null,
    result: null,
    done: false,
  }));

  const present = (i: number) => i >= 0 && i < tree.length && tree[i]! != null;

  emit(
    'INIT',
    'best = -inf',
    'Binary Tree Maximum Path Sum: a path is any sequence of connected nodes, counted once. We run a post-order DFS so every node already knows its children before we decide anything.',
    {},
  );

  // Post-order DFS. Returns the max gain this subtree can contribute to a path
  // that continues up through its parent (a single downward branch).
  const dfs = (i: number): number => {
    if (!present(i)) return 0;
    const val = tree[i]! as number;

    const l = dfs(leftChild(i));
    const r = dfs(rightChild(i));

    // Floor negative branch gains at 0 — a negative branch is worse than skipping it.
    const left = l < 0 ? 0 : l;
    const right = r < 0 ? 0 : r;

    emit(
      'VISIT',
      `node ${val}`,
      `Post-order visit of node ${val}. Its left branch offers gain ${left} (raw ${l}${l < 0 ? ', floored to 0' : ''}) and its right branch offers gain ${right} (raw ${r}${r < 0 ? ', floored to 0' : ''}). Negative branches are floored to 0 because skipping them beats subtracting.`,
      { active: i, left, right },
    );

    // The best path with node i as its highest point (turning point) uses BOTH branches.
    const through = val + left + right;
    if (through > best) {
      best = through;
      emit(
        'BEST',
        `best = ${best}`,
        `A path turning at node ${val} is worth ${val} + ${left} + ${right} = ${through}. That beats the previous best, so the global maximum is now ${best}.`,
        { active: i, left, right, through, best },
        'good',
      );
    } else {
      emit(
        'THROUGH',
        `through = ${through}`,
        `A path turning at node ${val} is worth ${val} + ${left} + ${right} = ${through}, which does not beat the current best of ${best}. Leave the global maximum unchanged.`,
        { active: i, left, right, through, best },
      );
    }

    // But a path continuing UP to the parent can only take ONE branch.
    const gain = val + Math.max(left, right);
    visited.push(i);
    emit(
      'RETURN',
      `return ${gain}`,
      `To hand upward, node ${val} may keep only one branch, so it returns ${val} + max(${left}, ${right}) = ${gain} to its parent.`,
      { active: i, left, right, gain },
    );

    return gain;
  };

  dfs(0);

  emit(
    'DONE',
    `answer = ${best}`,
    `Every node has been visited in post-order. The largest path sum found anywhere in the tree is ${best}.`,
    { result: best, best, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PathSumState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (visitedSet.has(i)) return 'team-2';
    return 'team-0';
  };
  const activeVal = s.active !== null ? s.tree[s.active]! : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        best = <span className="font-mono text-ink">{s.best === NEG_INF ? '−∞' : s.best}</span>
        {activeVal != null && (
          <>
            {' · '}at node <span className="font-mono text-ink">{activeVal}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.active !== null && s.left !== null && s.right !== null ? (
          <>
            left {s.left} · right {s.right}
            {s.through !== null && <> · through {s.through}</>}
            {s.gain !== null && <> · return {s.gain}</>}
          </>
        ) : (
          'post-order DFS'
        )}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PathSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const activeVal = s.active !== null ? s.tree[s.active]! : null;
  return (
    <VarGrid>
      <InspectorRow k="node" v={activeVal ?? '—'} />
      <InspectorRow k="left gain" v={s.left ?? '—'} />
      <InspectorRow k="right gain" v={s.right ?? '—'} />
      <InspectorRow k="through (val+L+R)" v={s.through ?? '—'} />
      <InspectorRow k="return (val+max)" v={s.gain ?? '—'} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow k="best" v={s.best === NEG_INF ? '−∞' : s.best} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-binary-tree-maximum-path-sum';
export const title = 'Binary Tree Maximum Path Sum';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Binary Tree Maximum Path Sum"?',
    choices: [
      {
        label: 'Post-order DFS — fits this problem',
        correct: true,
      },
      {
        label: 'Mirror compare — different approach',
      },
      {
        label: 'BFS + Direction Toggle — different approach',
      },
      {
        label: 'Column map BFS — different approach',
      },
    ],
    explain:
      'Post-order DFS: at each node, compute `left` and `right` subtree max gains (floor at 0 to drop negatives)',
  },
  {
    id: 'key-step',
    prompt: 'On the "THROUGH" step (through = ), what happens?',
    choices: [
      {
        label: 'A path turning at node — this move caption',
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
      'A path turning at node  is worth  +  +  = , which does not beat the current best of . Leave the global maximum unchanged.',
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
    explain:
      'The recorder keeps `active` in sync: node index currently being processed (post-order)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Binary Tree Maximum Path Sum"?',
    choices: [
      {
        label: 'O(n) time, O(h) space — standard bounds here',
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
      'O(n). O(h). Post-order DFS: at each node, compute `left` and `right` subtree max gains (floor at 0 to drop negatives); Update global max with `node.Val + left + right` (the',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every node has been visited — final DONE caption',
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
      'Every node has been visited in post-order. The largest path sum found anywhere in the tree is .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'bmps1',
      label: '[-10,9,20,null,null,15,7] → 42',
      value: { tree: [-10, 9, 20, null, null, 15, 7] },
    },
    { id: 'bmps2', label: '[1,2,3] → 6', value: { tree: [1, 2, 3] } },
  ] satisfies SampleInput<PathSumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PathSumState | undefined;
    return s?.result != null
      ? { ok: true, label: `max path = ${s.result}` }
      : { ok: false, label: 'no result' };
  },
};

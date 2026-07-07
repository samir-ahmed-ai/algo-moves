import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface KthLargestInput {
  /** Level-order array of the BST; null marks an absent child. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
  k: number;
}

interface KthLargestState {
  tree: (number | null)[];
  k: number; // the original k (for display)
  kLeft: number; // remaining countdown (Go's mutating k)
  active: number | null; // node currently being visited (index into tree)
  visited: number[]; // indices already counted (reverse-inorder order)
  ans: number | null; // answer once found
  done: boolean;
}

function record({ tree, k }: KthLargestInput): Frame<KthLargestState>[] {
  const visited: number[] = [];
  let kLeft = k;
  let ans: number | null = null;

  const { emit, frames } = createRecorder<KthLargestState>(() => ({
    tree,
    k,
    kLeft,
    active: null,
    visited: visited.slice(),
    ans,
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `Find the ${k}${ordinal(k)} largest value in the BST. A reverse in-order walk (right → node → left) visits values in descending order, so the ${k}${ordinal(k)} node we touch is the answer. Time O(h+k), Space O(h).`,
    { active: 0 },
  );

  // Reverse in-order DFS, mirroring the Go solution's mutating `k`.
  const dfs = (i: number): void => {
    if (i >= tree.length || tree[i] == null || kLeft === 0) return;

    const right = 2 * i + 2;
    const left = 2 * i + 1;
    const val = tree[i] as number;

    emit(
      'DESCEND',
      `enter ${val}`,
      `Enter node ${val}. Reverse in-order means we recurse into the RIGHT subtree first (larger values) before counting this node.`,
      { active: i },
    );

    dfs(right);
    if (kLeft === 0) return; // answer already found deeper on the right

    // Visit this node: k--
    kLeft--;
    visited.push(i);
    if (kLeft === 0) {
      ans = val;
      emit(
        'VISIT',
        `${val} is #${k}`,
        `Count node ${val}: this is the ${k}${ordinal(k)} largest value visited, so k has reached 0. The answer is ${val}.`,
        { active: i, ans: val, done: true },
        'good',
      );
      return;
    }

    emit(
      'VISIT',
      `count ${val}`,
      `Count node ${val} — that is the ${visited.length}${ordinal(visited.length)} largest so far. k drops to ${kLeft}, so keep going: now recurse into the LEFT subtree (smaller values).`,
      { active: i },
    );

    dfs(left);
  };

  dfs(0);

  if (ans === null) {
    emit(
      'DONE',
      'not found',
      `The whole tree was walked but fewer than ${k} nodes exist, so there is no ${k}${ordinal(k)} largest value.`,
      { done: true },
      'bad',
    );
  }

  return frames;
}

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return 'st';
  if (rem10 === 2 && rem100 !== 12) return 'nd';
  if (rem10 === 3 && rem100 !== 13) return 'rd';
  return 'th';
}

function View({ frame }: PluginViewProps<KthLargestState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number): string => {
    if (s.active === i && !s.done) return 'team-1';
    if (visitedSet.has(i)) return 'team-2';
    if (s.done && s.active === i) return 'team-1';
    return 'team-0';
  };
  const descending = s.visited.map((i) => s.tree[i] as number);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {' · '}remaining = <span className="font-mono text-ink">{s.kLeft}</span>
        {' · '}visit right → node → left (descending)
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        seen: {descending.length ? descending.join(' → ') : '·'}
      </div>
      {s.ans !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → {s.k}
          {ordinal(s.k)} largest = {s.ans}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<KthLargestState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="k remaining" v={s.kLeft} />
      <InspectorRow k="node" v={s.active !== null ? (s.tree[s.active] ?? '—') : '—'} />
      <InspectorRow k="counted" v={s.visited.length} />
      <InspectorRow k="answer" v={s.ans ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-find-kth-largest-in-bst';
export const title = 'Find Kth largest in BST';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find Kth largest in BST"?',
    choices: [
      {
        label: 'Reverse inorder — fits this problem',
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
    explain: 'Right-node-left visit lists values descending; stop at the kth',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Find Kth largest in BST), what strategy is established?',
    choices: [
      {
        label: 'Right-node-left visit lists values — described in INIT caption',
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
      'Find the  largest value in the BST. A reverse in-order walk (right → node → left) visits values in descending order, so the  node we touch is the answer. Time O(h+k), Space O(h).',
  },
  {
    id: 'key-step',
    prompt: 'On the "VISIT" step ( is #), what happens?',
    choices: [
      {
        label: 'Count node : this — this move caption',
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
    explain: 'Count node : this is the  largest value visited, so k has reached 0. The answer is .',
  },
  {
    id: 'state',
    prompt: 'What does the `k` field track in the visualization state?',
    choices: [
      {
        label: 'the original k (for display) — updated each frame',
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
    explain: 'The recorder keeps `k` in sync: the original k (for display)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find Kth largest in BST"?',
    choices: [
      {
        label: 'O(h+k) time, O(h) space — standard bounds here',
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
    explain: 'O(h+k). O(h). dfs right; k--; k==0 -> ans; dfs left',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Count node — — final DONE caption',
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
      'Count node  — that is the  largest so far. k drops to , so keep going: now recurse into the LEFT subtree (smaller values).',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    // BST level-order:        5
    //                       /   \
    //                      3     8
    //                     / \   / \
    //                    2   4 7   9
    { id: 'kb1', label: '[5,3,8,2,4,7,9], k=2', value: { tree: [5, 3, 8, 2, 4, 7, 9], k: 2 } },
    // BST level-order:        4
    //                       /   \
    //                      2     6
    //                     / \   / \
    //                    1   3 5   7
    { id: 'kb2', label: '[4,2,6,1,3,5,7], k=3', value: { tree: [4, 2, 6, 1, 3, 5, 7], k: 3 } },
  ] satisfies SampleInput<KthLargestInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as KthLargestState | undefined;
    return s && s.ans !== null
      ? { ok: true, label: `${s.k}${ordinal(s.k)} largest = ${s.ans}` }
      : { ok: false, label: 'not found' };
  },
};

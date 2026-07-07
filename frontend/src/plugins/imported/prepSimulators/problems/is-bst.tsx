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

interface IsBstInput {
  // Level-order array; null marks an absent child slot. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
}

interface IsBstState {
  tree: (number | null)[];
  cur: number | null; // node index currently being checked
  lo: number | null; // exclusive lower bound (node.Val must be > lo), null = -inf
  hi: number | null; // exclusive upper bound (node.Val must be < hi), null = +inf
  visited: number[]; // node indices that passed their bound check
  failed: number | null; // node index that violated its bound
  done: boolean;
  answer: boolean | null; // final verdict once known
}

const INF = null;

function record({ tree }: IsBstInput): Frame<IsBstState>[] {
  const visited: number[] = [];
  let failed: number | null = null;

  const { emit, frames } = createPrepRecorder<IsBstState>(() => ({
    tree,
    cur: null,
    lo: INF,
    hi: INF,
    visited: [...visited],
    failed,
    done: false,
    answer: null,
  }));

  const bound = (v: number | null) => (v === null ? '∞' : `${v}`);

  emit(
    'INIT',
    'check bounds',
    `Is BST: a tree is a valid BST when every node sits strictly inside an open (lo, hi) window. We walk top-down; the window collapses inward — going left tightens hi to the node's value, going right tightens lo. Start at the root with the widest window (−∞, +∞).`,
    {},
  );

  // Faithful port of the Go `valid(node, lo, hi)` recursion. Because the Go code
  // passes *TreeNode bounds, an empty slot never contributes a bound, matching
  // our level-order layout where null children are simply skipped.
  const valid = (i: number, lo: number | null, hi: number | null): boolean => {
    if (i >= tree.length || tree[i]! === null) return true;
    const val = tree[i]! as number;

    emit(
      'VISIT',
      `node ${val} ∈ (${bound(lo)}, ${bound(hi)})?`,
      `Visit node ${val}. Its allowed window is (${bound(lo)}, ${bound(hi)}). To be a valid BST node it must satisfy ${bound(lo)} < ${val} < ${bound(hi)}.`,
      { cur: i, lo, hi },
    );

    if (lo !== null && val <= lo) {
      failed = i;
      emit(
        'FAIL',
        `${val} ≤ ${lo}`,
        `Node ${val} is not greater than its lower bound ${lo} (needs ${val} > ${lo}). It lies to the right of an ancestor whose value it must exceed, so this is NOT a BST.`,
        { cur: i, lo, hi, failed: i, done: true, answer: false },
        'bad',
      );
      return false;
    }
    if (hi !== null && val >= hi) {
      failed = i;
      emit(
        'FAIL',
        `${val} ≥ ${hi}`,
        `Node ${val} is not less than its upper bound ${hi} (needs ${val} < ${hi}). It lies to the left of an ancestor whose value it must undercut, so this is NOT a BST.`,
        { cur: i, lo, hi, failed: i, done: true, answer: false },
        'bad',
      );
      return false;
    }

    visited.push(i);
    emit(
      'PASS',
      `${val} ok`,
      `Node ${val} fits its window ${bound(lo)} < ${val} < ${bound(hi)}. Recurse: the left subtree inherits hi = ${val} (everything left must stay below ${val}); the right subtree inherits lo = ${val} (everything right must stay above ${val}).`,
      { cur: i, lo, hi },
      'good',
    );

    // left gets hi = node, right gets lo = node
    return valid(2 * i + 1, lo, val) && valid(2 * i + 2, val, hi);
  };

  const ok = valid(0, INF, INF);

  if (ok) {
    emit(
      'DONE',
      'valid BST',
      `Every node passed its (lo, hi) window on the way down, so the whole tree is a valid binary search tree.`,
      { done: true, answer: true },
      'good',
    );
  }

  return frames;
}

function View({ frame }: PluginViewProps<IsBstState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const bound = (v: number | null) => (v === null ? '∞' : `${v}`);

  const nodeClass = (i: number) => {
    if (s.failed === i) return 'team-1';
    if (s.cur === i) return 'team-1';
    if (visitedSet.has(i)) return 'team-2';
    return 'team-0';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        window ={' '}
        <span className="font-mono text-ink">
          ({bound(s.lo)}, {bound(s.hi)})
        </span>
        {s.cur !== null && s.tree[s.cur]! !== null && !s.done && (
          <>
            {' · '}node = <span className="font-mono text-ink">{s.tree[s.cur]!}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.cur} />
      {s.answer !== null && (
        <div className={cn('mt-1 font-mono', vizText.base, s.answer ? 'text-good' : 'text-bad')}>
          → {s.answer ? 'valid BST' : 'not a BST'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<IsBstState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.cur !== null ? s.tree[s.cur]! : null;
  return (
    <VarGrid>
      <InspectorRow k="node" v={curVal ?? '—'} />
      <InspectorRow k="lo (exclusive)" v={s.lo === null ? '−∞' : s.lo} />
      <InspectorRow k="hi (exclusive)" v={s.hi === null ? '+∞' : s.hi} />
      <InspectorRow k="checked" v={s.visited.length} />
      <InspectorRow k="result" v={s.answer === null ? '…' : s.answer ? 'valid BST' : 'not a BST'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-is-bst';
export const title = 'Is BST';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Is BST"?',
    choices: [
      {
        label: 'BST range check — fits this problem',
        correct: true,
      },
      {
        label: 'Level order fill — different approach',
      },
      {
        label: 'DFS right-first — different approach',
      },
      {
        label: 'Post-order leaves — different approach',
      },
    ],
    explain: 'Each node must sit inside an open (lo,hi) window narrowed on the way down',
  },
  {
    id: 'key-step',
    prompt: 'On the "FAIL" step ( ≥ ), what happens?',
    choices: [
      {
        label: 'Node is not less than — this move caption',
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
      'Node  is not less than its upper bound  (needs  < ). It lies to the left of an ancestor whose value it must undercut, so this is NOT a BST.',
  },
  {
    id: 'state',
    prompt: 'What does the `cur` field track in the visualization state?',
    choices: [
      {
        label: 'node index currently being checked — updated each frame',
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
    explain: 'The recorder keeps `cur` in sync: node index currently being checked',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Is BST"?',
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
    explain: 'O(n). O(h). left gets hi=node, right gets lo=node',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Node fits its window < < — final DONE caption',
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
      'Node  fits its window  <  < . Recurse: the left subtree inherits hi =  (everything left must stay below ); the right subtree inherits lo =  (everything right must stay above ).',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    // A valid BST:            5
    //                       /   \
    //                      3     8
    //                     / \   / \
    //                    2   4 7   9
    { id: 'bst-valid', label: 'valid BST', value: { tree: [5, 3, 8, 2, 4, 7, 9] } },
    // Invalid: 6 sits in the left subtree of 5 but exceeds it.
    //                        5
    //                       / \
    //                      3   8
    //                     / \
    //                    1   6
    { id: 'bst-invalid', label: 'not a BST (6 > 5)', value: { tree: [5, 3, 8, 1, 6] } },
  ] satisfies SampleInput<IsBstInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IsBstState | undefined;
    if (!s || s.answer === null) return { ok: false, label: 'not a BST' };
    return s.answer ? { ok: true, label: 'valid BST' } : { ok: false, label: 'not a BST' };
  },
};

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

interface SymmetricInput {
  // Level-order array; null marks an absent slot. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
}

interface SymmetricState {
  tree: (number | null)[];
  a: number | null; // level-order index of the left-side node under compare
  b: number | null; // level-order index of the right-side node under compare
  visited: number[]; // indices already confirmed matched
  result: boolean | null; // final answer, once known
  done: boolean;
}

const childL = (i: number) => 2 * i + 1;
const childR = (i: number) => 2 * i + 2;

function valAt(tree: (number | null)[], i: number): number | null {
  if (i < 0 || i >= tree.length) return null;
  return tree[i]!;
}

function record({ tree }: SymmetricInput): Frame<SymmetricState>[] {
  const visited: number[] = [];

  const { emit, frames } = createPrepRecorder<SymmetricState>(() => ({
    tree,
    a: null,
    b: null,
    visited: visited.slice(),
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    'mirror(root,root)',
    `Is Symmetric: a tree is symmetric when its left subtree mirrors its right subtree. We compare the tree against itself with mirror(a, b), where a walks down-left while b walks down-right.`,
    {},
  );

  // mirror(a,b): a and b are level-order indices (or -1 for a nil node).
  let answer = true;
  const mirror = (a: number, b: number): boolean => {
    const va = valAt(tree, a);
    const vb = valAt(tree, b);
    const aNil = va === null;
    const bNil = vb === null;

    if (aNil && bNil) {
      emit(
        'BOTH_NIL',
        'nil == nil',
        `Both sides are empty here, so this pair mirrors trivially — return true and step back up.`,
        { a: aNil ? null : a, b: bNil ? null : b },
        'good',
      );
      return true;
    }
    if (aNil || bNil) {
      emit(
        'SHAPE',
        'one nil',
        `One side has a node and the other is empty, so the shapes differ — this pair fails, the whole tree is not symmetric.`,
        { a: aNil ? null : a, b: bNil ? null : b },
        'bad',
      );
      return false;
    }
    if (va !== vb) {
      emit(
        'VAL',
        `${va} != ${vb}`,
        `Both sides have a node, but the values differ (${va} vs ${vb}) — the mirror breaks, so the tree is not symmetric.`,
        { a, b },
        'bad',
      );
      return false;
    }

    emit(
      'MATCH',
      `${va} == ${vb}`,
      `Values match (${va} == ${vb}). Now recurse the mirrored way: compare a.left with b.right, and a.right with b.left.`,
      { a, b },
      'good',
    );
    visited.push(a);
    if (b !== a) visited.push(b);

    return mirror(childL(a), childR(b)) && mirror(childR(a), childL(b));
  };

  answer = mirror(0, 0);

  emit(
    answer ? 'DONE' : 'FAIL',
    answer ? 'symmetric' : 'not symmetric',
    answer
      ? `Every mirrored pair matched all the way down, so the tree reads the same forwards and backwards — it is symmetric.`
      : `A mirrored pair failed, so the tree cannot be folded onto itself — it is not symmetric.`,
    { result: answer, done: true },
    answer ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SymmetricState>) {
  const s = frame.state;
  const nodeClass = (i: number): string => {
    if (s.a === i || s.b === i) return 'team-1';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  const active = s.a !== null ? s.a : s.b !== null ? s.b : null;
  const label = s.result === null ? 'comparing…' : s.result ? 'symmetric' : 'not symmetric';
  const labelTone = s.result === null ? 'text-ink' : s.result ? 'text-good' : 'text-bad';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        mirror compare · <span className={cn('font-mono', labelTone)}>{label}</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={active} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        team-1 = pair under compare · team-2 = matched
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SymmetricState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const av = s.a !== null ? s.tree[s.a]! : null;
  const bv = s.b !== null ? s.tree[s.b]! : null;
  return (
    <VarGrid>
      <InspectorRow k="a (left-walk)" v={s.a ?? '—'} />
      <InspectorRow k="a.val" v={av ?? 'nil'} />
      <InspectorRow k="b (right-walk)" v={s.b ?? '—'} />
      <InspectorRow k="b.val" v={bv ?? 'nil'} />
      <InspectorRow k="matched" v={s.visited.length} />
      <InspectorRow
        k="result"
        v={s.result === null ? '…' : s.result ? 'symmetric' : 'not symmetric'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-is-symmetric';
export const title = 'Is symmetric';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Is symmetric"?',
    choices: [
      {
        label: 'Mirror compare — fits this problem',
        correct: true,
      },
      {
        label: 'Recursive DFS — different approach',
      },
      {
        label: 'Mid divide BST — different approach',
      },
      {
        label: 'Two Paths + LCA via Common Prefix — different approach',
      },
    ],
    explain: 'Fold the tree; left subtree must mirror the right',
  },
  {
    id: 'key-step',
    prompt: 'On the "MATCH" step ( == ), what happens?',
    choices: [
      {
        label: 'Values match ( == ). Now — this move caption',
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
      'Values match ( == ). Now recurse the mirrored way: compare a.left with b.right, and a.right with b.left.',
  },
  {
    id: 'state',
    prompt: 'What does the `a` field track in the visualization state?',
    choices: [
      {
        label: 'level-order index of the left-side — updated each frame',
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
      'The recorder keeps `a` in sync: level-order index of the left-side node under compare',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Is symmetric"?',
    choices: [
      {
        label: 'O(n) time, O(h) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(h). mirror(a.Left,b.Right) && mirror(a.Right,b.Left)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Values match ( == ). Now — final DONE caption',
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
      'Values match ( == ). Now recurse the mirrored way: compare a.left with b.right, and a.right with b.left.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    // 4.7 classic symmetric: [1, 2,2, 3,4,4,3]
    { id: 'sym1', label: '[1,2,2,3,4,4,3] symmetric', value: { tree: [1, 2, 2, 3, 4, 4, 3] } },
    // asymmetric: matching shape but mismatched values [1, 2,2, null,3,null,3]
    {
      id: 'sym2',
      label: '[1,2,2,·,3,·,3] not symmetric',
      value: { tree: [1, 2, 2, null, 3, null, 3] },
    },
  ] satisfies SampleInput<SymmetricInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SymmetricState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'symmetric' : 'not symmetric' };
  },
};

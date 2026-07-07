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

interface BstInput {
  nums: number[];
}

interface BstState {
  nums: number[];
  /** Level-order BST built so far; null = empty slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
  l: number | null; // current sub-array left bound
  r: number | null; // current sub-array right bound
  m: number | null; // current mid = (l+r)/2, becomes this subtree's root
  pos: number | null; // heap index the current root lands at
  done: number[]; // heap indices already finalized as nodes
  finished: boolean;
}

function record({ nums }: BstInput): Frame<BstState>[] {
  const tree: (number | null)[] = [];
  const done: number[] = [];

  const setAt = (pos: number, val: number) => {
    while (tree.length <= pos) tree.push(null);
    tree[pos]! = val;
  };

  const { emit, frames } = createPrepRecorder<BstState>(() => ({
    nums,
    tree: tree.slice(),
    l: null,
    r: null,
    m: null,
    pos: null,
    done: done.slice(),
    finished: false,
  }));

  emit(
    'INIT',
    `n=${nums.length}`,
    `Convert Sorted Array to BST: the array is already sorted, so the middle element is the root of a balanced BST. build(l, r) takes the mid of [l, r] as a subtree root, then recurses on the left half and the right half.`,
    {},
  );

  // build(l, r) mirrors the Go solution, threading `pos` = heap index of the
  // current subtree root so we can place it into the level-order `tree`.
  const build = (l: number, r: number, pos: number): void => {
    if (l > r) {
      emit(
        'EMPTY',
        `[${l},${r}] empty`,
        `Range [${l}, ${r}] is empty (l > r), so this branch has no node — return nil.`,
        { l, r, pos },
      );
      return;
    }
    const m = Math.floor((l + r) / 2);
    emit(
      'MID',
      `m=${m}`,
      `In range [${l}, ${r}] the middle index is m = ⌊(${l} + ${r}) / 2⌋ = ${m}, so nums[${m}]! = ${nums[m]!} becomes the root of this subtree. Values left of ${m} are smaller, values right are larger.`,
      { l, r, m, pos },
    );
    setAt(pos, nums[m]!);
    done.push(pos);
    emit(
      'PLACE',
      `node ${nums[m]!}`,
      `Place ${nums[m]!} as this subtree's root. Now recurse left on [${l}, ${m - 1}] then right on [${m + 1}, ${r}].`,
      { l, r, m, pos },
      'good',
    );
    build(l, m - 1, 2 * pos + 1);
    build(m + 1, r, 2 * pos + 2);
  };

  build(0, nums.length - 1, 0);

  emit(
    'DONE',
    'balanced BST',
    `Every element has been placed. The tree is a height-balanced BST because each subtree used its own middle element as the root. Time O(n), Space O(n).`,
    { finished: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<BstState>) {
  const s = frame.state;
  const doneSet = new Set(s.done);
  const nodeClass = (i: number) => {
    if (s.pos === i && s.m !== null) return 'team-1';
    if (doneSet.has(i)) return 'team-2';
    return 'team-0';
  };
  const activePos = s.m !== null ? s.pos : null;
  const range = s.l !== null && s.r !== null ? `[${s.l}, ${s.r}]` : '—';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        nums = <span className="font-mono text-ink">[{s.nums.join(', ')}]</span>
        {s.m !== null && (
          <>
            {' · '}mid ={' '}
            <span className="font-mono text-ink">
              nums[{s.m}]! = {s.nums[s.m]!}
            </span>
          </>
        )}
      </div>
      {s.tree.length === 0 ? (
        <div className={cn('py-4 font-mono', vizText.sm, 'text-ink3')}>empty tree</div>
      ) : (
        <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={activePos} />
      )}
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>build(l, r) on {range}</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BstState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const nodeCount = s.tree.filter((v) => v !== null).length;
  return (
    <VarGrid>
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="m = (l+r)/2" v={s.m ?? '—'} />
      <InspectorRow k="nums[m]! (root)" v={s.m !== null ? s.nums[s.m]! : '—'} />
      <InspectorRow k="nodes placed" v={nodeCount} />
      <InspectorRow k="status" v={s.finished ? 'balanced BST' : '…building'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-convert-sorted-array-to-bst';
export const title = 'Convert sorted array to BST';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Convert sorted array to BST"?',
    choices: [
      {
        label: 'Mid divide BST — fits this problem',
        correct: true,
      },
      {
        label: 'BFS + Column Map — different approach',
      },
      {
        label: 'Column map BFS — different approach',
      },
      {
        label: 'N-ary tree diameter via top-2 heights — different approach',
      },
    ],
    explain: 'Middle element becomes the root; recurse on the two halves',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Convert sorted array to BST), what strategy is established?',
    choices: [
      {
        label: 'Middle element becomes the root; recurse — described in INIT caption',
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
      'Convert Sorted Array to BST: the array is already sorted, so the middle element is the root of a balanced BST. build(l, r) takes the mid of [l, r] as a subtree root, then recurses on the left half and the right half.',
  },
  {
    id: 'key-step',
    prompt: 'On the "MID" step (m=), what happens?',
    choices: [
      {
        label: 'In range [, ] the middle — this move caption',
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
      'In range [, ] the middle index is m = ⌊( + ) / 2⌋ = , so nums[] =  becomes the root of this subtree. Values left of  are smaller, values right are larger.',
  },
  {
    id: 'state',
    prompt: 'What does the `l` field track in the visualization state?',
    choices: [
      {
        label: 'current sub-array left bound — updated each frame',
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
    explain: 'The recorder keeps `l` in sync: current sub-array left bound',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Convert sorted array to BST"?',
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
    explain: 'O(n). O(n). build(l,r): m=(l+r)/2 root, build(l,m-1), build(m+1,r)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: "Place as this subtree's root. Now — final DONE caption",
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
    explain: "Place  as this subtree's root. Now recurse left on [, ] then right on [, ].",
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'csb1', label: '[-10,-3,0,5,9]', value: { nums: [-10, -3, 0, 5, 9] } },
    { id: 'csb2', label: '[1,2,3,4,5,6,7]', value: { nums: [1, 2, 3, 4, 5, 6, 7] } },
  ] satisfies SampleInput<BstInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BstState | undefined;
    const nodeCount = s ? s.tree.filter((v) => v !== null).length : 0;
    const ok = !!s && nodeCount === s.nums.length;
    return { ok, label: `${nodeCount}-node BST` };
  },
};

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import {
  InspectorRow,
  RailGroup,
  RailResult,
  RailStat,
  RailStack,
  VarGrid,
  VizEmpty,
  VizStage,
} from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/board/TreeBoard';

interface BtInOrderInput {
  /** Level-order tree; null marks absent child. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface BtInOrderState {
  tree: (number | null)[];
  stack: number[];
  active: number | null;
  done: number[];
  output: number[];
  hasNext: boolean;
  finished: boolean;
}

const L = (i: number) => 2 * i + 1;
const R = (i: number) => 2 * i + 2;

function record({ tree }: BtInOrderInput): Frame<BtInOrderState>[] {
  const stack: number[] = [];
  const done: number[] = [];
  const output: number[] = [];

  const val = (i: number): number => tree[i] as number;
  const exists = (i: number): boolean => i >= 0 && i < tree.length && tree[i] != null;

  const { emit, frames } = createRecorder<BtInOrderState>(() => ({
    tree: tree,
    stack: stack.slice(),
    done: done.slice(),
    output: output.slice(),
    hasNext: stack.length > 0,
    finished: false,
    active: null,
  }));

  const pushLeft = (start: number) => {
    let node = start;
    if (!exists(node)) {
      emit('PUSH_NONE', 'null spine', `No right subtree — nothing to push onto the stack.`, {
        active: null,
      });
      return;
    }
    while (exists(node)) {
      stack.push(node);
      emit(
        'PUSH',
        `push ${val(node)}`,
        `Constructor / pushLeft: push node ${val(node)}, then follow LEFT until null. This stacks the left spine for in-order traversal.`,
        { active: node },
      );
      node = L(node);
    }
    emit(
      'SPINE_DONE',
      'left spine done',
      `Left spine fully stacked. Top of stack (${stack.length ? val(stack[stack.length - 1]) : '—'}) is the next in-order value.`,
      { active: stack[stack.length - 1] ?? null },
    );
  };

  emit(
    'INIT',
    'build iterator',
    `Binary tree in-order iterator: explicit stack holds the left spine. Constructor pushes all left nodes from root; each \`next()\` pops, yields, then pushLeft(right).`,
    { active: exists(0) ? 0 : null },
  );

  pushLeft(0);

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    emit(
      'HASNEXT',
      'hasNext = true',
      `\`hasNext()\`: stack non-empty — next value is ${val(top)} at stack top.`,
      { active: top },
    );
    stack.pop();
    done.push(top);
    output.push(val(top));
    emit(
      'NEXT',
      `yield ${val(top)}`,
      `\`next()\`: pop ${val(top)}, emit it. In-order so far: [${output.join(', ')}]. Now pushLeft(node.right).`,
      { active: top },
      'good',
    );
    pushLeft(R(top));
  }

  emit(
    'FINISHED',
    `[${output.join(', ')}]`,
    `Stack empty — iteration complete. Full in-order sequence: [${output.join(', ')}].`,
    { active: null },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<BtInOrderState>) {
  const s = frame.state;
  const doneSet = new Set(s.done);
  const stackSet = new Set(s.stack);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (doneSet.has(i)) return 'team-2';
    if (stackSet.has(i)) return 'team-1';
    return 'team-0';
  };
  const stackLabels = s.stack.map((i) => String(s.tree[i] as number));
  const topVal = s.stack.length > 0 ? (s.tree[s.stack[s.stack.length - 1]] as number) : '—';
  const rail = (
    <>
      <RailStack label="stack" items={stackLabels} topLabel="top" />
      <RailGroup label="state">
        <RailStat k="top" v={topVal} tone="accent" />
        <RailStat k="hasNext" v={s.hasNext ? 'true' : 'false'} />
        <RailStat k="yielded" v={s.output.length} />
      </RailGroup>
      <RailResult
        label="in-order"
        value={s.output.length ? `[${s.output.join(', ')}]` : '…'}
        tone={s.finished ? 'good' : 'accent'}
      />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<BtInOrderState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const topVal = s.stack.length > 0 ? (s.tree[s.stack[s.stack.length - 1]] as number) : '—';
  return (
    <VarGrid>
      <InspectorRow k="stack depth" v={s.stack.length} />
      <InspectorRow k="stack top" v={topVal} />
      <InspectorRow k="hasNext" v={s.hasNext ? 'true' : 'false'} />
      <InspectorRow k="yielded" v={s.output.length} />
      <InspectorRow k="in-order" v={s.output.length ? `[${s.output.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-binary-tree-in-order-iterator';
export const title = 'Binary tree in-order iterator';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Binary tree in-order iterator"?',
    choices: [
      {
        label: 'Iterative inorder with stack — fits this problem',
        correct: true,
      },
      {
        label: 'Streaming palindrome stack — different approach',
      },
      {
        label: 'Min-heap size k — different approach',
      },
      {
        label: 'Scanner word tokenization — different approach',
      },
    ],
    explain: 'Stack the left spine; next pops a node then dives right',
  },
  {
    id: 'key-step',
    prompt: 'On the "NEXT" step (yield ), what happens?',
    choices: [
      {
        label: '\\ — this move caption',
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
    explain: '\\',
  },
  {
    id: 'state',
    prompt: 'What does the `tree` field track in the visualization state?',
    choices: [
      {
        label: 'Field tree in state — updated each frame',
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
      'The recorder snapshots `tree` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Binary tree in-order iterator"?',
    choices: [
      {
        label: 'O(1) amortized time, O(h) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) per add time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(file size) time, O(1) per line space — wrong order of growth',
      },
    ],
    explain:
      "O(1) amortized. O(h). ctor pushes lefts; next: pop, then push the right child's lefts",
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Stack empty — iteration complete. Full — final DONE caption',
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
    explain: 'Stack empty — iteration complete. Full in-order sequence: [].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'btio1', label: '[1,2,3,4,5,6,7]', value: { tree: [1, 2, 3, 4, 5, 6, 7] } },
    { id: 'btio2', label: '[4,2,6,1,3,5,7]', value: { tree: [4, 2, 6, 1, 3, 5, 7] } },
  ] satisfies SampleInput<BtInOrderInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BtInOrderState | undefined;
    return s?.finished
      ? { ok: true, label: `[${s.output.join(', ')}]` }
      : { ok: false, label: 'incomplete' };
  },
};

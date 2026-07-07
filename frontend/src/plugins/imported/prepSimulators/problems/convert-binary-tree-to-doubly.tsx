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

interface DoublyInput {
  /** Level-order tree; null marks an absent slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

type NodeStatus = 'idle' | 'active' | 'done';

interface DoublyState {
  tree: (number | null)[];
  status: NodeStatus[]; // per level-order index
  active: number | null; // index currently being visited (ring)
  prev: number | null; // previous linked node (tree index)
  list: number[]; // values of the doubly-linked list built so far (in order)
  head: number | null; // value of the list head, once known
  done: boolean;
}

function record({ tree }: DoublyInput): Frame<DoublyState>[] {
  const status: NodeStatus[] = tree.map(() => 'idle');
  const list: number[] = [];

  let prevIdx: number | null = null;
  let headVal: number | null = null;

  const { emit, frames } = createPrepRecorder<DoublyState>(() => ({
    tree: tree,
    status: status.slice(),
    prev: prevIdx,
    list: list.slice(),
    head: headVal,
    active: null,
    done: false,
  }));

  emit(
    'INIT',
    'inorder',
    `Convert a BST to a sorted doubly-linked list in place. An inorder walk (left → node → right) visits nodes in ascending order, and we stitch each visited node onto the tail of the list as we go.`,
    { active: null, done: false },
  );

  const dfs = (i: number) => {
    if (i >= tree.length || tree[i]! == null) return;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    const val = tree[i]! as number;

    if (left < tree.length && tree[left]! != null) {
      emit(
        'GO_LEFT',
        `↙ ${val}`,
        `At node ${val}: recurse left first so every smaller value is linked before ${val} itself.`,
        { active: i, done: false },
      );
    }
    dfs(left);

    // Visit this node.
    status[i]! = 'active';
    if (headVal === null) {
      headVal = val;
      emit(
        'HEAD',
        `head=${val}`,
        `${val} is the leftmost (smallest) node, so it becomes the head of the doubly-linked list. There is no previous node to link back to yet.`,
        { active: i, done: false },
      );
    } else {
      const prevVal = tree[prevIdx as number]! as number;
      emit(
        'LINK',
        `${prevVal}↔${val}`,
        `Link ${prevVal} and ${val}: set prev.Next = ${val} and ${val}.Prev = ${prevVal}. This appends ${val} to the tail of the list.`,
        { active: i, done: false },
      );
    }
    list.push(val);
    prevIdx = i;
    status[i]! = 'done';
    emit(
      'ADVANCE',
      `prev=${val}`,
      `${val} is now the tail. Set prev = ${val}, then recurse right to attach any larger values after it.`,
      { active: i, done: false },
    );

    dfs(right);
  };

  dfs(0);

  const headLabel = headVal === null ? '(empty)' : String(headVal);
  emit(
    'DONE',
    `head=${headLabel}`,
    `Inorder walk complete. The nodes are now a sorted doubly-linked list: ${list.length ? list.join(' ↔ ') : '(empty)'}. The head is ${headLabel}. Time O(n), space O(h) for the recursion stack.`,
    { active: null, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DoublyState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (s.status[i]! === 'done') return 'team-2';
    return 'team-0';
  };
  const prevVal = s.prev !== null ? (s.tree[s.prev]! as number) : '—';
  const rail = (
    <>
      <RailGroup label="pointers">
        <RailStat k="head" v={s.head ?? '—'} tone="accent" />
        <RailStat k="prev" v={prevVal} />
      </RailGroup>
      <RailStack label="list" items={s.list.map(String)} highlightEnd="bottom" topLabel="head" />
      {s.done && (
        <RailResult label="result" value={s.list.length ? s.list.join('↔') : '∅'} tone="good" />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DoublyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.active !== null ? (s.tree[s.active]! as number) : '—';
  const prevVal = s.prev !== null ? (s.tree[s.prev]! as number) : '—';
  return (
    <VarGrid>
      <InspectorRow k="cur (visiting)" v={cur} />
      <InspectorRow k="prev (tail)" v={prevVal} />
      <InspectorRow k="head" v={s.head ?? '—'} />
      <InspectorRow k="linked" v={s.list.length} />
      <InspectorRow k="list" v={s.list.length ? s.list.join('↔') : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-convert-binary-tree-to-doubly';
export const title = 'Convert binary tree to doubly';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Convert binary tree to doubly"?',
    choices: [
      {
        label: 'Inorder flatten — fits this problem',
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
    explain: 'Inorder walk; link prev<->cur as each node is visited',
  },
  {
    id: 'key-step',
    prompt: 'On the "LINK" step (↔), what happens?',
    choices: [
      {
        label: 'Link and : set prev.Next = — this move caption',
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
    explain: 'Link  and : set prev.Next =  and .Prev = . This appends  to the tail of the list.',
  },
  {
    id: 'state',
    prompt: 'What does the `status` field track in the visualization state?',
    choices: [
      {
        label: 'per level-order index — updated each frame',
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
    explain: 'The recorder keeps `status` in sync: per level-order index',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Convert binary tree to doubly"?',
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
    explain: 'O(n). O(h). dfs left; link prev,cur; prev=cur; dfs right',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Inorder walk complete. The nodes — final DONE caption',
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
      'Inorder walk complete. The nodes are now a sorted doubly-linked list: . The head is . Time O(n), space O(h) for the recursion stack.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'cd1', label: 'BST [4,2,5,1,3]', value: { tree: [4, 2, 5, 1, 3] } },
    {
      id: 'cd2',
      label: 'BST [5,3,8,2,4,null,9]',
      value: { tree: [5, 3, 8, 2, 4, null, 9] },
    },
  ] satisfies SampleInput<DoublyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DoublyState | undefined;
    if (!s || s.list.length === 0) return { ok: false, label: 'empty' };
    return { ok: true, label: s.list.join(' ↔ ') };
  },
};

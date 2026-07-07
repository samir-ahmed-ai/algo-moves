import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';

interface SuccessorInput {
  /** BST in level-order; null marks an absent child slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
  /** Value of the node p whose in-order successor we want. */
  p: number;
}

interface SuccessorState {
  tree: (number | null)[];
  p: number;
  cur: number | null; // index of the node we are standing on (null once we fall off)
  res: number | null; // index of the best successor candidate so far
  path: number[]; // indices already visited along the walk
  done: boolean;
}

/** In-order sequence of node VALUES, used only to explain the answer in captions. */
function inorderValues(tree: (number | null)[]): number[] {
  const out: number[] = [];
  const walk = (i: number) => {
    if (i >= tree.length || tree[i] == null) return;
    walk(2 * i + 1);
    out.push(tree[i] as number);
    walk(2 * i + 2);
  };
  walk(0);
  return out;
}

function record({ tree, p }: SuccessorInput): Frame<SuccessorState>[] {
  const path: number[] = [];
  let res: number | null = null;

  const { emit, frames } = createRecorder<SuccessorState>(() => ({
    tree,
    p,
    cur: null,
    res,
    path: path.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `p=${p}`,
    `Inorder Successor in BST: find the node with the smallest value strictly greater than ${p}. We never touch p's own subtree — we just walk down from the root using the BST order. Whenever p < cur we could still improve, so we record cur as a candidate and go left; otherwise cur is too small, so we go right.`,
    { cur: 0 },
  );

  let cur = 0; // index into the level-order array (root)
  while (cur < tree.length && tree[cur] != null) {
    const curVal = tree[cur] as number;
    path.push(cur);
    if (p < curVal) {
      res = cur;
      const left = 2 * cur + 1;
      emit(
        'CANDIDATE',
        `res=${curVal}`,
        `p (${p}) < cur (${curVal}), so ${curVal} is greater than p and is a valid successor candidate — remember it as res. A smaller-but-still-greater value can only sit in the left subtree, so move left.`,
        { cur },
      );
      cur = left;
    } else {
      const right = 2 * cur + 2;
      emit(
        'GO_RIGHT',
        `skip ${curVal}`,
        `p (${p}) ≥ cur (${curVal}), so ${curVal} is not greater than p and cannot be the successor. Any larger value lies in the right subtree, so move right and keep the current res.`,
        { cur },
      );
      cur = right;
    }
  }

  const seq = inorderValues(tree);
  if (res !== null) {
    const ans = tree[res] as number;
    emit(
      'DONE',
      `succ=${ans}`,
      `We walked off the tree. The last candidate we saved is ${ans}, which is the in-order successor of ${p}. (In-order values: ${seq.join(', ')} — right after ${p} comes ${ans}.)`,
      { done: true },
      'good',
    );
  } else {
    emit(
      'DONE',
      'succ=none',
      `We walked off the tree without ever finding cur > ${p}, so ${p} is the largest value and has no in-order successor. (In-order values: ${seq.join(', ')}.)`,
      { done: true },
      'bad',
    );
  }
  return frames;
}

function View({ frame }: PluginViewProps<SuccessorState>) {
  const s = frame.state;
  const visited = new Set(s.path);
  const nodeClass = (i: number) => {
    if (s.cur === i) return 'team-1';
    if (s.res === i) return 'team-1';
    if (visited.has(i)) return 'team-2';
    return 'team-0';
  };
  const resVal = s.res !== null ? (s.tree[s.res] as number) : null;
  const curVal = s.cur !== null && s.tree[s.cur] != null ? (s.tree[s.cur] as number) : null;
  const rule = curVal !== null ? (s.p < curVal ? '← left' : '→ right') : '—';
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="scan">
            <RailStat k="p" v={s.p} />
            <RailStat k="cur" v={curVal ?? '—'} tone="accent" />
            <RailStat k="rule" v={rule} />
          </RailGroup>
          <RailGroup label="candidate">
            <RailStat k="res" v={resVal ?? '—'} tone={resVal !== null ? 'good' : undefined} />
            <RailStat k="steps" v={s.path.length} />
          </RailGroup>
          {s.done && (
            <RailResult
              label="successor"
              value={resVal !== null ? resVal : 'none'}
              tone={resVal !== null ? 'good' : 'bad'}
            />
          )}
        </>
      }
    >
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.cur} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SuccessorState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.cur !== null && s.tree[s.cur] != null ? (s.tree[s.cur] as number) : '—';
  const resVal = s.res !== null ? (s.tree[s.res] as number) : s.done ? 'none' : '…';
  return (
    <VarGrid>
      <InspectorRow k="p" v={s.p} />
      <InspectorRow k="cur (value)" v={curVal} />
      <InspectorRow
        k="rule"
        v={
          s.cur !== null && typeof curVal === 'number'
            ? s.p < curVal
              ? 'p < cur → left'
              : 'p ≥ cur → right'
            : '—'
        }
      />
      <InspectorRow k="res (candidate)" v={resVal} />
      <InspectorRow k="steps walked" v={s.path.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-inorder-successor-in-bst';
export const title = 'Inorder Successor in BST';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Inorder Successor in BST"?',
    choices: [
      {
        label: 'BST Walk — fits this problem',
        correct: true,
      },
      {
        label: 'Tree build + iterative pre-order — different approach',
      },
      {
        label: 'DFS with max tracking — different approach',
      },
      {
        label: 'BFS + Sort per column — different approach',
      },
    ],
    explain:
      'Walk from root: if `p.Val < curr.Val`, `curr` is a candidate → go left. Otherwise go right.',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Inorder Successor in BST), what strategy is established?',
    choices: [
      {
        label: 'Walk from root: if `p.Val < — described in INIT caption',
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
      "Inorder Successor in BST: find the node with the smallest value strictly greater than . We never touch p's own subtree — we just walk down from the root using the BST order. Whenever p < cur we could still improve, so we record cur as a candidate and go left; otherwise cur is too small, so we go right.",
  },
  {
    id: 'key-step',
    prompt: 'On the "GO_RIGHT" step (skip ), what happens?',
    choices: [
      {
        label: 'p () ≥ cur () — this move caption',
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
      'p () ≥ cur (), so  is not greater than p and cannot be the successor. Any larger value lies in the right subtree, so move right and keep the current res.',
  },
  {
    id: 'state',
    prompt: 'What does the `cur` field track in the visualization state?',
    choices: [
      {
        label: 'index of the node we — updated each frame',
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
      'The recorder keeps `cur` in sync: index of the node we are standing on (null once we fall off)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Inorder Successor in BST"?',
    choices: [
      {
        label: 'O(h) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(h+k) time, O(h) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(1) amortized time, O(h) space — wrong order of growth',
      },
    ],
    explain:
      'O(h). O(1). Walk from root: if `p.Val < curr.Val`, `curr` is a candidate → go left. Otherwise go right.; Last candidate when going left is the answer.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'We walked off the tree. — final DONE caption',
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
      'We walked off the tree. The last candidate we saved is , which is the in-order successor of . (In-order values:  — right after  comes .)',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'isb1',
      label: 'succ of 8',
      value: { tree: [20, 8, 22, 4, 12, null, null, null, null, 10, 14], p: 8 },
    },
    {
      id: 'isb2',
      label: 'succ of 14',
      value: { tree: [20, 8, 22, 4, 12, null, null, null, null, 10, 14], p: 14 },
    },
  ] satisfies SampleInput<SuccessorInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SuccessorState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    if (s.res === null) return { ok: false, label: 'no successor' };
    return { ok: true, label: `successor = ${s.tree[s.res]}` };
  },
};

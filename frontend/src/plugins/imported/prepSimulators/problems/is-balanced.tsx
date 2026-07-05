import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// Level-order tree; null marks an absent slot. Children of i are 2i+1, 2i+2.
type Cell = number | null;

interface BalancedInput {
  tree: Cell[];
}

interface BalancedState {
  tree: Cell[];
  visiting: number | null; // node whose subtree we are currently entering
  current: number | null; // node the caption is talking about right now
  done: number[]; // node indices whose height is finalized
  heights: Record<number, number>; // finalized subtree heights by node index
  l: number | null; // left subtree height for the current node
  r: number | null; // right subtree height for the current node
  bad: number | null; // node index where imbalance was detected
  answer: boolean | null; // final verdict
}

const has = (tree: Cell[], i: number) => i >= 0 && i < tree.length && tree[i] != null;

function record({ tree }: BalancedInput): Frame<BalancedState>[] {  const done: number[] = [];
  const heights: Record<number, number> = {};
  let bad: number | null = null;

  const { emit, frames } = createRecorder<BalancedState>(() => ({
        tree,
        visiting: null,
        current: null,
        done: done.slice(),
        heights: { ...heights },
        l: null,
        r: null,
        bad,
        answer: null
      }));

  emit(
    'INIT',
    'post-order',
    `Is Balanced: a tree is height-balanced when every node's left and right subtree heights differ by at most 1. We recurse post-order — each call returns its subtree height, but returns -1 as a sentinel the moment any imbalance is found, so the -1 propagates straight to the root.`,
    {},
  );

  // Returns subtree height, or -1 once an imbalance has been detected anywhere.
  const check = (i: number): number => {
    if (bad !== null) return -1; // short-circuit: imbalance already found
    if (!has(tree, i)) {
      // Only emit a frame for real null children (inside the array bounds),
      // to avoid noise from empty leaves of leaf nodes.
      return 0;
    }

    const val = tree[i];
    emit(
      'ENTER',
      `node ${val}`,
      `Enter node ${val}. Before we can measure it we must know both child heights, so we descend left first (post-order: children before parent).`,
      { visiting: i, current: i },
    );

    const l = check(2 * i + 1);
    if (bad !== null) return -1;
    emit(
      'LEFT',
      `L=${l}`,
      `Left subtree of node ${val} has height ${l}. Now measure the right subtree the same way.`,
      { current: i, l },
    );

    const r = check(2 * i + 2);
    if (bad !== null) return -1;
    emit(
      'RIGHT',
      `R=${r}`,
      `Right subtree of node ${val} has height ${r}. Compare the two: is |${l} − ${r}| ≤ 1?`,
      { current: i, l, r },
    );

    if (l - r > 1 || r - l > 1) {
      bad = i;
      emit(
        'IMBALANCE',
        `|${l}-${r}|>1`,
        `Imbalance at node ${val}: left height ${l} and right height ${r} differ by more than 1. Return -1 — this sentinel now short-circuits every ancestor, so the answer is false.`,
        { current: i, l, r, bad: i },
        'bad',
      );
      return -1;
    }

    const h = (l > r ? l : r) + 1;
    heights[i] = h;
    done.push(i);
    emit(
      'HEIGHT',
      `h=${h}`,
      `Node ${val} is balanced here (|${l} − ${r}| ≤ 1). Its height is max(${l}, ${r}) + 1 = ${h}, which we return to its parent.`,
      { current: i, l, r },
      'good',
    );
    return h;
  };

  const result = check(0);
  const answer = result !== -1;

  if (answer) {
    emit(
      'DONE',
      'balanced',
      `Every node passed the balance test, so no -1 ever bubbled up. The tree is height-balanced → true.`,
      { answer: true },
      'good',
    );
  } else {
    emit(
      'DONE',
      'not balanced',
      `The -1 sentinel reached the root, so at least one node was unbalanced. The tree is NOT height-balanced → false.`,
      { answer: false, bad },
      'bad',
    );
  }

  return frames;
}

function View({ frame }: PluginViewProps<BalancedState>) {
  const s = frame.state;
  const nodeClass = (i: number) => {
    if (s.bad === i) return 'team-1';
    if (s.current === i || s.visiting === i) return 'team-1';
    if (s.done.includes(i)) return 'team-2';
    return 'team-0';
  };
  const active = s.current ?? s.visiting;
  const verdictText =
    s.answer === null ? '…checking' : s.answer ? 'balanced ✓' : 'NOT balanced ✕';
  const verdictCls =
    s.answer === null ? 'text-ink' : s.answer ? 'text-good' : 'text-bad';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        answer = <span className={cn('font-mono', verdictCls)}>{verdictText}</span>
        {(s.l !== null || s.r !== null) && s.answer === null && (
          <>
            {' · '}L = <span className="font-mono text-ink">{s.l ?? '·'}</span>
            {' , '}R = <span className="font-mono text-ink">{s.r ?? '·'}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={active} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        green = height finalized · highlighted = current node
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BalancedState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const nodeVal = s.current !== null ? s.tree[s.current] : null;
  return (
    <VarGrid>
      <InspectorRow k="node" v={nodeVal ?? '—'} />
      <InspectorRow k="left height (L)" v={s.l ?? '—'} />
      <InspectorRow k="right height (R)" v={s.r ?? '—'} />
      <InspectorRow k="heights done" v={s.done.length} />
      <InspectorRow
        k="imbalance at"
        v={s.bad !== null ? (s.tree[s.bad] ?? s.bad) : '—'}
      />
      <InspectorRow
        k="answer"
        v={s.answer === null ? '…' : s.answer ? 'balanced' : 'not balanced'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-is-balanced';
export const title = 'Is balanced';

// Real algorithm, run outside the recorder to compute the honest verdict.
function computeBalanced(tree: Cell[]): boolean {
  const check = (i: number): number => {
    if (!has(tree, i)) return 0;
    const l = check(2 * i + 1);
    if (l === -1) return -1;
    const r = check(2 * i + 2);
    if (r === -1) return -1;
    if (l - r > 1 || r - l > 1) return -1;
    return (l > r ? l : r) + 1;
  };
  return check(0) !== -1;
}






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Is balanced\"?",
    choices: [
      {
        label: "Balance check — fits this problem",
        correct: true
      },
      {
        label: "LCA + heights — different approach"
      },
      {
        label: "Same tree check — different approach"
      },
      {
        label: "Stack iterative — different approach"
      }
    ],
    explain: "Height-return doubles as a flag: -1 means imbalance found"
  },
  {
    id: "key-step",
    prompt: "On the \"RIGHT\" step (R=), what happens?",
    choices: [
      {
        label: "Right subtree of node has height — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "Right subtree of node  has height . Compare the two: is | − | ≤ 1?"
  },
  {
    id: "state",
    prompt: "What does the `visiting` field track in the visualization state?",
    choices: [
      {
        label: "node whose subtree we — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder keeps `visiting` in sync: node whose subtree we are currently entering"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Is balanced\"?",
    choices: [
      {
        label: "O(n) time, O(h) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(n²) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(h). child -1 or |L-R|>1 -> return -1"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Node is balanced here (| − — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "Node  is balanced here (| − | ≤ 1). Its height is max(, ) + 1 = , which we return to its parent."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ib-balanced',
      label: 'balanced [3,9,20,#,#,15,7]',
      value: { tree: [3, 9, 20, null, null, 15, 7] },
    },
    {
      id: 'ib-skewed',
      label: 'skewed [1,2,#,3] → false',
      value: { tree: [1, 2, null, 3] },
    },
  ] satisfies SampleInput<BalancedInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BalancedState | undefined;
    const ok = s ? computeBalanced(s.tree) : false;
    return { ok, label: ok ? 'balanced' : 'not balanced' };
  },
};

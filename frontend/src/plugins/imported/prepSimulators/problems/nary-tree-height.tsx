import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { NaryTreeBoard, type NaryNode } from '../../../../components/board/NaryTreeBoard';

// N-ary tree given as a flat node list: node 0 is the root, `children` are
// indices into the same list. Mirrors the Go `NaryNode{ Val, Children }`.
interface TreeNode {
  val: number;
  children: number[];
}

interface HeightInput {
  nodes: TreeNode[];
}

interface HeightState {
  nodes: TreeNode[];
  active: number | null; // node currently being processed
  childIdx: number | null; // child edge we just walked, if any
  best: (number | null)[]; // running max child-height per node (null = not started)
  height: (number | null)[]; // final computed height per node (null = unresolved)
  done: boolean;
  answer: number | null;
}

function record({ nodes }: HeightInput): Frame<HeightState>[] {
  const n = nodes.length;
  const best = new Array<number | null>(n).fill(null);
  const height = new Array<number | null>(n).fill(null);

  const { emit, frames } = createRecorder<HeightState>(() => ({
    nodes,
    active: null,
    childIdx: null,
    best: best.slice(),
    height: height.slice(),
    done: false,
    answer: null,
  }));

  // Post-order DFS, faithful to the Go getHeight: nil -> 0; else 1 + max(child heights).
  const getHeight = (i: number): number => {
    best[i] = 0;
    emit(
      'ENTER',
      `visit ${nodes[i].val}`,
      `Enter node ${nodes[i].val}. Height of a node = 1 + the tallest of its child subtrees, so start a running best-child-height of 0 and recurse into each child (post-order).`,
      { active: i, best: best.slice() },
    );

    for (const c of nodes[i].children) {
      emit(
        'DESCEND',
        `→ ${nodes[c].val}`,
        `Walk down from node ${nodes[i].val} into child ${nodes[c].val}. We must know the child's subtree height before we can finish this node.`,
        { active: i, childIdx: c, best: best.slice() },
      );

      const h = getHeight(c); // recurse — resolves height[c]

      const prevBest = best[i] ?? 0;
      if (h > prevBest) {
        best[i] = h;
        emit(
          'UPDATE',
          `best=${h}`,
          `Child ${nodes[c].val} returned height ${h}, which beats the previous best (${prevBest}) for node ${nodes[i].val}. Update this node's tallest-child height to ${h}.`,
          { active: i, childIdx: c, best: best.slice() },
          'good',
        );
      } else {
        emit(
          'KEEP',
          `keep ${prevBest}`,
          `Child ${nodes[c].val} returned height ${h}, which does not beat the current best (${prevBest}) for node ${nodes[i].val}. Keep the best as ${prevBest}.`,
          { active: i, childIdx: c, best: best.slice() },
        );
      }
    }

    const result = (best[i] ?? 0) + 1;
    height[i] = result;
    emit(
      'RETURN',
      `h(${nodes[i].val})=${result}`,
      `All children of node ${nodes[i].val} are resolved. Return 1 + tallest child height = 1 + ${best[i] ?? 0} = ${result}. (A leaf has no children, so it returns 1.)`,
      { active: i, best: best.slice(), height: height.slice() },
      'good',
    );
    return result;
  };

  if (n === 0) {
    emit(
      'DONE',
      'empty → 0',
      `The tree is empty (nil root), so by definition its height is 0.`,
      { done: true, answer: 0 },
      'good',
    );
    return frames;
  }

  emit(
    'INIT',
    `n=${n}`,
    `Get the height of this ${n}-node N-ary tree. Rule: nil → 0, otherwise a node's height is 1 + the maximum height among its children. We compute it with a post-order DFS from the root.`,
    {},
  );

  const answer = getHeight(0);

  emit(
    'DONE',
    `height=${answer}`,
    `The root returned ${answer}, so the whole tree's height is ${answer}. Time O(n) — every node is visited once; Space O(h) for the recursion stack.`,
    { active: 0, best: best.slice(), height: height.slice(), done: true, answer },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<HeightState>) {
  const s = frame.state;
  const boardNodes: NaryNode[] = s.nodes.map((nd) => ({
    label: String(nd.val),
    children: nd.children,
  }));
  const nodeClass = (i: number) => {
    if (s.height[i] !== null) return 'team-2'; // resolved / done
    if (s.active === i) return 'team-1'; // currently processing
    return 'team-0'; // idle
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        height = 1 + max(child heights){' · '}
        answer = <span className="font-mono text-ink">{s.answer !== null ? s.answer : '…'}</span>
      </div>
      <NaryTreeBoard
        nodes={boardNodes}
        nodeClass={nodeClass}
        activeNode={s.active}
        highlightNode={s.childIdx}
      />
      {s.active !== null && !s.done && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          node {s.nodes[s.active].val}: best child ={' '}
          <span className="text-ink">{s.best[s.active] ?? 0}</span>
          {s.height[s.active] !== null && (
            <>
              {' · '}h = <span className="text-good">{s.height[s.active]}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<HeightState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.active;
  return (
    <VarGrid>
      <InspectorRow k="nodes" v={s.nodes.length} />
      <InspectorRow k="active node" v={cur !== null ? s.nodes[cur].val : '—'} />
      <InspectorRow k="children" v={cur !== null ? s.nodes[cur].children.length || 'leaf' : '—'} />
      <InspectorRow k="best child h" v={cur !== null ? (s.best[cur] ?? 0) : '—'} />
      <InspectorRow k="h(node)" v={cur !== null && s.height[cur] !== null ? s.height[cur] : '…'} />
      <InspectorRow k="tree height" v={s.answer !== null ? s.answer : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-nary-tree-height';
export const title = 'Get height';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Get height"?',
    choices: [
      {
        label: 'N-ary tree DFS height — fits this problem',
        correct: true,
      },
      {
        label: 'N-ary BFS level order — different approach',
      },
      {
        label: 'Inorder DFS (first/last tracking) — different approach',
      },
      {
        label: 'BFS serialize — different approach',
      },
    ],
    explain: 'Height = 1 + the tallest child subtree',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Get height), what strategy is established?',
    choices: [
      {
        label: 'Height = 1 + the tallest — described in INIT caption',
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
      "Get the height of this -node N-ary tree. Rule: nil → 0, otherwise a node's height is 1 + the maximum height among its children. We compute it with a post-order DFS from the root.",
  },
  {
    id: 'key-step',
    prompt: 'On the "UPDATE" step (best=), what happens?',
    choices: [
      {
        label: 'Child returned height , which beats — this move caption',
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
      "Child  returned height , which beats the previous best () for node . Update this node's tallest-child height to .",
  },
  {
    id: 'state',
    prompt: 'What does the `active` field track in the visualization state?',
    choices: [
      {
        label: 'node currently being processed — updated each frame',
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
    explain: 'The recorder keeps `active` in sync: node currently being processed',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Get height"?',
    choices: [
      {
        label: 'O(n) time, O(h) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(h). nil -> 0; return 1 + max(getHeight(child))',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The root returned  — final DONE caption',
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
      "The root returned , so the whole tree's height is . Time O(n) — every node is visited once; Space O(h) for the recursion stack.",
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'h1',
      label: 'height 3',
      // root(1) → {2, 3, 6}; node 3 → {4, 5}; node 6 → {7}.
      // Deepest paths 1→3→4 and 1→6→7 reach depth 2, so height = 3.
      value: {
        nodes: [
          { val: 1, children: [1, 2, 5] }, // 0: root, children are nodes 2/3/6
          { val: 2, children: [] }, // 1: leaf
          { val: 3, children: [3, 4] }, // 2: children are nodes 4/5
          { val: 4, children: [] }, // 3: leaf
          { val: 5, children: [] }, // 4: leaf
          { val: 6, children: [6] }, // 5: child is node 7
          { val: 7, children: [] }, // 6: leaf
        ] satisfies TreeNode[],
      },
    },
    {
      id: 'h2',
      label: 'single node',
      value: { nodes: [{ val: 9, children: [] }] satisfies TreeNode[] },
    },
  ] satisfies SampleInput<HeightInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as HeightState | undefined;
    const h = s?.answer ?? 0;
    return { ok: true, label: `height ${h}` };
  },
};

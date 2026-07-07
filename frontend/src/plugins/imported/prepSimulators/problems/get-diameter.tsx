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

// Level-order tree: children of i live at 2i+1 and 2i+2; null marks an absent slot.
interface DiameterInput {
  tree: (number | null)[];
}

interface DiameterState {
  tree: (number | null)[];
  active: number | null; // node currently being processed (ring)
  visited: number[]; // node indices whose height has been returned
  l: number | null; // left subtree height at the active node
  r: number | null; // right subtree height at the active node
  best: number; // best diameter (edge count) seen so far
  height: number | null; // height this node returns (1 + max(l, r))
  bestNode: number | null; // node the current best path bends through
  done: boolean;
}

function record({ tree }: DiameterInput): Frame<DiameterState>[] {
  const visited: number[] = [];
  let best = 0;
  let bestNode: number | null = null;

  const has = (i: number) => i >= 0 && i < tree.length && tree[i]! != null;

  const { emit, frames } = createPrepRecorder<DiameterState>(() => ({
    tree,
    active: null,
    visited: visited.slice(),
    l: null,
    r: null,
    best,
    height: null,
    bestNode,
    done: false,
  }));

  emit(
    'INIT',
    'best=0',
    `Diameter = the longest path (counted in edges) between any two nodes. Any such path bends at exactly one node, where it uses that node's left height + right height. We post-order DFS: compute each subtree's height, and at every node update best = max(best, L + R).`,
    {},
  );

  const height = (i: number): number => {
    if (!has(i)) return 0; // null child contributes height 0

    emit(
      'ENTER',
      `node ${tree[i]!}`,
      `Visit node ${tree[i]!}. Before we can measure the path bending here, recurse into its children to get their heights (post-order — children first).`,
      { active: i },
    );

    const l = height(2 * i + 1);
    const r = height(2 * i + 2);

    const through = l + r;
    const improved = through > best;
    if (improved) {
      best = through;
      bestNode = i;
    }
    emit(
      improved ? 'BEST' : 'COMBINE',
      `L+R=${through}`,
      `At node ${tree[i]!}: left height L = ${l}, right height R = ${r}. A path bending here spans L + R = ${through} edges. ${
        improved
          ? `That beats the old best, so best = ${best}.`
          : `That is not more than the current best ${best}, so best stays ${best}.`
      }`,
      { active: i, l, r, best, bestNode },
      improved ? 'good' : undefined,
    );

    const h = Math.max(l, r) + 1;
    visited.push(i);
    emit(
      'RETURN',
      `h=${h}`,
      `Node ${tree[i]!} returns its own height to its parent: 1 + max(L, R) = 1 + max(${l}, ${r}) = ${h}. This is how tall the subtree rooted at ${tree[i]!} is.`,
      { active: i, l, r, best, height: h, bestNode },
    );
    return h;
  };

  height(0);

  emit(
    'DONE',
    `diameter=${best}`,
    `Every node has been processed. The diameter is the largest L + R found: ${best} edge${best === 1 ? '' : 's'}${
      bestNode !== null ? `, bending through node ${tree[bestNode]!}` : ''
    }.`,
    { done: true, best, bestNode },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DiameterState>) {
  const s = frame.state;
  const visitedSet = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1'; // current node
    if (visitedSet.has(i)) return 'team-2'; // height returned
    return 'team-0'; // not yet processed
  };
  const bestLabel = s.done ? `${s.best}` : `${s.best}…`;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        best diameter = <span className="font-mono text-ink">{bestLabel}</span>
        {s.active !== null && s.l !== null && s.r !== null && (
          <>
            {' · '}here L+R = <span className="font-mono text-ink">{s.l + s.r}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.active !== null
          ? `L=${s.l ?? '?'} R=${s.r ?? '?'}${s.height !== null ? ` → h=${s.height}` : ''}`
          : 'path = edges on the longest node-to-node route'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DiameterState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const label = (i: number | null) => (i !== null && s.tree[i]! != null ? s.tree[i]! : '—');
  return (
    <VarGrid>
      <InspectorRow k="node" v={label(s.active)} />
      <InspectorRow k="L (left height)" v={s.l ?? '—'} />
      <InspectorRow k="R (right height)" v={s.r ?? '—'} />
      <InspectorRow k="L + R (path here)" v={s.l !== null && s.r !== null ? s.l + s.r : '—'} />
      <InspectorRow k="returns h" v={s.height ?? '—'} />
      <InspectorRow k="best diameter" v={s.best} />
      <InspectorRow k="bends through" v={label(s.bestNode)} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-get-diameter';
export const title = 'Get diameter';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Get diameter"?',
    choices: [
      {
        label: 'Post-order diameter — fits this problem',
        correct: true,
      },
      {
        label: 'DFS tracking top-2 child contributions — different approach',
      },
      {
        label: 'Inorder flatten — different approach',
      },
      {
        label: 'Preorder DFS — different approach',
      },
    ],
    explain: 'Longest path bends through a node = leftHeight + rightHeight',
  },
  {
    id: 'key-step',
    prompt: 'On the "RETURN" step (h=), what happens?',
    choices: [
      {
        label: 'Node returns its own height — this move caption',
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
      'Node  returns its own height to its parent: 1 + max(L, R) = 1 + max(, ) = . This is how tall the subtree rooted at  is.',
  },
  {
    id: 'state',
    prompt: 'What does the `active` field track in the visualization state?',
    choices: [
      {
        label: 'node currently being processed (ring) — updated each frame',
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
    explain: 'The recorder keeps `active` in sync: node currently being processed (ring)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Get diameter"?',
    choices: [
      {
        label: 'O(n) time, O(h) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) amortized time, O(h) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n^2) time, O(h) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(h). height dfs; best=max(best,L+R); return 1+max(L,R)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every node has been processed. — final DONE caption',
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
      'Every node has been processed. The diameter is the largest L + R found:  edge${\n      bestNode !== null ? ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'gd1', label: '[1,2,3,4,5]', value: { tree: [1, 2, 3, 4, 5] } },
    { id: 'gd2', label: 'chain [1,2,·,3]', value: { tree: [1, 2, null, 3] } },
  ] satisfies SampleInput<DiameterInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DiameterState | undefined;
    const d = s?.best ?? 0;
    return { ok: true, label: `diameter ${d}` };
  },
};

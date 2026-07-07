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

interface LongestPathInput {
  parent: number[];
  s: string;
}

interface LongestPathState {
  parent: number[];
  s: string;
  /** Node id currently being processed by DFS (null = none). */
  node: number | null;
  /** Node ids already fully resolved (post-order done). */
  done: number[];
  /** Best top-2 kept child lengths for the current node. */
  max1: number | null;
  max2: number | null;
  /** Path length through the current node = max1 + max2 + 1. */
  through: number | null;
  /** Best answer found so far (global res). */
  res: number;
  finished: boolean;
}

/**
 * Build the binary level-order board so TreeBoard can draw the (general) tree.
 * Children of board index i are 2i+1, 2i+2. We only handle inputs whose fan-out
 * is <= 2 per node so the sample trees render cleanly; that covers the samples.
 * Returns { board, place } where place[node] = board index, plus the inverse.
 */
function layout(
  parent: number[],
  s: string,
): { board: (string | null)[]; place: number[]; nodeAt: (bi: number) => number } {
  const n = parent.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) adj[parent[i]].push(i);

  const place = new Array<number>(n).fill(-1);
  const board: (string | null)[] = [];
  const put = (bi: number, ch: string) => {
    while (board.length <= bi) board.push(null);
    board[bi] = ch;
  };
  const assign = (node: number, bi: number) => {
    place[node] = bi;
    put(bi, s[node]);
    const kids = adj[node];
    for (let k = 0; k < kids.length && k < 2; k++) assign(kids[k], 2 * bi + (k + 1));
  };
  assign(0, 0);

  const inverse = new Map<number, number>();
  for (let node = 0; node < n; node++) if (place[node] >= 0) inverse.set(place[node], node);
  return { board, place, nodeAt: (bi: number) => inverse.get(bi) ?? -1 };
}

function record({ parent, s }: LongestPathInput): Frame<LongestPathState>[] {
  const n = parent.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) adj[parent[i]].push(i);
  const done: number[] = [];
  let res = 0;

  const { emit, frames } = createRecorder<LongestPathState>(() => ({
    parent,
    s,
    node: null,
    done: [...done],
    max1: null,
    max2: null,
    through: null,
    res,
    finished: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Longest Path With Different Adjacent Characters: find the longest downward path whose adjacent nodes never share the same character. DFS returns the longest single downward chain from each node; the answer is the best "V" path (two chains) through any node.`,
    {},
  );

  const dfs = (node: number): number => {
    emit(
      'ENTER',
      `dfs(${node})`,
      `Enter node ${node} (character '${s[node]}'). We will recurse into every child, then keep the two longest child chains whose first character differs from '${s[node]}'.`,
      { node },
    );

    let max1 = 0;
    let max2 = 0;
    for (const child of adj[node]) {
      const childLen = dfs(child);
      if (s[child] !== s[node]) {
        if (childLen > max1) {
          max2 = max1;
          max1 = childLen;
          emit(
            'KEEP1',
            `max1=${max1}`,
            `Child ${child} ('${s[child]}') differs from '${s[node]}' and its chain length ${childLen} beats the current best, so it becomes the longest child chain: max1 = ${max1}, max2 = ${max2}.`,
            { node, max1, max2 },
          );
        } else if (childLen > max2) {
          max2 = childLen;
          emit(
            'KEEP2',
            `max2=${max2}`,
            `Child ${child} ('${s[child]}') differs from '${s[node]}' with chain length ${childLen} — not the best, but the new second-best: max2 = ${max2}.`,
            { node, max1, max2 },
          );
        } else {
          emit(
            'SKIP',
            `keep ${childLen}`,
            `Child ${child} ('${s[child]}') differs from '${s[node]}' but its chain length ${childLen} is not in the top two (max1=${max1}, max2=${max2}), so it does not improve the path.`,
            { node, max1, max2 },
          );
        }
      } else {
        emit(
          'BLOCK',
          `'${s[child]}'=='${s[node]}'`,
          `Child ${child} shares character '${s[node]}' with node ${node}, so the edge to it is forbidden — its chain contributes nothing here.`,
          { node, max1, max2 },
        );
      }
    }

    const through = max1 + max2 + 1;
    if (through > res) {
      res = through;
      emit(
        'PATH',
        `res=${res}`,
        `Path through node ${node} spans its two best child chains plus itself: max1 (${max1}) + max2 (${max2}) + 1 = ${through}. This is a new global best, so res = ${res}.`,
        { node, max1, max2, through, res },
        'good',
      );
    } else {
      emit(
        'PATH',
        `through=${through}`,
        `Path through node ${node} = max1 (${max1}) + max2 (${max2}) + 1 = ${through}, which does not beat the current best res = ${res}.`,
        { node, max1, max2, through },
      );
    }

    done.push(node);
    const up = max1 + 1;
    emit(
      'RETURN',
      `return ${up}`,
      `Node ${node} is done. It returns its single longest valid downward chain upward: max1 (${max1}) + 1 = ${up}, so its parent can extend from here.`,
      { node: null, max1, max2, through: null },
    );
    return up;
  };

  dfs(0);

  emit(
    'DONE',
    `answer ${res}`,
    `Every node is resolved. The longest path with all-different adjacent characters has length ${res} node(s).`,
    { node: null, res, finished: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<LongestPathState>) {
  const s = frame.state;
  const { board, place, nodeAt } = layout(s.parent, s.s);
  const activeBi = s.node !== null ? place[s.node] : null;
  const nodeClass = (bi: number) => {
    const nodeId = nodeAt(bi);
    if (nodeId < 0) return 'team-0';
    if (s.node !== null && nodeId === s.node) return 'team-1';
    if (s.done.includes(nodeId)) return 'team-2';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">"{s.s}"</span>
        {' · '}best path = <span className="font-mono text-ink">{s.res}</span>
      </div>
      <TreeBoard tree={board} nodeClass={nodeClass} activeNode={activeBi} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.node !== null ? (
          <>
            node {s.node} ('{s.s[s.node]}') · max1={s.max1 ?? 0} · max2={s.max2 ?? 0}
            {s.through !== null && <> · through={s.through}</>}
          </>
        ) : s.finished ? (
          <span className="text-good">answer = {s.res}</span>
        ) : (
          <>traversing…</>
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LongestPathState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="s" v={`"${s.s}"`} />
      <InspectorRow k="node" v={s.node ?? '—'} />
      <InspectorRow k="s[node]" v={s.node !== null ? `'${s.s[s.node]}'` : '—'} />
      <InspectorRow k="max1" v={s.max1 ?? '—'} />
      <InspectorRow k="max2" v={s.max2 ?? '—'} />
      <InspectorRow k="through (m1+m2+1)" v={s.through ?? '—'} />
      <InspectorRow k="res (best)" v={s.res} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-longest-path-with-different-adjacent-characters';
export const title = 'Longest Path With Different Adjacent Characters';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Longest Path With Different Adjacent Characters"?',
    choices: [
      {
        label: 'DFS tracking top-2 child contributions — fits this problem',
        correct: true,
      },
      {
        label: 'BFS rightmost — different approach',
      },
      {
        label: 'Swap children — different approach',
      },
      {
        label: 'Recursive DFS — different approach',
      },
    ],
    explain:
      'DFS: for each node, track the two longest child contributions where `s[child] != s[node]`',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Longest Path With Different Adjacent Characters), what strategy is established?',
    choices: [
      {
        label: 'DFS: for each node, track — described in INIT caption',
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
      'Longest Path With Different Adjacent Characters: find the longest downward path whose adjacent nodes never share the same character. DFS returns the longest single downward chain from each node; the answer is the best "V" path (two chains) through any node.',
  },
  {
    id: 'key-step',
    prompt: "On the \"BLOCK\" step (''==''), what happens?",
    choices: [
      {
        label: "Child shares character '' with node — this move caption",
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
      "Child  shares character '' with node , so the edge to it is forbidden — its chain contributes nothing here.",
  },
  {
    id: 'state',
    prompt: 'What does the `parent` field track in the visualization state?',
    choices: [
      {
        label: 'Field parent in state — updated each frame',
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
      'The recorder snapshots `parent` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "Longest Path With Different Adjacent Characters"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(h) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(n). O(n). DFS: for each node, track the two longest child contributions where `s[child] != s[node]`; Path through node = `max1 + max2 + 1`; return `max1 + 1` upward',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every node is resolved. The longest — final DONE caption',
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
      'Every node is resolved. The longest path with all-different adjacent characters has length  node(s).',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'lp1',
      label: 'parent=[-1,0,0,1,1,2], s="abacbe" → 3',
      value: { parent: [-1, 0, 0, 1, 1, 2], s: 'abacbe' },
    },
    {
      id: 'lp2',
      label: 'parent=[-1,0,1,0,3], s="abcbd" → 5',
      value: { parent: [-1, 0, 1, 0, 3], s: 'abcbd' },
    },
  ] satisfies SampleInput<LongestPathInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LongestPathState | undefined;
    const res = s?.res ?? 0;
    return { ok: res > 0, label: `${res} node${res === 1 ? '' : 's'}` };
  },
};

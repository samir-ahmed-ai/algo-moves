import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SideViewInput {
  /** Level-order array; null marks an absent slot. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface SideViewState {
  tree: (number | null)[];
  queue: number[]; // node indices still waiting in the BFS queue
  current: number | null; // node index being dequeued this step
  level: number; // BFS level currently being processed
  posInLevel: number | null; // i within the level (0-based)
  levelSize: number | null; // sz = number of nodes on this level
  visited: number[]; // node indices already dequeued
  view: number[]; // node VALUES chosen for the side view (in order)
  done: boolean;
}

function record({ tree }: SideViewInput): Frame<SideViewState>[] {  const visited: number[] = [];
  const view: number[] = [];

  const { emit, frames } = createRecorder<SideViewState>(() => ({
        tree,
        queue: [],
        current: null,
        level: 0,
        posInLevel: null,
        levelSize: null,
        visited: visited.slice(),
        view: view.slice(),
        done: false
      }));

  // Empty tree (root is null / absent).
  if (tree.length === 0 || tree[0] == null) {
    emit('DONE', 'empty', 'The tree is empty, so the side view is an empty list. Nothing to do.', { done: true }, 'good');
    return frames;
  }

  let queue: number[] = [0];
  emit(
    'INIT',
    `root=${tree[0]}`,
    `Right-side view: standing to the RIGHT of the tree, we see only the last node on each level. We BFS level by level; on every level the final node dequeued (i === sz − 1) is the one we can see.`,
    { queue: queue.slice() },
  );

  let level = 0;
  while (queue.length > 0) {
    const sz = queue.length;
    emit(
      'LEVEL',
      `level ${level}, sz=${sz}`,
      `Start level ${level}. It has sz = ${sz} node${sz === 1 ? '' : 's'} queued. We will dequeue exactly ${sz}, left to right; the one at position i === sz − 1 = ${sz - 1} is the rightmost and joins the view.`,
      { queue: queue.slice(), level, levelSize: sz },
    );

    for (let i = 0; i < sz; i++) {
      const nodeIdx = queue[0];
      queue = queue.slice(1);
      const val = tree[nodeIdx] as number;
      const isLast = i === sz - 1;

      if (isLast) {
        view.push(val);
        visited.push(nodeIdx);
        emit(
          'SEE',
          `see ${val}`,
          `Position i = ${i} equals sz − 1 = ${sz - 1}: this is the rightmost node on level ${level}. Append its value ${val} to the side view.`,
          { current: nodeIdx, queue: queue.slice(), level, posInLevel: i, levelSize: sz, view: view.slice(), visited: visited.slice() },
          'good',
        );
      } else {
        visited.push(nodeIdx);
        emit(
          'SKIP',
          `skip ${val}`,
          `Position i = ${i} is not the last on this level (sz − 1 = ${sz - 1}), so node ${val} is hidden behind a node further right. Dequeue it but do not add it to the view.`,
          { current: nodeIdx, queue: queue.slice(), level, posInLevel: i, levelSize: sz, view: view.slice(), visited: visited.slice() },
        );
      }

      // Enqueue children (left then right) — mirrors the Go solution.
      const left = 2 * nodeIdx + 1;
      const right = 2 * nodeIdx + 2;
      const added: number[] = [];
      if (left < tree.length && tree[left] != null) added.push(left);
      if (right < tree.length && tree[right] != null) added.push(right);
      if (added.length > 0) {
        queue = queue.concat(added);
        const childVals = added.map((c) => tree[c]).join(', ');
        emit(
          'ENQ',
          `enqueue ${childVals}`,
          `Enqueue ${val}'s child${added.length === 1 ? '' : 'ren'} ${childVals} to the back of the queue so the next level is processed left-to-right.`,
          { current: nodeIdx, queue: queue.slice(), level, posInLevel: i, levelSize: sz, view: view.slice(), visited: visited.slice() },
        );
      }
    }

    level++;
  }

  emit(
    'DONE',
    `[${view.join(', ')}]`,
    `The queue is empty — every level has been processed. The side view, top to bottom, is [${view.join(', ')}].`,
    { done: true, view: view.slice(), visited: visited.slice() },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SideViewState>) {
  const s = frame.state;
  const nodeClass = (i: number): string => {
    if (s.current === i) return 'team-1';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        level = <span className="font-mono text-ink">{s.level}</span>
        {s.levelSize !== null && !s.done && (
          <>
            {' · '}sz = <span className="font-mono text-ink">{s.levelSize}</span>
            {s.posInLevel !== null && (
              <>
                {' · '}i = <span className="font-mono text-ink">{s.posInLevel}</span>
              </>
            )}
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn('mt-1 font-mono text-ink3', vizText.sm)}>
        queue [{s.queue.map((i) => s.tree[i]).join(', ')}]
      </div>
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink')}>
        side view → [{s.view.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SideViewState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curVal = s.current !== null ? s.tree[s.current] : null;
  return (
    <VarGrid>
      <InspectorRow k="level" v={s.level} />
      <InspectorRow k="sz (level size)" v={s.levelSize ?? '—'} />
      <InspectorRow k="i (pos in level)" v={s.posInLevel ?? '—'} />
      <InspectorRow k="node" v={curVal ?? '—'} />
      <InspectorRow k="queue size" v={s.queue.length} />
      <InspectorRow k="side view" v={s.view.length ? `[${s.view.join(', ')}]` : s.done ? '[]' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-print-side-view';
export const title = 'Print side view';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Print side view\"?",
    choices: [
      {
        label: "BFS rightmost — fits this problem",
        correct: true
      },
      {
        label: "Two Pointers (linked-list intersection — different approach"
      },
      {
        label: "DFS with max tracking — different approach"
      },
      {
        label: "BFS + Sort per column — different approach"
      }
    ],
    explain: "Take the last node seen on each BFS level"
  },
  {
    id: "init",
    prompt: "At the start of a run (Print side view), what strategy is established?",
    choices: [
      {
        label: "Take the last node seen — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "Right-side view: standing to the RIGHT of the tree, we see only the last node on each level. We BFS level by level; on every level the final node dequeued (i === sz − 1) is the one we can see."
  },
  {
    id: "key-step",
    prompt: "On the \"SKIP\" step (skip ), what happens?",
    choices: [
      {
        label: "Position i = — this move caption",
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
    explain: "Position i =  is not the last on this level (sz − 1 = ), so node  is hidden behind a node further right. Dequeue it but do not add it to the view."
  },
  {
    id: "state",
    prompt: "What does the `queue` field track in the visualization state?",
    choices: [
      {
        label: "node indices still waiting — updated each frame",
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
    explain: "The recorder keeps `queue` in sync: node indices still waiting in the BFS queue"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Print side view\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(h) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(1) amortized time, O(h) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). i==sz-1 -> append node.Val"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "The queue is empty — every — final DONE caption",
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
    explain: "The queue is empty — every level has been processed. The side view, top to bottom, is []."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    // Level-order:      1
    //                 /   \
    //                2     3
    //                 \     \
    //                  5     4      → side view [1, 3, 4]
    { id: 'sv1', label: '[1,2,3,null,5,null,4]', value: { tree: [1, 2, 3, null, 5, null, 4] } },
    // Level-order:      1
    //                 /   \
    //                2     3
    //               / \
    //              4   5           → side view [1, 3, 5]
    { id: 'sv2', label: '[1,2,3,4,5]', value: { tree: [1, 2, 3, 4, 5] } },
  ] satisfies SampleInput<SideViewInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SideViewState | undefined;
    const v = s?.view ?? [];
    return { ok: true, label: `[${v.join(', ')}]` };
  },
};

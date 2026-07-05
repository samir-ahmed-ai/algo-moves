import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/board/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface IsCompleteInput {
  // Level-order array; null marks a missing node. Children of i are 2i+1, 2i+2.
  tree: (number | null)[];
}

interface IsCompleteState {
  tree: (number | null)[];
  queue: (number | null)[]; // remaining BFS queue (node indices; null = missing-child marker)
  visited: number[]; // real node indices already dequeued
  current: number | null; // real node index currently being processed
  end: boolean; // a gap (null) has been seen — no real node may follow
  result: boolean | null; // final answer once decided
  done: boolean;
}

// The Go solution enqueues node.Left and node.Right (which may be nil). We mirror
// that by enqueuing child *indices* into the level-order array; a child slot that
// is out of range or holds null becomes a `null` queue entry (the "nil" marker).
function record({ tree }: IsCompleteInput): Frame<IsCompleteState>[] {  const visited: number[] = [];
  let queue: (number | null)[] = [];
  let end = false;

  const { emit, frames } = createRecorder<IsCompleteState>(() => ({
        tree,
        queue: [...queue],
        visited: [...visited],
        current: null,
        end,
        result: null,
        done: false
      }));

  if (tree.length === 0 || tree[0] == null) {
    emit(
      'DONE',
      'empty',
      'The tree is empty, and an empty tree is trivially complete. Return true.',
      { result: true, done: true },
      'good',
    );
    return frames;
  }

  queue = [0];
  emit(
    'INIT',
    'root queued',
    'Is Complete: a binary tree is complete when every level except possibly the last is full, and the last level fills left-to-right with no gaps. We run a BFS that also enqueues missing children as "nil" markers. Start with the root in the queue.',
    { current: null },
  );

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node == null) {
      // Dequeued a "nil" — mark that a gap has been seen.
      end = true;
      emit(
        'GAP',
        'nil seen',
        'We dequeued a nil (a missing child). From now on the completeness flag is set: any real node we meet after this gap would break the left-to-right fill.',
        { current: null, end: true },
      );
      continue;
    }

    if (end) {
      // A real node appeared after a gap — not complete.
      emit(
        'BREAK',
        'node after gap',
        `We dequeued real node ${tree[node]} after already seeing a gap. A real node following a nil means an earlier level had a hole, so the tree is NOT complete. Return false.`,
        { current: node, end: true, result: false, done: true },
        'bad',
      );
      return frames;
    }

    // Process this real node: record it and enqueue both children (nil-aware).
    visited.push(node);
    const left = 2 * node + 1;
    const right = 2 * node + 2;
    const leftEntry = left < tree.length && tree[left] != null ? left : null;
    const rightEntry = right < tree.length && tree[right] != null ? right : null;
    queue.push(leftEntry, rightEntry);
    emit(
      'VISIT',
      `visit ${tree[node]}`,
      `Dequeued real node ${tree[node]}. Enqueue its children: left ${
        leftEntry != null ? `= ${tree[leftEntry]}` : 'is nil'
      } and right ${
        rightEntry != null ? `= ${tree[rightEntry]}` : 'is nil'
      }. Nil children stay in the queue as gap markers.`,
      { current: node, end: false },
    );
  }

  emit(
    'DONE',
    'complete',
    'The queue is empty and we never saw a real node after a gap. Every level filled left-to-right without holes, so the tree IS complete. Return true.',
    { current: null, result: true, done: true },
    'good',
  );
  return frames;
}

function nodeClassFor(s: IsCompleteState, i: number): string {
  if (s.current === i) return 'team-1';
  if (s.visited.includes(i)) return 'team-2';
  return 'team-0';
}

function View({ frame }: PluginViewProps<IsCompleteState>) {
  const s = frame.state;
  const queueLabel = s.queue.map((q) => (q == null ? 'nil' : String(s.tree[q]))).join(', ');
  const verdictText =
    s.result === null ? '…' : s.result ? 'complete' : 'NOT complete';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        end flag ={' '}
        <span className={cn('font-mono', s.end ? 'text-warn' : 'text-ink')}>
          {String(s.end)}
        </span>
        {' · '}answer ={' '}
        <span
          className={cn(
            'font-mono',
            s.result === null ? 'text-ink' : s.result ? 'text-good' : 'text-bad',
          )}
        >
          {verdictText}
        </span>
      </div>
      <TreeBoard
        tree={s.tree}
        nodeClass={(i) => nodeClassFor(s, i)}
        activeNode={s.current}
      />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        queue [{queueLabel}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<IsCompleteState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current node" v={s.current !== null ? s.tree[s.current] ?? '—' : '—'} />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow k="queue size" v={s.queue.length} />
      <InspectorRow k="end flag" v={String(s.end)} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? '—' : '…') : s.result ? 'complete' : 'not complete'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-is-complete';
export const title = 'Is complete';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Is complete\"?",
    choices: [
      {
        label: "Level order fill — fits this problem",
        correct: true
      },
      {
        label: "Inorder flatten — different approach"
      },
      {
        label: "Preorder DFS — different approach"
      },
      {
        label: "N-ary tree DFS height — different approach"
      }
    ],
    explain: "BFS including nils; once a gap appears, no real node may follow"
  },
  {
    id: "key-step",
    prompt: "On the \"VISIT\" step (visit ), what happens?",
    choices: [
      {
        label: "Dequeued real node . Enqueue — this move caption",
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
    explain: "Dequeued real node . Enqueue its children: left ${\n        leftEntry != null ? "
  },
  {
    id: "state",
    prompt: "What does the `queue` field track in the visualization state?",
    choices: [
      {
        label: "remaining BFS queue (node indices; — updated each frame",
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
    explain: "The recorder keeps `queue` in sync: remaining BFS queue (node indices; null = missing-child marker)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Is complete\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(1) amortized time, O(h) space — wrong order of growth"
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n^2) time, O(h) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). queue with nils; nil sets end flag; real node after end -> false"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Dequeued real node . Enqueue — final DONE caption",
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
    explain: "Dequeued real node . Enqueue its children: left ${\n        leftEntry != null ? "
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    // Complete: every level full, last level fills left-to-right (no gaps).
    { id: 'ic1', label: '[1,2,3,4,5,6] → complete', value: { tree: [1, 2, 3, 4, 5, 6] } },
    // Not complete: node 2 skips its left child but has a right child → gap then real node.
    { id: 'ic2', label: '[1,2,3,4,null,null,7] → not', value: { tree: [1, 2, 3, 4, null, null, 7] } },
  ] satisfies SampleInput<IsCompleteInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IsCompleteState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'complete' : 'not complete' };
  },
};

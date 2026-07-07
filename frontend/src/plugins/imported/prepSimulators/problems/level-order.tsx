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
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface LevelOrderInput {
  // Binary tree in level-order form; null marks an absent slot.
  // Children of index i live at 2i+1 and 2i+2.
  tree: (number | null)[];
}

interface LevelOrderState {
  tree: (number | null)[];
  queue: number[]; // node indices currently waiting in the BFS queue
  visited: number[]; // node indices already popped and recorded
  active: number | null; // node index being processed this step
  level: number; // which level we are building (0-based)
  levelSoFar: number[]; // values collected for the in-progress level
  out: number[][]; // finished levels
  done: boolean;
}

function record({ tree }: LevelOrderInput): Frame<LevelOrderState>[] {
  let queue: number[] = [];
  const visited: number[] = [];
  const out: number[][] = [];

  const { emit, frames } = createRecorder<LevelOrderState>(() => ({
    tree,
    queue: queue.slice(),
    visited: visited.slice(),
    active: null,
    level: out.length,
    levelSoFar: [],
    out: out.map((l) => l.slice()),
    done: false,
  }));

  const valAt = (i: number) => tree[i] as number;

  if (tree.length === 0 || tree[0] == null) {
    emit(
      'DONE',
      'empty',
      'The tree is empty, so the level order traversal is an empty list.',
      { done: true },
      'bad',
    );
    return frames;
  }

  queue = [0];
  emit(
    'INIT',
    'seed root',
    `Level order (BFS): visit the tree level by level, top to bottom, left to right. Seed the queue with the root (${valAt(0)}). Each outer pass empties the current queue as one whole level.`,
    { queue: [0] },
  );

  let level = 0;
  while (queue.length > 0) {
    const sz = queue.length; // snapshot: exactly one level's worth of nodes
    const levelSoFar: number[] = [];
    emit(
      'LEVEL',
      `size=${sz}`,
      `Snapshot the queue size: sz = ${sz}. Those ${sz} node(s) form level ${level}. Pop exactly ${sz} node(s), appending each child behind them so the next pass sees level ${level + 1}.`,
      { level, levelSoFar: [] },
    );

    for (let i = 0; i < sz; i++) {
      const node = queue[0];
      queue = queue.slice(1);
      levelSoFar.push(valAt(node));
      visited.push(node);
      emit(
        'POP',
        `pop ${valAt(node)}`,
        `Pop node ${valAt(node)} and record its value into level ${level} (now [${levelSoFar.join(', ')}]).`,
        { active: node, level, levelSoFar: levelSoFar.slice() },
      );

      const left = 2 * node + 1;
      const right = 2 * node + 2;
      if (left < tree.length && tree[left] != null) {
        queue.push(left);
        emit(
          'PUSH',
          `push ${valAt(left)}`,
          `Node ${valAt(node)} has a left child ${valAt(left)}. Enqueue it — it belongs to the next level.`,
          { active: node, level, levelSoFar: levelSoFar.slice() },
        );
      }
      if (right < tree.length && tree[right] != null) {
        queue.push(right);
        emit(
          'PUSH',
          `push ${valAt(right)}`,
          `Node ${valAt(node)} has a right child ${valAt(right)}. Enqueue it — it belongs to the next level.`,
          { active: node, level, levelSoFar: levelSoFar.slice() },
        );
      }
    }

    out.push(levelSoFar.slice());
    emit(
      'FLUSH',
      `level ${level} = [${levelSoFar.join(',')}]`,
      `Level ${level} is complete: [${levelSoFar.join(', ')}]. Append it to the output and move on to the ${queue.length > 0 ? 'next level' : 'end'}.`,
      { level, levelSoFar: levelSoFar.slice() },
      'good',
    );
    level++;
  }

  emit(
    'DONE',
    `${out.length} levels`,
    `Every node has been visited. The traversal produced ${out.length} level(s): ${out.map((l) => `[${l.join(',')}]`).join(', ')}.`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LevelOrderState>) {
  const s = frame.state;
  const inQueue = new Set(s.queue);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (inQueue.has(i)) return 'team-1';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  const queueVals = s.queue.map((i) => String(s.tree[i] as number));
  const outItems = s.out.map((l) => `[${l.join(',')}]`);
  const activeVal = s.active !== null ? String(s.tree[s.active] as number) : '—';
  const levelSoFarStr = s.levelSoFar.length > 0 ? `[${s.levelSoFar.join(', ')}]` : '—';
  return (
    <VizStage
      rail={
        <>
          <RailStack label="queue" items={queueVals} highlightEnd="bottom" topLabel="front" />
          <RailGroup label="scan">
            <RailStat k="level" v={s.level} />
            <RailStat k="active" v={activeVal} tone="accent" />
            <RailStat k="so far" v={levelSoFarStr} />
          </RailGroup>
          <RailStack label="out" items={outItems} />
          {s.done && (
            <RailResult
              label="levels"
              value={s.out.length}
              tone={s.out.length > 0 ? 'good' : 'bad'}
            />
          )}
        </>
      }
    >
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LevelOrderState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="level" v={s.level} />
      <InspectorRow k="queue size" v={s.queue.length} />
      <InspectorRow k="active" v={s.active !== null ? (s.tree[s.active] as number) : '—'} />
      <InspectorRow
        k="level so far"
        v={s.levelSoFar.length ? `[${s.levelSoFar.join(', ')}]` : '[]'}
      />
      <InspectorRow k="visited" v={s.visited.length} />
      <InspectorRow k="levels done" v={s.out.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-level-order';
export const title = 'Level order';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Level order"?',
    choices: [
      {
        label: 'BFS levels — fits this problem',
        correct: true,
      },
      {
        label: 'BST Walk — different approach',
      },
      {
        label: 'Controlled Inorder (stack of left spine) — different approach',
      },
      {
        label: 'Level order connect — different approach',
      },
    ],
    explain: 'Queue processed in level-size snapshots',
  },
  {
    id: 'key-step',
    prompt: 'On the "PUSH" step (push ), what happens?',
    choices: [
      {
        label: 'Node has a left child . — this move caption',
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
    explain: 'Node  has a left child . Enqueue it — it belongs to the next level.',
  },
  {
    id: 'state',
    prompt: 'What does the `queue` field track in the visualization state?',
    choices: [
      {
        label: 'node indices currently waiting — updated each frame',
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
    explain: 'The recorder keeps `queue` in sync: node indices currently waiting in the BFS queue',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Level order"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(h) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(n). sz=len(q); pop sz nodes, push their children',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every node has been visited. — final DONE caption',
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
    explain: 'Every node has been visited. The traversal produced  level(s): ${out.map((l) => ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'lo1', label: '[3,9,20,·,·,15,7]', value: { tree: [3, 9, 20, null, null, 15, 7] } },
    { id: 'lo2', label: '[1,2,3,4,5,6,7]', value: { tree: [1, 2, 3, 4, 5, 6, 7] } },
  ] satisfies SampleInput<LevelOrderInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LevelOrderState | undefined;
    if (!s || s.out.length === 0) return { ok: false, label: 'empty' };
    return { ok: true, label: s.out.map((l) => `[${l.join(',')}]`).join(' ') };
  },
};

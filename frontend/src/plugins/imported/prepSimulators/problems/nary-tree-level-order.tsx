import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { NaryTreeBoard, type NaryNode } from '../../../../components/board/NaryTreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { JsonBlock } from '@/components/code/JsonBlock';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// Input: an N-ary tree as a flat node list. node 0 is the root; each node lists
// the indices of its children. `null` root means the tree is empty.
interface NaryInput {
  nodes: { val: number; children: number[] }[] | null;
}

interface LevelState {
  nodes: { val: number; children: number[] }[]; // the whole tree, flat
  level: number[]; // indices in the current frontier
  next: number[]; // indices being gathered for the next frontier
  cur: number | null; // node index currently being read
  visited: number[]; // indices already emitted into a row
  res: number[][]; // finished rows (values), level by level
  depth: number; // 0-based index of the level we are building
  done: boolean;
}

function record({ nodes }: NaryInput): Frame<LevelState>[] {  const tree = nodes ?? [];

  const { emit, frames } = createRecorder<LevelState>(() => ({
        nodes: tree,
        level: [],
        next: [],
        cur: null,
        visited: [],
        res: [],
        depth: 0,
        done: false
      }));

  if (nodes === null || tree.length === 0) {
    emit(
      'INIT',
      'empty',
      'The tree is empty (root is nil), so the level order is an empty list. Return [].',
      { done: true },
      'good',
    );
    return frames;
  }

  const res: number[][] = [];
  const visited: number[] = [];
  let level: number[] = [0]; // start with the root as the only frontier node

  emit(
    'INIT',
    `root=${tree[0].val}`,
    `Level order BFS: process the whole current frontier one level at a time. Start the frontier with just the root (${tree[0].val}).`,
    { level: level.slice(), res: [], visited: [], depth: 0 },
  );

  let depth = 0;
  while (level.length > 0) {
    const row: number[] = [];
    const next: number[] = [];

    emit(
      'ROW_START',
      `level ${depth}`,
      `Begin level ${depth}. Read every node in the frontier ([${level
        .map((i) => tree[i].val)
        .join(', ')}]) into this row, and collect all of their children into the next frontier.`,
      { level: level.slice(), next: [], visited: visited.slice(), res: res.slice(), depth },
    );

    for (const idx of level) {
      row.push(tree[idx].val);
      visited.push(idx);
      for (const c of tree[idx].children) next.push(c);

      emit(
        'READ',
        `+${tree[idx].val}`,
        `Read node ${tree[idx].val}: append its value to the level-${depth} row and push its ${tree[idx].children.length} child${
          tree[idx].children.length === 1 ? '' : 'ren'
        } (${tree[idx].children.map((c) => tree[c].val).join(', ') || '—'}) onto the next frontier.`,
        {
          level: level.slice(),
          next: next.slice(),
          cur: idx,
          visited: visited.slice(),
          res: [...res.map((r) => r.slice()), row.slice()],
          depth,
        },
      );
    }

    res.push(row.slice());
    emit(
      'ROW_DONE',
      `[${row.join(',')}]`,
      `Level ${depth} is complete: [${row.join(
        ', ',
      )}]. The next frontier holds ${next.length} node${next.length === 1 ? '' : 's'} (${next
        .map((c) => tree[c].val)
        .join(', ') || 'none'}). Advance to it.`,
      { level: next.slice(), next: [], visited: visited.slice(), res: res.map((r) => r.slice()), depth },
    );

    level = next;
    depth += 1;
  }

  emit(
    'DONE',
    `${res.length} levels`,
    `The frontier is empty, so every node has been placed. The level order is ${JSON.stringify(
      res,
    )} — ${res.length} level${res.length === 1 ? '' : 's'}. Time O(n), Space O(n).`,
    { level: [], next: [], visited: visited.slice(), res: res.map((r) => r.slice()), depth, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<LevelState>) {
  const s = frame.state;
  const naryNodes: NaryNode[] = s.nodes.map((n) => ({
    label: String(n.val),
    children: n.children,
  }));
  const inLevel = new Set(s.level);
  const inNext = new Set(s.next);
  const isVisited = new Set(s.visited);
  const nodeClass = (i: number) => {
    if (s.cur === i || inLevel.has(i)) return 'team-1'; // active frontier
    if (isVisited.has(i)) return 'team-2'; // already emitted into a row
    if (inNext.has(i)) return 'team-1'; // heading into the next frontier
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        frontier ={' '}
        <span className="font-mono text-ink">
          [{s.level.map((i) => s.nodes[i].val).join(', ')}]
        </span>
        {s.next.length > 0 && (
          <>
            {' · '}next ={' '}
            <span className="font-mono text-ink">
              [{s.next.map((i) => s.nodes[i].val).join(', ')}]
            </span>
          </>
        )}
      </div>
      {s.nodes.length === 0 ? (
        <div className={cn('py-3 font-mono', vizText.base, 'text-ink3')}>empty tree</div>
      ) : (
        <NaryTreeBoard nodes={naryNodes} nodeClass={nodeClass} activeNode={s.cur} highlightNode={s.cur} />
      )}
      <div className={cn('mt-1 font-mono', vizText.sm, s.done ? 'text-good' : 'text-ink3')}>
        {s.res.length === 0 ? '[]' : `[${s.res.map((r) => `[${r.join(',')}]`).join(', ')}]`}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LevelState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="depth (level)" v={s.depth} />
      <InspectorRow k="frontier" v={`[${s.level.map((i) => s.nodes[i].val).join(', ')}]`} />
      <InspectorRow k="next frontier" v={`[${s.next.map((i) => s.nodes[i].val).join(', ')}]`} />
      <InspectorRow k="current node" v={s.cur !== null ? s.nodes[s.cur].val : '—'} />
      <InspectorRow k="rows done" v={s.res.length} />
      <div className="flex flex-col gap-1 py-[3px]">
        <span className={cn(vizText.sm, 'text-ink3')}>result</span>
        <JsonBlock value={s.res} size="xs" variant="nested" maxHeight="120px" />
      </div>
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-nary-tree-level-order';
export const title = 'Level order';

// Sample tree:            1                Second sample:      1
//                      /  |  \                               /   \
//                     3   2   4                             2     3
//                    / \                                   /|\
//                   5   6                                 4 5 6
const SAMPLE_A: NaryInput = {
  nodes: [
    { val: 1, children: [1, 2, 3] },
    { val: 3, children: [4, 5] },
    { val: 2, children: [] },
    { val: 4, children: [] },
    { val: 5, children: [] },
    { val: 6, children: [] },
  ],
};

const SAMPLE_B: NaryInput = {
  nodes: [
    { val: 1, children: [1, 2] },
    { val: 2, children: [3, 4, 5] },
    { val: 3, children: [] },
    { val: 4, children: [] },
    { val: 5, children: [] },
    { val: 6, children: [] },
  ],
};






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Level order\"?",
    choices: [
      {
        label: "N-ary BFS level order — fits this problem",
        correct: true
      },
      {
        label: "Tree build + iterative pre-order — different approach"
      },
      {
        label: "DFS with max tracking — different approach"
      },
      {
        label: "BFS + Sort per column — different approach"
      }
    ],
    explain: "Process the whole frontier, gathering all children into the next level"
  },
  {
    id: "init",
    prompt: "At the start of a run (Level order), what strategy is established?",
    choices: [
      {
        label: "Process the whole frontier, gathering — described in INIT caption",
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
    explain: "Level order BFS: process the whole current frontier one level at a time. Start the frontier with just the root ()."
  },
  {
    id: "key-step",
    prompt: "On the \"READ\" step (+), what happens?",
    choices: [
      {
        label: "Read node : append its value — this move caption",
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
    explain: "Read node : append its value to the level- row and push its  child () onto the next frontier."
  },
  {
    id: "state",
    prompt: "What does the `nodes` field track in the visualization state?",
    choices: [
      {
        label: "the whole tree, flat — updated each frame",
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
    explain: "The recorder keeps `nodes` in sync: the whole tree, flat"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Level order\"?",
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
    explain: "O(n). O(n). row = frontier vals; next frontier = all children"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "The frontier is empty, so every — final DONE caption",
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
    explain: "The frontier is empty, so every node has been placed. The level order is  —  level. Time O(n), Space O(n)."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'lo-a', label: '1 → (3,2,4) → (5,6)', value: SAMPLE_A },
    { id: 'lo-b', label: '1 → (2,3) → (4,5,6)', value: SAMPLE_B },
  ] satisfies SampleInput<NaryInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LevelState | undefined;
    const res = s?.res ?? [];
    return {
      ok: true,
      label: res.length === 0 ? '[]' : `[${res.map((r) => `[${r.join(',')}]`).join(', ')}]`,
    };
  },
};

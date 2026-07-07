import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { GraphBoard } from '../../../../components/board/GraphBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import {
  InspectorRow,
  RailGroup,
  RailResult,
  RailStack,
  RailStat,
  VarGrid,
  VizEmpty,
  VizStage,
} from '../../../_shared/vizKit';
import { layeredLayout } from '../../../_shared/graphLayout';

// adj is a DAG: an edge u → v means u must come before v in the order.
interface TSInput {
  adj: number[][];
  pos: [number, number][];
}

// color: 0 = white (unvisited) → team-0, 1 = grey (on the DFS stack) → team-2, 2 = black (finished) → team-1
interface TSState {
  adj: number[][];
  pos: [number, number][];
  color: number[];
  active: number | null;
  postorder: number[]; // nodes in finish order (pushed on exit)
  order: number[]; // the topological order so far (reversed postorder), shown once built
  highlight: [number, number] | null;
  done: boolean;
}

function record({ adj, pos }: TSInput): Frame<TSState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const postorder: number[] = [];

  const { emit, frames } = createRecorder<TSState>(() => ({
    adj,
    pos,
    color: color.slice(),
    active: null,
    postorder: postorder.slice(),
    order: [],
    highlight: null,
    done: false,
  }));

  emit(
    'INIT',
    'empty stack',
    'Topological sort by DFS post-order. We explore each node depth-first and push it onto a stack only after every node it points to has finished. Reversing that finish-order stack at the end yields a valid topological order of the DAG.',
    { active: null, highlight: null, order: [] },
  );

  const dfs = (v: number): void => {
    color[v] = 1;
    emit(
      'ENTER',
      `enter ${v}`,
      `Enter node ${v} and colour it grey; explore its outgoing edges before finishing it.`,
      { active: v, highlight: null, order: [] },
    );

    for (const nb of adj[v]) {
      if (color[nb] === 0) {
        emit(
          'WALK',
          `${v}→${nb}`,
          `Node ${v} points to unvisited node ${nb}; recurse into ${nb} so it finishes first.`,
          { active: v, highlight: [v, nb], order: [] },
        );
        dfs(nb);
        emit(
          'RESUME',
          `resume ${v}`,
          `Returned to node ${v} after ${nb} finished; continue with its remaining edges.`,
          { active: v, highlight: null, order: [] },
        );
      }
    }

    color[v] = 2;
    postorder.push(v);
    emit(
      'PUSH',
      `push ${v} → stack [${postorder.join(', ')}]`,
      `All of node ${v}'s successors are finished, so colour ${v} black and push it onto the finish-order stack (now [${postorder.join(', ')}]).`,
      { active: v, highlight: null, order: [] },
    );
  };

  for (let i = 0; i < n; i++) {
    if (color[i] === 0) dfs(i);
  }

  const order = postorder.slice().reverse();
  emit(
    'DONE',
    `order [${order.join(', ')}]`,
    `Every node is black. Reverse the finish-order stack [${postorder.join(', ')}] to get the topological order: [${order.join(', ')}].`,
    { active: null, highlight: null, order, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<TSState>) {
  const s = frame.state;
  return (
    <VizStage
      rail={
        <>
          <RailStack label="finish stack" items={s.postorder.map(String)} />
          <RailGroup label="scan">
            <RailStat k="current" v={s.active ?? '—'} tone="accent" />
            <RailStat k="finished" v={`${s.postorder.length}/${s.adj.length}`} />
          </RailGroup>
          {s.done && (
            <RailResult label="topo order" value={`[${s.order.join(', ')}]`} tone="good" />
          )}
        </>
      }
    >
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        highlightEdge={s.highlight}
        edgeTone="active"
        directed
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TSState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="finish stack" v={s.postorder.length ? `[${s.postorder.join(', ')}]` : '∅'} />
      <InspectorRow k="finished" v={`${s.postorder.length} / ${s.adj.length}`} />
      <InspectorRow k="topo order" v={s.order.length ? `[${s.order.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

// 6-node DAG, laid out in three left→right layers for readability.
// Edges (u → v: u before v): 0→2, 0→3, 1→3, 2→4, 3→4, 3→5.
const DAG: TSInput = {
  adj: [[2, 3], [3], [4], [4, 5], [], []],
  pos: layeredLayout(
    [
      [0, 1],
      [2, 3],
      [4, 5],
    ],
    6,
  ),
};

export const manifestId = 'imp-0-08-topological-sort-with-dfs';
export const title = 'Topological Sort with DFS';

export const simulator: ProblemSimulator = {
  inputs: [{ id: 'dag6', label: '6-node DAG', value: DAG }] satisfies SampleInput<TSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TSState | undefined;
    const order = s ? s.order : [];
    return { ok: true, label: `order [${order.join(', ')}]` };
  },
};

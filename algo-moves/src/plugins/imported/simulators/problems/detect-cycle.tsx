import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface DCInput {
  adj: number[][];
  pos: [number, number][];
}

// color: 0 = white (unvisited) → team-0, 1 = gray (on the DFS stack) → team-2, 2 = black (done) → team-1
interface DCState {
  adj: number[][];
  pos: [number, number][];
  color: number[];
  active: number | null;
  stack: number[]; // nodes currently on the recursion stack (gray), for the inspector
  backEdge: [number, number] | null;
  cycle: boolean;
  done: boolean;
}

function record({ adj, pos }: DCInput): Frame<DCState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const stack: number[] = [];  let cycle = false;

  const { emit, frames } = createRecorder<DCState>(() => ({
        adj: adj,
        pos: pos,
        color: color.slice(),
        stack: stack.slice(),
        cycle: cycle,
        active: null,
        backEdge: null,
        done: false
      }));

  emit('INIT', 'all white', 'Directed cycle detection by 3-colour DFS. White nodes are untouched, grey nodes sit on the current recursion stack, and black nodes are fully explored. An edge into a grey node is a back edge — that closes a cycle.', { active: null, backEdge: null });

  const dfs = (v: number): boolean => {
    color[v] = 1; // grey: now on the recursion stack
    stack.push(v);
    emit('ENTER', `enter ${v} (grey)`, `Enter node ${v} and colour it grey — it is now on the recursion stack.`, { active: v, backEdge: null });

    for (const nb of adj[v]) {
      if (color[nb] === 1) {
        cycle = true;
        emit('BACK', `back edge ${v}→${nb}`, `Edge ${v} → ${nb} points at grey node ${nb}, which is still on the stack. That is a back edge, so the directed graph has a cycle.`, { active: v, backEdge: [v, nb] }, 'bad');
        return true;
      }
      if (color[nb] === 0) {
        emit('WALK', `walk ${v}→${nb}`, `From node ${v}, follow the edge to white neighbour ${nb} and recurse.`, { active: v, backEdge: [v, nb] });
        if (dfs(nb)) return true;
        emit('RESUME', `resume ${v}`, `Back at node ${v} after exploring the subtree rooted at ${nb}; continue with its remaining edges.`, { active: v, backEdge: null });
      }
    }

    color[v] = 2; // black: done
    stack.pop();
    emit('LEAVE', `leave ${v} (black)`, `Node ${v} has no unexplored edges — colour it black, pop it off the stack, and back out.`, { active: v, backEdge: null });
    return false;
  };

  for (let i = 0; i < n; i++) {
    if (color[i] === 0) {
      if (dfs(i)) break;
    }
  }

  if (cycle) {
    emit('DONE', 'cycle: true', 'A back edge was found, so the directed graph contains a cycle. Answer: true.', { active: null, backEdge: null , done: true }, 'bad');
  } else {
    emit('DONE', 'cycle: false', 'Every node turned black with no back edge along the way, so the directed graph is acyclic. Answer: false.', { active: null, backEdge: null , done: true }, 'good');
  }
  return frames;
}

function View({ frame }: PluginViewProps<DCState>) {
  const s = frame.state;
  const black = s.color.filter((c) => c === 2).length;
  const rail = (
    <>
      <RailStack
        label="stack (grey)"
        items={s.stack.map(String)}
        topLabel="top"
      />
      <RailGroup label="scan">
        <RailStat k="current" v={s.active ?? '—'} tone="accent" />
        <RailStat k="back edge" v={s.backEdge ? `${s.backEdge[0]}→${s.backEdge[1]}` : '—'} tone={s.backEdge ? 'bad' : undefined} />
        <RailStat k="finished" v={`${black} / ${s.adj.length}`} />
      </RailGroup>
      {s.done && (
        <RailResult label="cycle?" value={s.cycle ? 'true' : 'false'} tone={s.cycle ? 'bad' : 'good'} />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        highlightEdge={s.backEdge}
        edgeTone={s.cycle ? 'clash' : 'active'}
        directed
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DCState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const black = s.color.filter((c) => c === 2).length;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="stack (grey)" v={s.stack.length ? `[${s.stack.join(', ')}]` : '∅'} />
      <InspectorRow k="back edge" v={s.backEdge ? `${s.backEdge[0]}→${s.backEdge[1]}` : '—'} />
      <InspectorRow k="finished" v={`${black} / ${s.adj.length}`} />
      <InspectorRow k="cycle" v={s.done ? (s.cycle ? 'true' : 'false') : '…'} />
    </VarGrid>
  );
}

// Cyclic: 0→1→2→0 plus a tail, so DFS finds the back edge 2→0.
const CYCLIC: DCInput = {
  adj: [[1], [2], [0, 3], [4], []],
  pos: circleLayout(5),
};
// Acyclic DAG: edges only go "forward", no node ever points back onto the stack.
const ACYCLIC: DCInput = {
  adj: [[1, 2], [3], [3], [4], []],
  pos: circleLayout(5),
};

export const manifestId = 'imp-23-detect-cycle';
export const title = 'Detect Cycle';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'cyclic', label: 'cyclic (true)', value: CYCLIC },
    { id: 'acyclic', label: 'acyclic (false)', value: ACYCLIC },
  ] satisfies SampleInput<DCInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DCState | undefined;
    const cycle = s ? s.cycle : false;
    return { ok: true, label: `cycle: ${cycle}` };
  },
};

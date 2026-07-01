import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const stack: number[] = [];
  const frames: Frame<DCState>[] = [];
  let cycle = false;

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    backEdge: [number, number] | null,
    tone?: 'good' | 'bad',
  ): void => {
    frames.push({
      move: { type, note, caption, tone },
      state: {
        adj,
        pos,
        color: color.slice(),
        active,
        stack: stack.slice(),
        backEdge,
        cycle,
        done: type === 'DONE',
      },
    });
  };

  emit(
    'INIT',
    'all white',
    'Directed cycle detection by 3-colour DFS. White nodes are untouched, grey nodes sit on the current recursion stack, and black nodes are fully explored. An edge into a grey node is a back edge — that closes a cycle.',
    null,
    null,
  );

  const dfs = (v: number): boolean => {
    color[v] = 1; // grey: now on the recursion stack
    stack.push(v);
    emit('ENTER', `enter ${v} (grey)`, `Enter node ${v} and colour it grey — it is now on the recursion stack.`, v, null);

    for (const nb of adj[v]) {
      if (color[nb] === 1) {
        cycle = true;
        emit(
          'BACK',
          `back edge ${v}→${nb}`,
          `Edge ${v} → ${nb} points at grey node ${nb}, which is still on the stack. That is a back edge, so the directed graph has a cycle.`,
          v,
          [v, nb],
          'bad',
        );
        return true;
      }
      if (color[nb] === 0) {
        emit('WALK', `walk ${v}→${nb}`, `From node ${v}, follow the edge to white neighbour ${nb} and recurse.`, v, [v, nb]);
        if (dfs(nb)) return true;
        emit('RESUME', `resume ${v}`, `Back at node ${v} after exploring the subtree rooted at ${nb}; continue with its remaining edges.`, v, null);
      }
    }

    color[v] = 2; // black: done
    stack.pop();
    emit('LEAVE', `leave ${v} (black)`, `Node ${v} has no unexplored edges — colour it black, pop it off the stack, and back out.`, v, null);
    return false;
  };

  for (let i = 0; i < n; i++) {
    if (color[i] === 0) {
      if (dfs(i)) break;
    }
  }

  if (cycle) {
    emit('DONE', 'cycle: true', 'A back edge was found, so the directed graph contains a cycle. Answer: true.', null, null, 'bad');
  } else {
    emit('DONE', 'cycle: false', 'Every node turned black with no back edge along the way, so the directed graph is acyclic. Answer: false.', null, null, 'good');
  }
  return frames;
}

function View({ frame }: PluginViewProps<DCState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        directed cycle? <span className="font-mono text-ink">{s.done ? (s.cycle ? 'true' : 'false') : '…'}</span>
      </div>
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
    </div>
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

export const simulator: DpSimulator = {
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

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CGInput {
  adj: number[][];
  pos: [number, number][];
}

interface CGState {
  adj: number[][];
  pos: [number, number][];
  color: number[]; // 0 not cloned, 1 cloned, 2 currently cloning
  active: number | null;
  inspect: number | null;
  highlightEdge: [number, number] | null;
  cloned: number;
  done: boolean;
}

function record({ adj, pos }: CGInput): Frame<CGState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const frames: Frame<CGState>[] = [];
  let cloned = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    inspect: number | null,
    highlightEdge: [number, number] | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { adj, pos, color: color.slice(), active, inspect, highlightEdge, cloned, done: type === 'DONE' },
    });

  emit(
    'INIT',
    'DFS clone',
    'Deep-copy the graph with DFS: visit each node once, create its clone the first time we see it (memoised so cycles terminate), then recurse into its neighbours and wire up the cloned edges.',
    null,
    null,
    null,
  );

  const dfs = (v: number) => {
    color[v] = 2;
    emit('ENTER', `clone ${v}`, `First visit to node ${v} — create its clone and memoise it before recursing, so a cycle back to ${v} reuses this copy.`, v, null, null);
    color[v] = 1;
    cloned += 1;

    for (const nb of adj[v]) {
      if (color[nb] === 0) {
        emit('DESCEND', `edge ${v}→${nb}`, `Node ${v} has neighbour ${nb}, which is not cloned yet — recurse into ${nb} to build its copy.`, v, nb, [v, nb]);
        dfs(nb);
        emit('RETURN', `wire ${v}-${nb}`, `Back at node ${v}: attach the freshly cloned ${nb} to ${v}'s neighbour list.`, v, nb, [v, nb]);
      } else {
        emit('MEMO', `reuse ${nb}`, `Neighbour ${nb} is already cloned — reuse the memoised copy and add it to node ${v}'s neighbours (no re-visit).`, v, nb, [v, nb]);
      }
    }
  };

  dfs(0);

  emit('DONE', `${cloned} cloned`, `DFS finished — all ${cloned} node${cloned === 1 ? '' : 's'} cloned and every edge rewired onto the copies.`, null, null, null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<CGState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        cloned <span className="font-mono text-ink">{s.cloned}</span> / {s.adj.length} nodes
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        inspectNode={s.inspect}
        highlightEdge={s.highlightEdge}
        edgeTone="active"
        height={260}
      />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CGState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="cloned" v={`${s.cloned} / ${s.adj.length}`} />
    </VarGrid>
  );
}

// 5-node undirected graph with a cycle, to show memoised reuse.
const G5: CGInput = {
  adj: [
    [1, 2],
    [0, 2, 3],
    [0, 1, 4],
    [1, 4],
    [2, 3],
  ],
  pos: circleLayout(5),
};

// 4-node square: 0-1-2-3-0.
const G4: CGInput = {
  adj: [
    [1, 3],
    [0, 2],
    [1, 3],
    [0, 2],
  ],
  pos: circleLayout(4),
};

export const manifestId = 'imp-0-02-clone-graph';
export const title = 'Clone Graph';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'g5', label: '5 nodes', value: G5 },
    { id: 'g4', label: '4 nodes', value: G4 },
  ] satisfies SampleInput<CGInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CGState | undefined;
    const c = s ? s.cloned : 0;
    return { ok: true, label: `${c} cloned` };
  },
};

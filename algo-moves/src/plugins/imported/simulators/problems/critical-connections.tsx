import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface CCInput {
  adj: number[][];
  pos: [number, number][];
}

interface CCState {
  adj: number[][];
  pos: [number, number][];
  disc: number[];
  low: number[];
  active: number | null;
  inspect: number | null;
  highlightEdge: [number, number] | null;
  bridges: [number, number][];
  done: boolean;
}

function record({ adj, pos }: CCInput): Frame<CCState>[] {
  const n = adj.length;
  const disc = new Array<number>(n).fill(-1);
  const low = new Array<number>(n).fill(-1);
  const bridges: [number, number][] = [];
  let timer = 0;

  const { emit, frames } = createRecorder<CCState>(() => ({
    adj,
    pos,
    disc: disc.slice(),
    low: low.slice(),
    active: null,
    inspect: null,
    highlightEdge: null,
    bridges: bridges.map((b) => [b[0], b[1]] as [number, number]),
    done: false,
  }));

  emit(
    'INIT',
    'Tarjan',
    `Find every bridge with Tarjan's DFS. We record disc[u] (the time we first reach u) and low[u] (the earliest node reachable from u's subtree). After exploring a tree edge (u, v), if low[v] > disc[u] then v's subtree has no back-edge above u, so (u, v) is a bridge.`,
    { active: null, inspect: null, highlightEdge: null },
  );

  const dfs = (u: number, parent: number) => {
    disc[u] = timer;
    low[u] = timer;
    timer += 1;
    emit('DISCOVER', `disc[${u}]=${disc[u]}`, `Enter node ${u}: set disc[${u}] = low[${u}] = ${disc[u]}.`, { active: u, inspect: null, highlightEdge: null });

    for (const v of adj[u]) {
      if (v === parent) continue;
      if (disc[v] === -1) {
        emit('TREE', `edge ${u}-${v}`, `Tree edge ${u} → ${v}: ${v} is undiscovered, so recurse into it.`, { active: u, inspect: v, highlightEdge: [u, v] });
        dfs(v, u);
        if (low[v] < low[u]) {
          low[u] = low[v];
          emit('LOW', `low[${u}]=${low[u]}`, `Back from ${v}: low[${v}] = ${low[v]} is smaller, so pull low[${u}] down to ${low[u]}.`, { active: u, inspect: v, highlightEdge: [u, v] });
        }
        if (low[v] > disc[u]) {
          bridges.push([u, v]);
          emit('BRIDGE', `bridge ${u}-${v}`, `low[${v}] = ${low[v]} > disc[${u}] = ${disc[u]}: nothing in ${v}'s subtree reaches above ${u}, so edge ${u}-${v} is a bridge.`, { active: u, inspect: v, highlightEdge: [u, v] });
        } else {
          emit('NOBRIDGE', `keep ${u}-${v}`, `low[${v}] = ${low[v]} ≤ disc[${u}] = ${disc[u]}: a back-edge bypasses ${u}-${v}, so it is not a bridge.`, { active: u, inspect: v, highlightEdge: [u, v] });
        }
      } else if (disc[v] < low[u]) {
        low[u] = disc[v];
        emit('BACK', `low[${u}]=${low[u]}`, `Back edge ${u} → ${v}: ${v} is already visited at disc ${disc[v]}, so lower low[${u}] to ${low[u]}.`, { active: u, inspect: v, highlightEdge: [u, v] });
      }
    }
  };

  dfs(0, -1);

  const bridgeText = bridges.length ? bridges.map((b) => `(${b[0]}, ${b[1]})`).join(', ') : 'none';
  emit('DONE', `${bridges.length} bridges`, `DFS complete. Critical connections (bridges): ${bridgeText}.`, { active: null, inspect: null, highlightEdge: null, done: true }, 'good');
  return frames;
}

function isBridge(s: CCState, v: number, u: number): boolean {
  return s.bridges.some((b) => (b[0] === v && b[1] === u) || (b[0] === u && b[1] === v));
}

function View({ frame }: PluginViewProps<CCState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="node">
        <RailStat k="active" v={s.active ?? '—'} tone={s.active !== null ? 'accent' : undefined} />
        <RailStat k="inspect" v={s.inspect ?? '—'} />
      </RailGroup>
      <RailStack
        label="bridges"
        items={s.bridges.map((b) => `(${b[0]},${b[1]})`)}
        topLabel="latest"
      />
      {s.done && (
        <RailResult
          label="total"
          value={s.bridges.length}
          tone={s.bridges.length > 0 ? 'good' : 'bad'}
        />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => (s.disc[node] === -1 ? 'team-0' : node === s.active ? 'team-1' : 'team-2')}
        activeNode={s.active}
        inspectNode={s.inspect}
        highlightEdge={s.highlightEdge}
        edgeTone={s.highlightEdge && isBridge(s, s.highlightEdge[0], s.highlightEdge[1]) ? 'clash' : 'active'}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CCState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const fmt = (arr: number[]) => `[${arr.map((x) => (x === -1 ? '·' : x)).join(', ')}]`;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="disc" v={fmt(s.disc)} />
      <InspectorRow k="low" v={fmt(s.low)} />
      <InspectorRow k="bridges" v={s.bridges.length ? s.bridges.map((b) => `(${b[0]},${b[1]})`).join(' ') : '∅'} />
    </VarGrid>
  );
}

// 0-1-2 triangle, then bridge 2-3 and bridge 3-4 (a tail).
const G5: CCInput = {
  adj: [[1, 2], [0, 2], [1, 0, 3], [2, 4], [3]],
  pos: circleLayout(5),
};
// Two triangles joined by a single bridge (1-3).
const G6: CCInput = {
  adj: [[1, 2], [0, 2, 3], [0, 1], [1, 4, 5], [3, 5], [3, 4]],
  pos: circleLayout(6),
};

export const manifestId = 'imp-25-critical-connections-in-a-network';
export const title = 'Critical Connections in a Network';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g5', label: '5 nodes', value: G5 },
    { id: 'g6', label: '6 nodes', value: G6 },
  ] satisfies SampleInput<CCInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CCState | undefined;
    return { ok: true, label: `${s ? s.bridges.length : 0} bridges` };
  },
};

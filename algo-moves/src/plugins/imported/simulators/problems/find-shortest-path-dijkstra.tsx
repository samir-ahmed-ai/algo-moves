import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

const INF = 1e9;

interface DijkstraInput {
  n: number;
  /** [from, to, weight] directed, positive weights. */
  edges: [number, number, number][];
  src: number;
  target: number;
}

interface DijkstraState {
  adj: number[][];
  pos: [number, number][];
  /** w[v][u] = weight of edge v→u, or -1 when no edge. */
  w: number[][];
  dist: number[];
  settled: boolean[];
  active: number | null;
  edge: [number, number] | null;
  src: number;
  target: number;
  done: boolean;
}

const fmt = (d: number): string => (d >= INF ? '∞' : String(d));

function build(input: DijkstraInput): { adj: number[][]; w: number[][] } {
  const adj: number[][] = Array.from({ length: input.n }, () => []);
  const w: number[][] = Array.from({ length: input.n }, () => new Array<number>(input.n).fill(-1));
  for (const [a, b, wt] of input.edges) {
    adj[a].push(b);
    w[a][b] = wt;
  }
  return { adj, w };
}

function record(input: DijkstraInput): Frame<DijkstraState>[] {
  const n = input.n;
  const { adj, w } = build(input);
  const pos = circleLayout(n);
  const dist = new Array<number>(n).fill(INF);
  const settled = new Array<boolean>(n).fill(false);
  const { emit, frames } = createRecorder<DijkstraState>(() => ({
        adj: adj,
        pos: pos,
        w: w,
        dist: dist.slice(),
        settled: settled.slice(),
        src: input.src,
        target: input.target,
        active: null,
        edge: null,
        done: false
      }));

  dist[input.src] = 0;
  emit('INIT', `dist[${input.src}]=0`, `Dijkstra from source ${input.src}, finding the cheapest route to node ${input.target}. Set dist[${input.src}]=0 and every other tentative distance to ∞, then repeatedly settle the unsettled node with the smallest tentative distance.`, { active: null, edge: null });

  for (let count = 0; count < n; count++) {
    let u = -1;
    let best = INF;
    for (let v = 0; v < n; v++) {
      if (!settled[v] && dist[v] < best) {
        best = dist[v];
        u = v;
      }
    }
    if (u === -1) break;

    settled[u] = true;
    emit('SETTLE', `settle ${u} (${fmt(dist[u])})`, `Among unsettled nodes, ${u} has the smallest tentative distance ${fmt(dist[u])} — settle it. Its shortest distance from ${input.src} is now final at ${fmt(dist[u])}.`, { active: u, edge: null });

    for (const v of adj[u]) {
      const cand = dist[u] + w[u][v];
      if (cand < dist[v]) {
        const prev = dist[v];
        dist[v] = cand;
        emit('RELAX', `${u}→${v}: ${cand}`, `Relax edge ${u}→${v} of weight ${w[u][v]}: ${fmt(dist[u])}+${w[u][v]}=${cand}, which beats ${v}'s old ${fmt(prev)}. Lower dist[${v}] to ${cand}.`, { active: u, edge: [u, v] });
      } else {
        emit('RELAX', `${u}→${v}: keep ${fmt(dist[v])}`, `Edge ${u}→${v} of weight ${w[u][v]} offers ${fmt(dist[u])}+${w[u][v]}=${cand}, no better than ${v}'s current ${fmt(dist[v])}, so leave dist[${v}] unchanged.`, { active: u, edge: [u, v] });
      }
    }
  }

  emit('DONE', `dist=${fmt(dist[input.target])}`, `Every reachable node settled. The shortest path from ${input.src} to ${input.target} costs ${fmt(dist[input.target])} — the cheapest route is the multi-hop detour, not the single direct edge.`, { active: null, edge: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<DijkstraState>) {
  const s = frame.state;
  const settledCount = s.settled.filter(Boolean).length;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="active" v={s.active ?? '—'} tone="accent" />
        <RailStat k="settled" v={`${settledCount}/${s.adj.length}`} />
      </RailGroup>
      <RailStack
        label="dist[ ]"
        items={s.dist.map((d, i) => ({ label: `${i}: ${fmt(d)}`, tone: s.settled[i] ? 'good' : i === s.active ? 'accent' : undefined }))}
      />
      <RailResult label={`${s.src}→${s.target}`} value={fmt(s.dist[s.target])} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={100}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        directed
        nodeClass={(node) => (s.settled[node] ? 'team-1' : 'team-0')}
        activeNode={s.active}
        highlightEdge={s.edge}
        edgeLabel={(v, u) => (s.w[v][u] >= 0 && s.w[v][u] < INF ? s.w[v][u] : undefined)}
        height={286}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DijkstraState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const settledCount = s.settled.filter(Boolean).length;
  return (
    <VarGrid>
      <InspectorRow k="source" v={s.src} />
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="active" v={s.active ?? '—'} />
      <InspectorRow k="settled" v={`${settledCount} / ${s.adj.length}`} />
      <InspectorRow k="dist" v={`[${s.dist.map(fmt).join(', ')}]`} />
    </VarGrid>
  );
}

// Direct edge 0→5 costs 10, but the detour 0→1→2→3→5 costs 2+2+1+3 = 8.
const G6: DijkstraInput = {
  n: 6,
  edges: [
    [0, 1, 2],
    [0, 5, 10],
    [1, 2, 2],
    [1, 4, 5],
    [2, 3, 1],
    [3, 5, 3],
    [4, 5, 1],
    [2, 4, 6],
  ],
  src: 0,
  target: 5,
};

export const manifestId = 'imp-6-find-shortest-path-with-dijkstra-s';
export const title = "Find Shortest Path with Dijkstra's";

export const simulator: ProblemSimulator = {
  inputs: [{ id: 'g6', label: '6 nodes · detour wins', value: G6 }] satisfies SampleInput<DijkstraInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DijkstraState | undefined;
    return { ok: true, label: s ? `dist ${fmt(s.dist[s.target])}` : 'dist ∞' };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/board/GraphBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

const EDGE_WEIGHT = 6;

interface BSRInput {
  adj: number[][];
  pos: [number, number][];
  start: number;
}

interface BSRState {
  adj: number[][];
  pos: [number, number][];
  start: number;
  color: number[]; // 0 unvisited, 2 queued, 1 visited
  dist: number[]; // -1 = unreachable
  active: number | null;
  queue: number[];
  done: boolean;
}

function record({ adj, pos, start }: BSRInput): Frame<BSRState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const dist = new Array<number>(n).fill(-1);
  const queue: number[] = [];

  const { emit, frames } = createRecorder<BSRState>(() => ({
    adj,
    pos,
    start,
    color: color.slice(),
    dist: dist.slice(),
    active: null,
    queue: queue.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `BFS from ${start + 1}`,
    `Shortest reach by BFS from node ${start + 1}. Every edge counts as ${EDGE_WEIGHT}, so a node ${EDGE_WEIGHT}×hops away is that far. All distances start at −1 (unreachable) and BFS visits nodes layer by layer, so the first time we reach a node we have its shortest distance.`,
    { active: null },
  );

  dist[start] = 0;
  color[start] = 2;
  queue.push(start);
  emit('SEED', `dist[${start + 1}] = 0`, `Seed the queue with the source node ${start + 1}, set its distance to 0, and mark it queued.`, { active: start });

  while (queue.length > 0) {
    const v = queue.shift() as number;
    color[v] = 1;
    emit('VISIT', `visit ${v + 1}`, `Dequeue node ${v + 1} (distance ${dist[v]}) and mark it visited — its shortest distance is now final.`, { active: v });

    for (const nb of adj[v]) {
      if (dist[nb] === -1) {
        dist[nb] = dist[v] + EDGE_WEIGHT;
        color[nb] = 2;
        queue.push(nb);
        emit('RELAX', `dist[${nb + 1}] = ${dist[nb]}`, `Neighbour ${nb + 1} of ${v + 1} is unreached — set dist[${nb + 1}] = ${dist[v]} + ${EDGE_WEIGHT} = ${dist[nb]}, mark it queued, and push it. Queue is now [${queue.map((q) => q + 1).join(', ')}].`, { active: v });
      }
    }
  }

  const reachable = dist.filter((d, i) => i !== start && d >= 0).length;
  const unreachable = dist.filter((d, i) => i !== start && d < 0).length;
  emit(
    'DONE',
    `${reachable} reached`,
    `Queue empty. From node ${start + 1}: ${reachable} node(s) reached, ${unreachable} left at −1 (unreachable). Distances to all other nodes: [${dist.map((d, i) => (i === start ? null : d)).filter((d) => d !== null).join(', ')}].`,
    { active: null, done: true },
    'good',
  );
  return frames;
}

function distLabel(s: BSRState, node: number): string {
  if (node === s.start) return `${node + 1}·0`;
  const d = s.dist[node];
  return `${node + 1}·${d < 0 ? '∞' : d}`;
}

function View({ frame }: PluginViewProps<BSRState>) {
  const s = frame.state;
  const reachable = s.done ? s.dist.filter((d, i) => i !== s.start && d >= 0).length : null;
  return (
    <VizStage rail={<>
      <RailStack
        label="queue"
        items={s.queue.map((q) => q + 1)}
        topLabel="front"
        highlightEnd="bottom"
      />
      <RailGroup label="scan">
        <RailStat k="src" v={s.start + 1} />
        <RailStat k="cur" v={s.active === null ? '—' : s.active + 1} tone="accent" />
      </RailGroup>
      <RailGroup label="dist">
        {s.dist.map((d, i) => (
          <RailStat
            key={i}
            k={`n${i + 1}`}
            v={d < 0 ? '∞' : d}
            tone={i === s.start ? 'accent' : d >= 0 ? 'good' : undefined}
          />
        ))}
      </RailGroup>
      {reachable !== null && (
        <RailResult label="reached" value={reachable} tone="good" />
      )}
    </>}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        label={(node) => distLabel(s, node)}
        activeNode={s.active}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<BSRState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="source" v={s.start + 1} />
      <InspectorRow k="current" v={s.active === null ? '—' : s.active + 1} />
      <InspectorRow k="queue" v={s.queue.length ? `[${s.queue.map((q) => q + 1).join(', ')}]` : '∅'} />
      <div className="mt-1 border-t border-[var(--border)] pt-1">
        {s.dist.map((d, i) => (
          <InspectorRow key={i} k={`dist[${i + 1}]`} v={d < 0 ? '−1' : d} />
        ))}
      </div>    </VarGrid>
  );
}

// Nodes labelled 1..6; node 5 (label 6) is isolated → unreachable.
const G6: BSRInput = {
  adj: [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3], []],
  pos: circleLayout(6),
  start: 0,
};
// A 6-node line plus a branch; node 5 (label 6) dangles off node 4 but node 2's
// extra branch leaves one node further out.
const G6b: BSRInput = {
  adj: [[1], [0, 2, 3], [1, 4], [1], [2], []],
  pos: circleLayout(6),
  start: 0,
};

export const manifestId = 'imp-0-01-bfs-shortest-reach';
export const title = 'BFS Shortest Reach';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g6', label: '6 nodes', value: G6 },
    { id: 'g6b', label: '6 nodes · line', value: G6b },
  ] satisfies SampleInput<BSRInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BSRState | undefined;
    if (!s) return { ok: false, label: 'no run' };
    const reached = s.dist.filter((d, i) => i !== s.start && d >= 0).length;
    return { ok: true, label: `reached ${reached}` };
  },
};

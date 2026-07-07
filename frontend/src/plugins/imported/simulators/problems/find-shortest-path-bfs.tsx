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
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface FSPInput {
  adj: number[][];
  pos: [number, number][];
  src: number;
  dst: number;
}

interface FSPState {
  adj: number[][];
  pos: [number, number][];
  src: number;
  dst: number;
  color: number[]; // 0 unvisited, 2 queued, 1 visited, then path nodes set to 1
  dist: number[];
  parent: number[];
  active: number | null;
  queue: number[];
  path: number[]; // reconstructed path (node ids), empty until DONE
  pathEdge: [number, number] | null; // edge being lit during reconstruction
  done: boolean;
}

function record({ adj, pos, src, dst }: FSPInput): Frame<FSPState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const dist = new Array<number>(n).fill(-1);
  const parent = new Array<number>(n).fill(-1);
  const queue: number[] = [];
  let path: number[] = [];

  const { emit, frames } = createRecorder<FSPState>(() => ({
    adj,
    pos,
    src,
    dst,
    color: color.slice(),
    dist: dist.slice(),
    parent: parent.slice(),
    active: null,
    queue: queue.slice(),
    path: path.slice(),
    pathEdge: null,
    done: false,
  }));

  emit(
    'INIT',
    `${src} → ${dst}`,
    `Shortest path from ${src} to ${dst} by BFS on an unweighted graph. We track parent[] as we go; because BFS reaches every node by a shortest route, walking parents back from ${dst} rebuilds the shortest path.`,
    { active: null, pathEdge: null },
  );

  dist[src] = 0;
  color[src] = 2;
  queue.push(src);
  emit(
    'SEED',
    `queue [${src}]`,
    `Seed the queue with the source ${src}, set dist[${src}] = 0, and mark it queued.`,
    { active: src, pathEdge: null },
  );

  let found = false;
  while (queue.length > 0) {
    const v = queue.shift() as number;
    color[v] = 1;
    if (v === dst) {
      emit(
        'REACH',
        `reached ${dst}`,
        `Dequeue node ${dst} — that is the destination, so its BFS distance ${dist[dst]} is the shortest. Stop expanding and rebuild the path.`,
        { active: v, pathEdge: null },
        'good',
      );
      found = true;
      break;
    }
    emit('VISIT', `visit ${v}`, `Dequeue node ${v} (distance ${dist[v]}) and mark it visited.`, {
      active: v,
      pathEdge: null,
    });

    for (const nb of adj[v]!) {
      if (dist[nb] === -1) {
        dist[nb] = dist[v]! + 1;
        parent[nb] = v;
        color[nb] = 2;
        queue.push(nb);
        emit(
          'ENQUEUE',
          `enqueue ${nb}`,
          `Neighbour ${nb} of ${v} is unseen — set dist[${nb}] = ${dist[nb]}, parent[${nb}] = ${v}, mark it queued and push it. Queue is now [${queue.join(', ')}].`,
          { active: v, pathEdge: null },
        );
      }
    }
  }

  if (!found) {
    emit(
      'DONE',
      `no path`,
      `Queue empty and ${dst} was never reached — there is no path from ${src} to ${dst}.`,
      { active: null, pathEdge: null, done: true },
      'good',
    );
    return frames;
  }

  // Reconstruct path from dst back to src, lighting each edge.
  const full: number[] = [];
  for (let at = dst; at !== -1; at = parent[at]!) full.unshift(at);
  // Dim all, then re-light path nodes as we walk it.
  for (let i = 0; i < n; i++) color[i]! = i === src || i === dst ? color[i]! : 0;
  path = [dst];
  color[dst] = 1;
  emit('REBUILD', `path tail ${dst}`, `Start the path at the destination ${dst}.`, {
    active: dst,
    path,
    pathEdge: null,
  });
  for (let at = dst; parent[at]! !== -1; at = parent[at]!) {
    const p = parent[at]!;
    path.unshift(p);
    color[p]! = 1;
    emit(
      'REBUILD',
      `parent ${at} ← ${p}`,
      `parent[${at}] = ${p}, so step back to node ${p}. Path so far: [${path.join(' → ')}].`,
      { active: p, path: path.slice(), pathEdge: [p, at] },
    );
  }

  emit(
    'DONE',
    `len ${path.length}`,
    `Shortest path from ${src} to ${dst}: [${path.join(' → ')}] — ${path.length} nodes, ${path.length - 1} edges.`,
    { active: null, path: path.slice(), pathEdge: null, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FSPState>) {
  const s = frame.state;
  const distVal = s.dist[s.dst]! < 0 ? '—' : s.dist[s.dst];
  return (
    <VizStage
      rail={
        <>
          <RailStack
            label="queue"
            items={s.queue.map(String)}
            topLabel="front"
            highlightEnd="bottom"
          />
          <RailGroup label="scan">
            <RailStat k="node" v={s.active ?? '—'} tone="accent" />
            <RailStat k={`dist[${s.dst}]`} v={distVal} />
          </RailGroup>
          {s.done && (
            <RailResult
              label="path"
              value={s.path.length ? s.path.join(' → ') : 'none'}
              tone={s.path.length ? 'good' : 'bad'}
            />
          )}
        </>
      }
    >
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        inspectNode={s.active === null && !s.done ? null : s.active === s.dst ? null : s.dst}
        highlightEdge={s.pathEdge}
        edgeTone="active"
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<FSPState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="src → dst" v={`${s.src} → ${s.dst}`} />
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="dist[dst]" v={s.dist[s.dst]! < 0 ? '−1' : s.dist[s.dst]} />
      <InspectorRow k="path" v={s.path.length ? `[${s.path.join(' → ')}]` : '—'} />
      <div className="mt-1 border-t border-[var(--border)] pt-1">
        {s.parent.map((p, i) => (
          <InspectorRow key={i} k={`parent[${i}]`} v={p < 0 ? '—' : p} />
        ))}
      </div>{' '}
    </VarGrid>
  );
}

// 7 nodes. src 0 → dst 5. Two routes; BFS finds the 3-edge one: 0→2→6→5.
const G7: FSPInput = {
  adj: [
    [1, 2],
    [0, 3],
    [0, 3, 6],
    [1, 2, 4],
    [3, 5],
    [4, 6],
    [2, 5],
  ],
  pos: circleLayout(7),
  src: 0,
  dst: 5,
};
const G7b: FSPInput = {
  adj: [
    [1, 2],
    [0, 4],
    [0, 3],
    [2, 4, 5],
    [1, 3, 6],
    [3, 6],
    [4, 5],
  ],
  pos: circleLayout(7),
  src: 0,
  dst: 6,
};

export const manifestId = 'imp-0-03-find-shortest-path-with-bfs';
export const title = 'Find Shortest Path with BFS';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g7', label: '7 nodes · 0→5', value: G7 },
    { id: 'g7b', label: '7 nodes · 0→6', value: G7b },
  ] satisfies SampleInput<FSPInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FSPState | undefined;
    if (!s) return { ok: false, label: 'no run' };
    if (s.path.length === 0) return { ok: false, label: 'no path' };
    return { ok: true, label: `${s.path.length - 1} edges` };
  },
};

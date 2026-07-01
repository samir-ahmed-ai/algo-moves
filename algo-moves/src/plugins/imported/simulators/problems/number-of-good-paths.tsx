import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, RailGroup, RailResult, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface GPInput {
  vals: number[];
  adj: number[][];
  pos: [number, number][];
}

interface GPState {
  vals: number[];
  adj: number[][];
  pos: [number, number][];
  parent: number[];
  active: number | null;
  inspect: number | null;
  highlightEdge: [number, number] | null;
  groupVal: number | null; // the value of the group currently being processed
  res: number;
  done: boolean;
}

function record({ vals, adj, pos }: GPInput): Frame<GPState>[] {
  const n = vals.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const frames: Frame<GPState>[] = [];
  let res = n;

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    inspect: number | null,
    highlightEdge: [number, number] | null,
    groupVal: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        vals,
        adj,
        pos,
        parent: parent.slice(),
        active,
        inspect,
        highlightEdge,
        groupVal,
        res,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `res=${res}`,
    `A good path has equal endpoint values with every node in between no larger. Process nodes by value, ascending. For each value group we union neighbours that are ≤ the current value, then count pairs inside each component. Start res = ${n} (each node is a trivial good path).`,
    null,
    null,
    null,
    null,
  );

  const ids = Array.from({ length: n }, (_, i) => i).sort((a, b) => vals[a] - vals[b]);

  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && vals[ids[j]] === vals[ids[i]]) j += 1;
    const val = vals[ids[i]];
    const groupNodes = ids.slice(i, j);
    emit('GROUP', `value ${val}`, `Process the value group ${val}: nodes [${groupNodes.join(', ')}]. Union each of them with any neighbour whose value is ≤ ${val}.`, null, null, null, val);

    for (let k = i; k < j; k++) {
      const u = ids[k];
      for (const v of adj[u]) {
        if (vals[v] <= vals[u]) {
          const ru = find(u);
          const rv = find(v);
          if (ru !== rv) {
            if (vals[ru] < vals[rv]) parent[ru] = rv;
            else parent[rv] = ru;
            emit('UNION', `union ${u}-${v}`, `Neighbour ${v} (value ${vals[v]}) ≤ ${vals[u]}, so union ${u} and ${v} into one component.`, u, v, [u, v], val);
          } else {
            emit('SAME', `skip ${u}-${v}`, `Neighbour ${v} (value ${vals[v]}) ≤ ${vals[u]}, but ${u} and ${v} are already in the same component.`, u, v, [u, v], val);
          }
        }
      }
    }

    const cnt = new Map<number, number>();
    for (let k = i; k < j; k++) {
      const r = find(ids[k]);
      cnt.set(r, (cnt.get(r) ?? 0) + 1);
    }
    let added = 0;
    for (const c of cnt.values()) added += (c * (c - 1)) / 2;
    res += added;
    const sizes = [...cnt.values()].join(', ');
    emit('COUNT', `+${added}`, `Within value ${val}, the components hold [${sizes}] of these nodes. Each component of size c adds c·(c−1)/2 good paths: +${added}. res = ${res}.`, null, null, null, val);

    i = j;
  }

  emit('DONE', `${res} good paths`, `All value groups processed. Total good paths = ${res}.`, null, null, null, null, 'good');
  return frames;
}

function team(s: GPState, node: number): string {
  if (s.groupVal !== null && s.vals[node] === s.groupVal) return 'team-1';
  if (s.groupVal !== null && s.vals[node] < s.groupVal) return 'team-2';
  return 'team-0';
}

function View({ frame }: PluginViewProps<GPState>) {
  const s = frame.state;
  return (
    <VizStage rail={<>
      <RailGroup label="scan">
        <RailStat k="value" v={s.groupVal ?? '—'} tone="accent" />
        <RailStat k="paths" v={s.res} />
      </RailGroup>
      {s.done && <RailResult label="answer" value={s.res} tone="good" />}
    </>}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => team(s, node)}
        label={(node) => `${node}:${s.vals[node]}`}
        activeNode={s.active}
        inspectNode={s.inspect}
        highlightEdge={s.highlightEdge}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<GPState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="processing value" v={s.groupVal ?? '—'} />
      <InspectorRow k="good paths (res)" v={s.res} />
      <InspectorRow k="parent" v={`[${s.parent.join(', ')}]`} />
      <InspectorRow k="vals" v={`[${s.vals.join(', ')}]`} />
    </VarGrid>
  );
}

// Tree: 0-1-2, 2-3, 2-4. vals chosen so nodes 1 & 4 (both value 3) form one good path.
const T5: GPInput = {
  vals: [1, 3, 2, 1, 3],
  adj: [[1], [0, 2], [1, 3, 4], [2], [2]],
  pos: circleLayout(5),
};
// Path 0-1-2-3 with vals [1,1,1,1]: every pair is a good path -> 4 + 6 = 10.
const T4: GPInput = {
  vals: [1, 1, 1, 1],
  adj: [[1], [0, 2], [1, 3], [2]],
  pos: circleLayout(4),
};

export const manifestId = 'imp-18-number-of-good-paths';
export const title = 'Number of Good Paths';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 't5', label: '5 nodes', value: T5 },
    { id: 't4', label: '4 nodes', value: T4 },
  ] satisfies SampleInput<GPInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as GPState | undefined;
    return { ok: true, label: `${s ? s.res : 0} good paths` };
  },
};

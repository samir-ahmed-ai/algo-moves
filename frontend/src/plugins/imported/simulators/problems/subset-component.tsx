import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GraphBoard } from '../../../../components/board/GraphBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, RailGroup, RailResult, RailStat, VizStage } from '../../../_shared/vizKit';
import { circleLayout } from '../../../_shared/graphLayout';

interface SCInput {
  adj: number[][];
  pos: [number, number][];
}

interface SCState {
  adj: number[][];
  pos: [number, number][];
  color: number[]; // 0 unvisited; otherwise team colour of the owning component
  active: number | null;
  inspect: number | null;
  components: number;
  done: boolean;
}

function record({ adj, pos }: SCInput): Frame<SCState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);  let components = 0;

  const { emit, frames } = createRecorder<SCState>(() => ({
        adj: adj,
        pos: pos,
        color: color.slice(),
        components: components,
        active: null,
        inspect: null,
        done: false
      }));

  emit('INIT', 'count components', 'Count the connected components: walk over every node, and whenever we hit an unvisited one we launch a DFS that paints its whole component a single colour. Adjacent components alternate team-1 / team-2 so they stay distinct.', { active: null, inspect: null });

  for (let start = 0; start < n; start++) {
    if (color[start] !== 0) continue;
    components += 1;
    const teamColor = components % 2 === 1 ? 1 : 2;

    emit('NEW', `component #${components}`, `Node ${start} is unvisited — start component #${components}. DFS from here, painting every reachable node team-${teamColor}.`, { active: start, inspect: null });

    const stack: number[] = [start];
    color[start] = teamColor;
    while (stack.length > 0) {
      const v = stack.pop() as number;
      emit('VISIT', `visit ${v}`, `DFS reaches node ${v} and paints it team-${teamColor} as part of component #${components}.`, { active: v, inspect: null });
      for (const nb of adj[v]) {
        if (color[nb] === 0) {
          color[nb] = teamColor;
          stack.push(nb);
          emit('PUSH', `claim ${nb}`, `Neighbour ${nb} of node ${v} is unvisited — it belongs to component #${components}, so paint it team-${teamColor} and push it.`, { active: v, inspect: nb });
        }
      }
    }
  }

  emit('DONE', `${components} components`, `Every node is painted. The graph has ${components} connected component${components === 1 ? '' : 's'}.`, { active: null, inspect: null , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SCState>) {
  const s = frame.state;
  const painted = s.color.filter((c) => c !== 0).length;
  return (
    <VizStage rail={<>
      <RailGroup label="scan">
        <RailStat k="current" v={s.active ?? '—'} tone="accent" />
        <RailStat k="painted" v={`${painted}/${s.adj.length}`} />
      </RailGroup>
      <RailResult label="components" value={s.components} tone={s.done ? 'good' : 'accent'} />
    </>}>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        inspectNode={s.inspect}
        height={260}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SCState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const painted = s.color.filter((c) => c !== 0).length;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="components" v={s.components} />
      <InspectorRow k="painted" v={`${painted} / ${s.adj.length}`} />
    </VarGrid>
  );
}

// 7 nodes, 3 components: {0,1,2}, {3,4}, {5,6}.
const G3: SCInput = {
  adj: [
    [1, 2],
    [0, 2],
    [0, 1],
    [4],
    [3],
    [6],
    [5],
  ],
  pos: circleLayout(7),
};

// 6 nodes, 2 components: {0,1,2,3}, {4,5}.
const G2: SCInput = {
  adj: [
    [1, 2],
    [0, 3],
    [0, 3],
    [1, 2],
    [5],
    [4],
  ],
  pos: circleLayout(6),
};

export const manifestId = 'imp-1-subset-component';
export const title = 'Subset Component';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g3', label: '3 components', value: G3 },
    { id: 'g2', label: '2 components', value: G2 },
  ] satisfies SampleInput<SCInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SCState | undefined;
    const c = s ? s.components : 0;
    return { ok: true, label: `${c} component${c === 1 ? '' : 's'}` };
  },
};

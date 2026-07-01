import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import { QueueTape } from '../../../../components/QueueTape';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface BipInput {
  adj: number[][];
  pos: [number, number][];
}

interface BipState {
  adj: number[][];
  pos: [number, number][];
  color: number[]; // 0 unvisited, 1 team-1, 2 team-2
  active: number | null;
  inspect: number | null;
  clashEdge: [number, number] | null;
  queue: number[];
  bipartite: boolean | null;
  done: boolean;
}

function record({ adj, pos }: BipInput): Frame<BipState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const queue: number[] = [];
  const frames: Frame<BipState>[] = [];
  let bipartite: boolean | null = null;

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    inspect: number | null,
    clashEdge: [number, number] | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        adj,
        pos,
        color: color.slice(),
        active,
        inspect,
        clashEdge,
        queue: queue.slice(),
        bipartite,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    'two colours',
    'Try to 2-colour the graph: every edge must join two differently coloured nodes. We BFS from each component, painting each neighbour the opposite colour of its parent. A same-colour edge proves the graph is not bipartite.',
    null,
    null,
    null,
  );

  for (let i = 0; i < n; i++) {
    if (color[i] !== 0) continue;
    color[i] = 1;
    queue.push(i);
    emit(
      'SEED',
      `paint ${i} team-1`,
      `Node ${i} is uncoloured, so start a new BFS here: paint it team-1 and queue it.`,
      i,
      null,
      null,
    );

    while (queue.length > 0) {
      const v = queue.shift() as number;
      emit(
        'VISIT',
        `expand ${v}`,
        `Dequeue node ${v} (team-${color[v]}) and inspect its neighbours.`,
        v,
        null,
        null,
      );

      for (const nb of adj[v]) {
        if (color[nb] === 0) {
          color[nb] = 3 - color[v];
          queue.push(nb);
          emit(
            'PAINT',
            `paint ${nb} team-${color[nb]}`,
            `Neighbour ${nb} is uncoloured — paint it team-${color[nb]}, the opposite of node ${v}, and queue it.`,
            v,
            nb,
            null,
          );
        } else if (color[nb] === color[v]) {
          bipartite = false;
          emit(
            'CLASH',
            `edge ${v}-${nb} clashes`,
            `Edge ${v}-${nb} joins two team-${color[v]} nodes — a same-colour edge. The graph cannot be 2-coloured, so it is NOT bipartite.`,
            v,
            nb,
            [v, nb],
            'bad',
          );
          emit('DONE', 'not bipartite', 'Result: the graph is NOT bipartite (false).', null, null, [v, nb], 'bad');
          return frames;
        } else {
          emit(
            'OK',
            `edge ${v}-${nb} ok`,
            `Neighbour ${nb} is already team-${color[nb]}, opposite to node ${v} — this edge is consistent.`,
            v,
            nb,
            null,
          );
        }
      }
    }
  }

  bipartite = true;
  emit('DONE', 'bipartite', 'Every edge joins opposite colours. The graph IS bipartite (true).', null, null, null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<BipState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        2-colouring —{' '}
        <span className="font-mono text-ink">
          {s.bipartite === null ? 'in progress' : s.bipartite ? 'bipartite' : 'NOT bipartite'}
        </span>
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        inspectNode={s.inspect}
        highlightEdge={s.clashEdge}
        edgeTone="clash"
        height={260}
      />
      <QueueTape items={s.queue} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BipState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const painted = s.color.filter((c) => c !== 0).length;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="queue" v={s.queue.length ? `[${s.queue.join(', ')}]` : '∅'} />
      <InspectorRow k="painted" v={`${painted} / ${s.adj.length}`} />
      <InspectorRow k="bipartite" v={s.bipartite === null ? '?' : String(s.bipartite)} />
    </VarGrid>
  );
}

// Even cycle 0-1-2-3-0 (4-cycle): 2-colourable → bipartite.
const EVEN_CYCLE: BipInput = {
  adj: [
    [1, 3],
    [0, 2],
    [1, 3],
    [0, 2],
  ],
  pos: circleLayout(4),
};

// Triangle 0-1-2 (odd cycle): NOT bipartite.
const TRIANGLE: BipInput = {
  adj: [
    [1, 2],
    [0, 2],
    [0, 1],
  ],
  pos: circleLayout(3),
};

export const manifestId = 'imp-7-is-graph-bipartite';
export const title = 'Is Graph Bipartite?';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'even-cycle', label: '4-cycle (bipartite)', value: EVEN_CYCLE },
    { id: 'triangle', label: 'triangle (not)', value: TRIANGLE },
  ] satisfies SampleInput<BipInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BipState | undefined;
    const ok = s?.bipartite === true;
    return { ok, label: ok ? 'bipartite' : 'not bipartite' };
  },
};

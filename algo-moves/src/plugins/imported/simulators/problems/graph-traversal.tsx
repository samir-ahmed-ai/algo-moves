import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import { QueueTape } from '../../../../components/QueueTape';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface GTInput {
  adj: number[][];
  pos: [number, number][];
}

interface GTState {
  adj: number[][];
  pos: [number, number][];
  color: number[]; // 0 unvisited, 2 queued, 1 visited
  active: number | null;
  queue: number[];
  order: number[];
  done: boolean;
}

function record({ adj, pos }: GTInput): Frame<GTState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const queue: number[] = [];
  const order: number[] = [];
  const frames: Frame<GTState>[] = [];

  const emit = (type: string, note: string, caption: string, active: number | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { adj, pos, color: color.slice(), active, queue: queue.slice(), order: order.slice(), done: type === 'DONE' },
    });

  emit(
    'INIT',
    `BFS from 0`,
    `Breadth-first traversal from node 0. A visited set guards each node; we drain a FIFO queue, visiting a node then queueing its unvisited neighbours so nodes come out in order of distance from the source.`,
    null,
  );

  color[0] = 2;
  queue.push(0);
  emit('SEED', `queue [0]`, `Seed the queue with the source node 0 and mark it queued.`, 0);

  while (queue.length > 0) {
    const v = queue.shift() as number;
    color[v] = 1;
    order.push(v);
    emit('VISIT', `visit ${v}`, `Dequeue node ${v}, mark it visited, and append it to the traversal order (now [${order.join(', ')}]).`, v);

    for (const nb of adj[v]) {
      if (color[nb] === 0) {
        color[nb] = 2;
        queue.push(nb);
        emit('ENQUEUE', `enqueue ${nb}`, `Neighbour ${nb} of ${v} is unvisited — mark it queued and push it. Queue is now [${queue.join(', ')}].`, v);
      }
    }
  }

  emit('DONE', `order ${order.length}`, `Queue empty — every reachable node visited. BFS order: [${order.join(', ')}].`, null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<GTState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        BFS from 0, order = <span className="font-mono text-ink">[{s.order.join(', ')}]</span>
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        height={260}
      />
      <QueueTape items={s.queue} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<GTState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="queue" v={s.queue.length ? `[${s.queue.join(', ')}]` : '∅'} />
      <InspectorRow k="order" v={`[${s.order.join(', ')}]`} />
      <InspectorRow k="visited" v={`${s.order.length} / ${s.adj.length}`} />
    </VarGrid>
  );
}

const G6: GTInput = {
  adj: [[1, 2], [0, 3, 4], [0, 4], [1, 5], [1, 2, 5], [3, 4]],
  pos: circleLayout(6),
};
const G5: GTInput = {
  adj: [[1, 2], [0, 3], [0, 3, 4], [1, 2], [2]],
  pos: circleLayout(5),
};

export const manifestId = 'imp-0-04-graph-traversal';
export const title = 'Graph Traversal';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'g6', label: '6 nodes', value: G6 },
    { id: 'g5', label: '5 nodes', value: G5 },
  ] satisfies SampleInput<GTInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as GTState | undefined;
    return { ok: true, label: `visited ${s ? s.order.length : 0}` };
  },
};

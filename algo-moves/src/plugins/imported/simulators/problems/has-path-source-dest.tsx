import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import { QueueTape } from '../../../../components/QueueTape';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface HPInput {
  adj: number[][];
  pos: [number, number][];
  src: number;
  dst: number;
}

interface HPState {
  adj: number[][];
  pos: [number, number][];
  src: number;
  dst: number;
  color: number[]; // 0 unvisited, 2 queued, 1 visited
  active: number | null;
  queue: number[];
  found: boolean;
  done: boolean;
}

function record({ adj, pos, src, dst }: HPInput): Frame<HPState>[] {
  const n = adj.length;
  const color = new Array<number>(n).fill(0);
  const queue: number[] = [];
  const frames: Frame<HPState>[] = [];
  let found = false;

  const emit = (type: string, note: string, caption: string, active: number | null, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: { adj, pos, src, dst, color: color.slice(), active, queue: queue.slice(), found, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `${src} → ${dst}?`,
    `Reachability from ${src} to ${dst} by BFS. We flood outward from the source one node at a time; the answer is true the moment ${dst} turns up as a neighbour, and false if the queue drains without ever seeing it.`,
    null,
  );

  if (src === dst) {
    found = true;
    emit('DONE', `true`, `Source and destination are the same node (${src}), so a path trivially exists. Answer: true.`, src, 'good');
    return frames;
  }

  color[src] = 2;
  queue.push(src);
  emit('SEED', `queue [${src}]`, `Seed the queue with the source ${src} and mark it queued.`, src);

  while (queue.length > 0) {
    const v = queue.shift() as number;
    color[v] = 1;
    emit('VISIT', `visit ${v}`, `Dequeue node ${v} and mark it visited; now scan its neighbours.`, v);

    let hit = false;
    for (const nb of adj[v]) {
      if (nb === dst) {
        found = true;
        hit = true;
        color[dst] = 1;
        emit('REACH', `found ${dst}`, `Neighbour ${dst} of ${v} is the destination — a path exists. Stop the search.`, dst, 'good');
        break;
      }
      if (color[nb] === 0) {
        color[nb] = 2;
        queue.push(nb);
        emit('ENQUEUE', `enqueue ${nb}`, `Neighbour ${nb} of ${v} is unvisited — mark it queued and push it. Queue is now [${queue.join(', ')}].`, v);
      }
    }
    if (hit) break;
  }

  if (!found) {
    emit('DONE', `false`, `Queue empty and ${dst} was never reached from ${src} — no path exists. Answer: false.`, null, 'bad');
  } else {
    emit('DONE', `true`, `Destination ${dst} was reached from ${src} — a path exists. Answer: true.`, dst, 'good');
  }
  return frames;
}

function View({ frame }: PluginViewProps<HPState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        Has path {s.src} → {s.dst}?{' '}
        {s.done && <span className="font-mono text-ink">{s.found ? 'true' : 'false'}</span>}
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        activeNode={s.active}
        inspectNode={s.active === s.dst ? null : s.dst}
        height={260}
      />
      <QueueTape items={s.queue} label="queue · front →" />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<HPState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const visited = s.color.filter((c) => c === 1).length;
  return (
    <VarGrid>
      <InspectorRow k="src → dst" v={`${s.src} → ${s.dst}`} />
      <InspectorRow k="current" v={s.active ?? '—'} />
      <InspectorRow k="queue" v={s.queue.length ? `[${s.queue.join(', ')}]` : '∅'} />
      <InspectorRow k="visited" v={`${visited} / ${s.adj.length}`} />
      <InspectorRow k="reached" v={s.done ? (s.found ? 'yes' : 'no') : '…'} />
    </VarGrid>
  );
}

// 6 nodes, 0→5 reachable via 0→2→4→5.
const REACH: HPInput = {
  adj: [[1, 2], [0, 3], [0, 4], [1], [2, 5], [4]],
  pos: circleLayout(6),
  src: 0,
  dst: 5,
};
// 6 nodes, two disjoint clusters: {0,1,2} and {3,4,5}. 0→5 is unreachable.
const NO_REACH: HPInput = {
  adj: [[1, 2], [0, 2], [0, 1], [4, 5], [3, 5], [3, 4]],
  pos: circleLayout(6),
  src: 0,
  dst: 5,
};

export const manifestId = 'imp-0-05-has-path-from-source-to-destination';
export const title = 'Has Path from Source to Destination';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'reach', label: 'reachable · 0→5', value: REACH },
    { id: 'noreach', label: 'disjoint · 0→5', value: NO_REACH },
  ] satisfies SampleInput<HPInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as HPState | undefined;
    if (!s) return { ok: false, label: 'no run' };
    return { ok: s.found, label: s.found ? 'path exists' : 'no path' };
  },
};

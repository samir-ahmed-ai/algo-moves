import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ADInput {
  words: string[];
}

interface ADState {
  adj: number[][];
  pos: [number, number][];
  labels: string[]; // the distinct letters, indexed
  color: number[]; // 0 untouched, 2 in-queue (indeg 0), 1 placed in order
  active: number | null;
  queue: number[];
  indeg: number[];
  order: number[];
  answer: string;
  done: boolean;
}

function record({ words }: ADInput): Frame<ADState>[] {
  // Distinct letters in first-seen order, mapped to node indices.
  const labels: string[] = [];
  const idx = new Map<string, number>();
  for (const w of words) {
    for (const ch of w) {
      if (!idx.has(ch)) {
        idx.set(ch, labels.length);
        labels.push(ch);
      }
    }
  }
  const n = labels.length;
  const pos = circleLayout(n);
  const adj: number[][] = Array.from({ length: n }, () => []);
  const indeg = new Array<number>(n).fill(0);
  const edges: [string, string][] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    const m = Math.min(a.length, b.length);
    for (let j = 0; j < m; j++) {
      if (a[j] !== b[j]) {
        const u = idx.get(a[j]) as number;
        const v = idx.get(b[j]) as number;
        if (!adj[u].includes(v)) {
          adj[u].push(v);
          indeg[v]++;
          edges.push([a[j], b[j]]);
        }
        break;
      }
    }
  }

  const color = new Array<number>(n).fill(0);
  const queue: number[] = [];
  const order: number[] = [];
  const frames: Frame<ADState>[] = [];
  let answer = '';

  const emit = (type: string, note: string, caption: string, active: number | null, tone?: 'good') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        adj,
        pos,
        labels,
        color: color.slice(),
        active,
        queue: queue.slice(),
        indeg: indeg.slice(),
        order: order.slice(),
        answer,
        done: type === 'DONE',
      },
    });

  const edgeText = edges.map(([u, v]) => `${u}→${v}`).join(', ');
  emit(
    'INIT',
    'build graph',
    `Compare each pair of adjacent words in the sorted dictionary; the first position where they differ gives a precedence edge (earlier letter → later letter). Here that yields ${edgeText}. Then topologically sort the letters with Kahn's algorithm.`,
    null,
  );

  for (let i = 0; i < n; i++) {
    if (indeg[i] === 0) {
      color[i] = 2;
      queue.push(i);
    }
  }
  emit(
    'SEED',
    `queue [${queue.map((i) => labels[i]).join(', ')}]`,
    `Queue every letter with in-degree 0 (no letter must come before it): [${queue.map((i) => labels[i]).join(', ')}].`,
    null,
  );

  while (queue.length > 0) {
    const v = queue.shift() as number;
    color[v] = 1;
    order.push(v);
    answer = order.map((i) => labels[i]).join('');
    emit('PLACE', `place ${labels[v]}`, `Dequeue "${labels[v]}" and append it to the order — alien order so far is "${answer}".`, v);

    for (const nb of adj[v]) {
      indeg[nb]--;
      if (indeg[nb] === 0) {
        color[nb] = 2;
        queue.push(nb);
        emit(
          'RELAX',
          `${labels[nb]} ready`,
          `Removing "${labels[v]}" drops "${labels[nb]}" to in-degree 0, so all its predecessors are placed — enqueue it.`,
          v,
        );
      }
    }
  }

  if (order.length === n) {
    emit('DONE', `order "${answer}"`, `Every letter placed — the alien alphabet order is "${answer}".`, null, 'good');
  } else {
    answer = '';
    emit('DONE', 'cycle', `Only ${order.length} of ${n} letters could be placed — a cycle makes the order invalid, so the answer is "".`, null, 'good');
  }
  return frames;
}

function LetterQueue({ items, labels }: { items: number[]; labels: string[] }) {
  return (
    <div className="queue-tape">
      <span className="queue-label">queue · front →</span>
      {items.length === 0 ? (
        <span className="queue-empty">empty</span>
      ) : (
        <div className="queue-row">
          {items.map((n, i) => (
            <div key={i} className="queue-cell">
              {labels[n]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function View({ frame }: PluginViewProps<ADState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        alien order = <span className="font-mono text-ink">{s.answer ? `"${s.answer}"` : '—'}</span>
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        nodeClass={(node) => `team-${s.color[node]}`}
        label={(n) => s.labels[n]}
        activeNode={s.active}
        directed
        height={260}
      />
      <LetterQueue items={s.queue} labels={s.labels} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ADState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="current" v={s.active !== null ? s.labels[s.active] : '—'} />
      <InspectorRow k="queue" v={s.queue.length ? `[${s.queue.map((n) => s.labels[n]).join(', ')}]` : '∅'} />
      <InspectorRow k="order" v={s.answer ? `"${s.answer}"` : '—'} />
      <InspectorRow k="placed" v={`${s.order.length} / ${s.labels.length}`} />
    </VarGrid>
  );
}

const WERTF: ADInput = { words: ['wrt', 'wrf', 'er', 'ett', 'rftt'] };

export const manifestId = 'imp-2-alien-dictionary';
export const title = 'Alien Dictionary';

export const simulator: DpSimulator = {
  inputs: [{ id: 'wertf', label: 'wrt, wrf, er, ett, rftt', value: WERTF }] satisfies SampleInput<ADInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ADState | undefined;
    return { ok: true, label: s && s.answer ? `"${s.answer}"` : 'invalid' };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface DBInput {
  /** Each bomb is [x, y, radius]. */
  bombs: [number, number, number][];
}

interface DBState {
  adj: number[][];
  pos: [number, number][];
  start: number; // bomb that begins the chain reaction
  detonated: boolean[]; // already exploded (colour team-1)
  active: number | null; // bomb exploding right now (colour team-2)
  edge: [number, number] | null; // trigger edge being followed
  count: number; // detonated so far in this chain
  answer: number; // max over all starting bombs
  done: boolean;
}

/** Build the directed trigger graph: edge i→j when bomb j's centre is within bomb i's radius. */
function buildAdj(bombs: [number, number, number][]): number[][] {
  const n = bombs.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = bombs[i][0] - bombs[j][0];
      const dy = bombs[i][1] - bombs[j][1];
      const r = bombs[i][2];
      if (dx * dx + dy * dy <= r * r) adj[i].push(j);
    }
  }
  return adj;
}

/** Scale bomb (x, y) into GraphBoard's 352×286 viewport so the geometry reads. */
function scalePositions(bombs: [number, number, number][]): [number, number][] {
  const w = 352;
  const h = 286;
  const pad = 44;
  const xs = bombs.map((b) => b[0]);
  const ys = bombs.map((b) => b[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = maxX > minX ? (w - 2 * pad) / (maxX - minX) : 0;
  const sy = maxY > minY ? (h - 2 * pad) / (maxY - minY) : 0;
  return bombs.map(
    (b) => [Math.round(pad + (b[0] - minX) * sx), Math.round(pad + (b[1] - minY) * sy)] as [number, number],
  );
}

/** Count the reachable set from `start` (the chain reaction), returning size and visit order. */
function reachFrom(adj: number[][], start: number): { count: number; order: number[]; edges: [number, number][] } {
  const visited = new Array<boolean>(adj.length).fill(false);
  const order: number[] = [];
  const edges: [number, number][] = [];
  const dfs = (u: number, via: [number, number] | null): void => {
    visited[u] = true;
    order.push(u);
    if (via) edges.push(via);
    for (const v of adj[u]) {
      if (!visited[v]) dfs(v, [u, v]);
    }
  };
  dfs(start, null);
  return { count: order.length, order, edges };
}

function record({ bombs }: DBInput): Frame<DBState>[] {
  const n = bombs.length;
  const adj = buildAdj(bombs);
  const pos = scalePositions(bombs);

  // Find the best starting bomb (the chain we will animate) and the answer.
  let best = 0;
  let bestStart = 0;
  for (let i = 0; i < n; i++) {
    const { count } = reachFrom(adj, i);
    if (count > best) {
      best = count;
      bestStart = i;
    }
  }

  const frames: Frame<DBState>[] = [];
  const detonated = new Array<boolean>(n).fill(false);

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    edge: [number, number] | null,
    count: number,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        adj,
        pos,
        start: bestStart,
        detonated: detonated.slice(),
        active,
        edge,
        count,
        answer: best,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `chain from ${bestStart}`,
    `Bomb i triggers bomb j when j's centre lies inside i's blast radius, giving a directed graph. For each bomb we DFS its reachable set and keep the largest. The best starting bomb is ${bestStart}, so we animate that chain reaction.`,
    null,
    null,
    0,
  );

  // Replay the best chain as a DFS, emitting a frame per detonation.
  const visited = new Array<boolean>(n).fill(false);
  let count = 0;
  const dfs = (u: number, via: [number, number] | null): void => {
    visited[u] = true;
    detonated[u] = true;
    count += 1;
    emit(
      via ? 'DETONATE' : 'IGNITE',
      via ? `${via[0]}→${u}` : `ignite ${u}`,
      via
        ? `Bomb ${via[0]}'s blast reaches bomb ${u}: it detonates too. Chain size is now ${count}.`
        : `Manually detonate bomb ${bestStart} to ignite the chain. Chain size is ${count}.`,
      u,
      via,
      count,
    );
    for (const v of adj[u]) {
      if (!visited[v]) dfs(v, [u, v]);
    }
  };
  dfs(bestStart, null);

  emit(
    'DONE',
    `max ${best}`,
    `The chain starting at bomb ${bestStart} detonates ${best} bomb${best === 1 ? '' : 's'} — the maximum possible. Any other starting bomb detonates fewer.`,
    null,
    null,
    count,
    'good',
  );
  return frames;
}

function nodeColor(s: DBState, node: number): number {
  if (s.active === node) return 2; // exploding right now
  if (s.detonated[node]) return 1; // already detonated
  return 0; // intact
}

function View({ frame }: PluginViewProps<DBState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        chain from bomb <span className="font-mono text-ink">{s.start}</span>, detonated ={' '}
        <span className="font-mono text-ink">{s.count}</span>
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        directed
        nodeClass={(node) => `team-${nodeColor(s, node)}`}
        activeNode={s.active}
        highlightEdge={s.edge}
        height={260}
      />
      <div className={cn(vizText.sm, 'text-ink3')}>
        max detonated: <span className="font-mono text-ink">{s.answer}</span>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DBState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="exploding" v={s.active ?? '—'} />
      <InspectorRow k="chain size" v={s.count} />
      <InspectorRow k="start bomb" v={s.start} />
      <InspectorRow k="max detonated" v={s.answer} />
    </VarGrid>
  );
}

// Four bombs in a chain (each reaches the next) plus one isolated bomb.
// 0→1→2→3 detonates 4; bomb 4 is out of range. Max = 4.
const BOMBS5: DBInput = {
  bombs: [
    [10, 10, 5],
    [13, 13, 5],
    [16, 16, 5],
    [19, 19, 5],
    [40, 40, 1],
  ],
};

// One big bomb reaching two neighbours, which reach nothing new. Max = 3.
const BOMBS4: DBInput = {
  bombs: [
    [0, 0, 6],
    [4, 0, 1],
    [0, 4, 1],
    [20, 20, 1],
  ],
};

export const manifestId = 'imp-16-detonate-the-maximum-bombs';
export const title = 'Detonate the Maximum Bombs';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'bombs5', label: '5 bombs', value: BOMBS5 },
    { id: 'bombs4', label: '4 bombs', value: BOMBS4 },
  ] satisfies SampleInput<DBInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DBState | undefined;
    return { ok: true, label: `max ${s ? s.answer : 0}` };
  },
};

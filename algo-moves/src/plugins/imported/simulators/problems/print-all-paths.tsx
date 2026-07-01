import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GraphBoard } from '../../../../components/GraphBoard';
import type { DpSimulator } from '../types';
import { circleLayout } from '../graphLayout';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PPInput {
  adj: number[][];
  pos: [number, number][];
  src: number;
  dest: number;
}

interface PPState {
  adj: number[][];
  pos: [number, number][];
  src: number;
  dest: number;
  path: number[]; // current DFS path (nodes coloured team-2)
  visited: boolean[];
  edge: [number, number] | null; // edge just traversed / backtracked over
  results: number[][]; // every source→dest path found so far
  done: boolean;
}

function record({ adj, pos, src, dest }: PPInput): Frame<PPState>[] {
  const n = adj.length;
  const visited = new Array<boolean>(n).fill(false);
  const path: number[] = [src];
  const results: number[][] = [];
  const frames: Frame<PPState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    edge: [number, number] | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        adj,
        pos,
        src,
        dest,
        path: path.slice(),
        visited: visited.slice(),
        edge,
        results: results.map((p) => p.slice()),
        done: type === 'DONE',
      },
    });

  visited[src] = true;
  emit(
    'INIT',
    `start ${src}`,
    `Enumerate every directed path from source ${src} to destination ${dest}. We do a depth-first search, pushing each node onto the current path and marking it visited; when we reach ${dest} we snapshot the path, then backtrack to explore other branches.`,
    null,
  );

  const dfs = (v: number): void => {
    if (v === dest) {
      results.push(path.slice());
      emit(
        'FOUND',
        `path #${results.length}`,
        `Reached destination ${dest}. Record the completed path [${path.join(' → ')}] — that is path #${results.length}.`,
        null,
        'good',
      );
      return;
    }
    for (const nb of adj[v]) {
      if (!visited[nb]) {
        visited[nb] = true;
        path.push(nb);
        emit(
          'ENTER',
          `${v}→${nb}`,
          `From node ${v}, follow the edge to unvisited neighbour ${nb}. The current path grows to [${path.join(' → ')}].`,
          [v, nb],
        );
        dfs(nb);
        path.pop();
        visited[nb] = false;
        emit(
          'BACKTRACK',
          `pop ${nb}`,
          `Exhausted everything reachable through ${nb}; backtrack by popping it. The path shrinks back to [${path.join(' → ')}] and ${nb} becomes available again.`,
          [v, nb],
        );
      }
    }
  };

  dfs(src);

  const list = results.map((p) => `[${p.join('→')}]`).join(', ');
  emit(
    'DONE',
    `${results.length} paths`,
    `Search complete. There are ${results.length} directed paths from ${src} to ${dest}: ${list}.`,
    null,
    'good',
  );
  return frames;
}

function nodeColor(s: PPState, node: number): number {
  if (s.path.includes(node)) return 2; // on current DFS path
  if (s.visited[node]) return 1; // visited but not on path
  return 0; // unvisited
}

function View({ frame }: PluginViewProps<PPState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        source <span className="font-mono text-ink">{s.src}</span> → dest{' '}
        <span className="font-mono text-ink">{s.dest}</span>, path ={' '}
        <span className="font-mono text-ink">[{s.path.join(' → ')}]</span>
      </div>
      <GraphBoard
        adj={s.adj}
        pos={s.pos}
        directed
        nodeClass={(node) => `team-${nodeColor(s, node)}`}
        activeNode={s.path.length ? s.path[s.path.length - 1] : null}
        highlightEdge={s.edge}
        height={260}
      />
      <div className={cn(vizText.sm, 'text-ink3')}>
        paths found: <span className="font-mono text-ink">{s.results.length}</span>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PPState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const head = s.path.length ? s.path[s.path.length - 1] : '—';
  return (
    <VarGrid>
      <InspectorRow k="at node" v={head} />
      <InspectorRow k="path" v={s.path.length ? `[${s.path.join(' → ')}]` : '∅'} />
      <InspectorRow k="paths found" v={s.results.length} />
      <InspectorRow k="source → dest" v={`${s.src} → ${s.dest}`} />
    </VarGrid>
  );
}

// Directed DAG: 0 is the source, 5 the destination.
// 0→1, 0→2, 1→3, 2→3, 2→4, 3→5, 4→5
// Paths: 0→1→3→5, 0→2→3→5, 0→2→4→5  (3 paths)
const DAG6: PPInput = {
  adj: [[1, 2], [3], [3, 4], [5], [5], []],
  pos: circleLayout(6),
  src: 0,
  dest: 5,
};

// Smaller diamond: 0→1, 0→2, 1→3, 2→3  -> 0→1→3, 0→2→3 (2 paths)
const DAG4: PPInput = {
  adj: [[1, 2], [3], [3], []],
  pos: circleLayout(4),
  src: 0,
  dest: 3,
};

export const manifestId = 'imp-0-06-print-all-paths-from-source-to-destination';
export const title = 'Print All Paths from Source to Destination';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'dag6', label: '6 nodes', value: DAG6 },
    { id: 'dag4', label: '4 nodes', value: DAG4 },
  ] satisfies SampleInput<PPInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PPState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} paths` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

const INF = 1e9;

interface FloydInput {
  n: number;
  /** [from, to, weight] directed edges, 0-indexed. */
  edges: [number, number, number][];
  /** Queried shortest distance src → dst (0-indexed). */
  src: number;
  dst: number;
}

interface FloydState {
  dist: number[][];
  k: number | null;
  cell: [number, number] | null;
  src: number;
  dst: number;
  done: boolean;
}

const fmt = (d: number): string => (d >= INF ? '∞' : String(d));

function record(input: FloydInput): Frame<FloydState>[] {
  const n = input.n;
  const dist: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)),
  );
  for (const [u, v, w] of input.edges) dist[u][v] = w;

  const frames: Frame<FloydState>[] = [];
  const emit = (
    type: string,
    note: string,
    caption: string,
    k: number | null,
    cell: [number, number] | null,
    tone?: 'good',
  ): void => {
    frames.push({
      move: { type, note, caption, tone },
      state: {
        dist: dist.map((r) => r.slice()),
        k,
        cell,
        src: input.src,
        dst: input.dst,
        done: type === 'DONE',
      },
    });
  };

  emit(
    'INIT',
    `${n}×${n} matrix`,
    `Floyd-Warshall builds an ${n}×${n} all-pairs shortest-distance matrix. Start with the direct-edge weights (∞ where no edge, 0 on the diagonal), then for each intermediate node k let every pair (i, j) route through k if that is cheaper.`,
    null,
    null,
  );

  for (let k = 0; k < n; k++) {
    emit(
      'PHASE',
      `via k=${k}`,
      `Open intermediate node k=${k}: test whether routing any pair i → ${k} → j is shorter than the best i → j found so far.`,
      k,
      null,
    );
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const through = dist[i][k] + dist[k][j];
        if (through < dist[i][j]) {
          const prev = dist[i][j];
          dist[i][j] = through;
          emit(
            'RELAX',
            `(${i},${j})=${through}`,
            `dist[${i}][${j}]: ${i}→${k}→${j} costs ${fmt(dist[i][k])}+${fmt(dist[k][j])}=${through}, beating the old ${fmt(prev)}. Update dist[${i}][${j}] to ${through}.`,
            k,
            [i, j],
          );
        }
      }
    }
  }

  emit(
    'DONE',
    `dist[${input.src}][${input.dst}]=${fmt(dist[input.src][input.dst])}`,
    `Matrix complete. The queried shortest distance from ${input.src} to ${input.dst} is ${fmt(dist[input.src][input.dst])}.`,
    null,
    [input.src, input.dst],
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FloydState>) {
  const s = frame.state;
  const grid = s.dist.map((row) => row.map((d) => fmt(d)));
  const ans = fmt(s.dist[s.src][s.dst]);
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="k" v={s.k ?? '—'} tone={s.k !== null ? 'accent' : undefined} />
        <RailStat k="cell" v={s.cell ? `(${s.cell[0]},${s.cell[1]})` : '—'} />
      </RailGroup>
      <RailResult label={`dist[${s.src}][${s.dst}]`} value={ans} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <GridBoard
        grid={grid}
        cellTone={(r, c) => {
          if (s.cell && s.cell[0] === r && s.cell[1] === c) return 'active';
          if (s.done && r === s.src && c === s.dst) return 'path';
          return r === c ? 'visited' : '';
        }}
        active={s.cell}
        cellSize={44}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<FloydState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="intermediate k" v={s.k ?? '—'} />
      <InspectorRow k="cell (i,j)" v={s.cell ? `(${s.cell[0]}, ${s.cell[1]})` : '—'} />
      <InspectorRow k="query" v={`dist[${s.src}][${s.dst}]`} />
      <InspectorRow k="answer" v={fmt(s.dist[s.src][s.dst])} />
    </VarGrid>
  );
}

// 4 nodes. Direct 0→3 has no edge; cheapest 0→3 routes 0→1→2→3 = 3+2+4 = 9.
const G4: FloydInput = {
  n: 4,
  edges: [
    [0, 1, 3],
    [1, 2, 2],
    [2, 3, 4],
    [0, 2, 8],
    [1, 3, 12],
    [3, 0, 5],
  ],
  src: 0,
  dst: 3,
};

export const manifestId = 'imp-4-floyd-city-of-blinding-lights';
export const title = 'Floyd City of Blinding Lights';

export const simulator: ProblemSimulator = {
  inputs: [{ id: 'g4', label: '4 nodes · query 0→3', value: G4 }] satisfies SampleInput<FloydInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FloydState | undefined;
    return { ok: true, label: s ? `dist ${fmt(s.dist[s.src][s.dst])}` : 'dist ∞' };
  },
};

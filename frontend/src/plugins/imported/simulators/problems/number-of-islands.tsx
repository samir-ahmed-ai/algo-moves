import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import {
  VizStage,
  RailGroup,
  RailStat,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface IslandInput {
  grid: string[][]; // '1' land, '0' water
}

interface IslandState {
  grid: string[][];
  seen: boolean[][];
  cur: [number, number] | null;
  count: number;
  done: boolean;
}

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function record({ grid }: IslandInput): Frame<IslandState>[] {
  const m = grid.length;
  const n = grid[0].length;
  const seen = Array.from({ length: m }, () => new Array<boolean>(n).fill(false));
  let count = 0;

  const { emit, frames } = createRecorder<IslandState>(() => ({
    grid,
    seen: seen.map((r) => r.slice()),
    cur: null,
    count,
    done: false,
  }));

  const snap = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    tone?: 'good',
  ) => emit(type, note, caption, { cur, done: type === 'DONE' }, tone);

  snap(
    'INIT',
    `${m}×${n} grid`,
    `Count islands: maximal groups of 4-directionally connected '1' cells. Scan every cell; each time an unvisited '1' is found, that's a new island — flood-fill it to mark the whole island visited so it isn't counted again.`,
    null,
  );

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === '1' && !seen[r][c]) {
        count++;
        snap(
          'ISLAND',
          `island #${count}`,
          `Cell (${r}, ${c}) is land and unvisited — start island #${count} and flood-fill from here.`,
          [r, c],
        );
        // iterative DFS flood fill
        const stack: [number, number][] = [[r, c]];
        seen[r][c] = true;
        while (stack.length) {
          const [cr, cc] = stack.pop() as [number, number];
          snap(
            'FILL',
            `fill (${cr},${cc})`,
            `Mark (${cr}, ${cc}) as part of island #${count}; push its unvisited land neighbours.`,
            [cr, cc],
          );
          for (const [dr, dc] of DIRS) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] === '1' && !seen[nr][nc]) {
              seen[nr][nc] = true;
              stack.push([nr, nc]);
            }
          }
        }
      } else if (grid[r][c] === '0') {
        snap('WATER', `(${r},${c}) water`, `Cell (${r}, ${c}) is water — skip.`, [r, c]);
      }
    }
  }

  snap('DONE', `${count} islands`, `Whole grid scanned. Total islands = ${count}.`, null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<IslandState>) {
  const s = frame.state;
  const display = s.grid.map((row) => row.slice());
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (s.seen[r][c]) return 'visited';
    return s.grid[r][c] === '1' ? 'land' : 'water';
  };
  return (
    <VizStage
      rail={
        <RailGroup label="progress">
          <RailStat k="islands" v={s.count} tone={s.count > 0 ? 'good' : undefined} />
          <RailStat k="cell" v={s.cur ? `(${s.cur[0]},${s.cur[1]})` : '—'} />
        </RailGroup>
      }
    >
      <GridBoard grid={display} cellTone={cellTone} active={s.cur} cellSize={40} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<IslandState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="cell" v={s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—'} />
      <InspectorRow k="islands" v={s.count} />
    </VarGrid>
  );
}

const G1: IslandInput = {
  grid: [
    ['1', '1', '0', '0'],
    ['1', '0', '0', '1'],
    ['0', '0', '1', '1'],
    ['0', '0', '0', '0'],
  ],
};
const G2: IslandInput = {
  grid: [
    ['1', '1', '1'],
    ['0', '1', '0'],
    ['1', '0', '1'],
  ],
};

export const manifestId = 'imp-24-number-of-islands';
export const title = 'Number of Islands';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'g1', label: '4×4 · 2 islands', value: G1 },
    { id: 'g2', label: '3×3 · 3 islands', value: G2 },
  ] satisfies SampleInput<IslandInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IslandState | undefined;
    return { ok: true, label: `${s ? s.count : 0} islands` };
  },
};

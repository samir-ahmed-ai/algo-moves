import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { GridBoard } from '../../../../components/GridBoard';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MaxRegionInput {
  mat: number[][];
}

interface MaxRegionState {
  // 0 = water, 1 = unvisited land, 2 = land claimed by the region being grown now,
  // 3 = land already counted in a previous (settled) region.
  grid: number[][];
  active: [number, number] | null; // current cell DFS is inspecting
  area: number; // size of the region currently being grown
  best: number; // largest region area found so far
  done: boolean;
}

const WATER = 0;
const LAND = 1;
const CURRENT = 2;
const SETTLED = 3;

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function record({ mat }: MaxRegionInput): Frame<MaxRegionState>[] {
  const frames: Frame<MaxRegionState>[] = [];
  const m = mat.length;
  const n = m > 0 ? mat[0].length : 0;
  // grid mirrors mat but uses the richer 0..3 encoding for the view.
  const grid: number[][] = mat.map((row) => row.map((v) => (v === 1 ? LAND : WATER)));

  let best = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: [number, number] | null,
    area: number,
    done = false,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        grid: grid.map((row) => row.slice()),
        active,
        area,
        best,
        done,
      },
    });

  emit(
    'INIT',
    `${m}×${n} grid`,
    `Max Region: find the largest blob of connected 1s, where connectivity counts all 8 neighbours (orthogonal AND diagonal). Scan the grid; every time we hit an unclaimed 1 we flood-fill its whole region and measure its area, keeping the biggest. Time O(m·n), Space O(m·n) for the recursion stack.`,
    null,
    0,
  );

  // Iterative 8-direction DFS so the simulator can emit a frame per visited cell,
  // faithfully reproducing the recursive Go `dfs` (area = 1 + sum over 8 dirs).
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] !== LAND) continue;

      emit(
        'SEED',
        `region at (${i},${j})`,
        `Found an unclaimed 1 at (${i}, ${j}). Start a new region here and flood-fill outward to every 8-directionally connected 1.`,
        [i, j],
        0,
      );

      let area = 0;
      const stack: [number, number][] = [[i, j]];
      grid[i][j] = CURRENT; // claim immediately, mirroring Go's `mat[i][j] = 0` on entry

      while (stack.length > 0) {
        const [ci, cj] = stack.pop()!;
        area += 1;
        emit(
          'VISIT',
          `area=${area}`,
          `Visit (${ci}, ${cj}) — it is part of this region, so add 1. Region area is now ${area}. Next, look at all 8 neighbours and queue any that are still unclaimed land.`,
          [ci, cj],
          area,
        );

        for (const [di, dj] of DIRS) {
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= m || nj >= n) continue;
          if (grid[ni][nj] !== LAND) continue;
          grid[ni][nj] = CURRENT; // claim before pushing to avoid double-counting
          stack.push([ni, nj]);
        }
      }

      // Region fully grown: settle it and update best.
      for (let r = 0; r < m; r++) {
        for (let c = 0; c < n; c++) {
          if (grid[r][c] === CURRENT) grid[r][c] = SETTLED;
        }
      }
      const improved = area > best;
      if (improved) best = area;
      emit(
        improved ? 'BEST' : 'CLOSE',
        improved ? `best=${best}` : `area=${area}`,
        improved
          ? `Region complete with area ${area}. That beats the previous best, so best = ${best}.`
          : `Region complete with area ${area}. The best so far (${best}) is still larger, so leave it unchanged.`,
        null,
        area,
        false,
        improved ? 'good' : undefined,
      );
    }
  }

  emit(
    'DONE',
    `max = ${best}`,
    `Every cell has been scanned. The largest 8-connected region has area ${best}.`,
    null,
    best,
    true,
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MaxRegionState>) {
  const s = frame.state;
  const tone = (r: number, c: number): string => {
    const v = s.grid[r][c];
    if (v === CURRENT) return 'active';
    if (v === SETTLED) return 'visited';
    if (v === LAND) return 'land';
    return 'water';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        best region ={' '}
        <span className="font-mono text-ink">{s.best}</span>
        {' · '}growing ={' '}
        <span className="font-mono text-ink">{s.area}</span>
      </div>
      <GridBoard grid={s.grid} cellTone={tone} active={s.active} />
      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>
        land = 1 · water = 0 · ring = current cell · filled = region growing now · dim = settled region
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ max region = {s.best}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MaxRegionState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="cell (i,j)" v={s.active ? `(${s.active[0]}, ${s.active[1]})` : '—'} />
      <InspectorRow k="current area" v={s.area} />
      <InspectorRow k="best" v={s.best} />
      <InspectorRow k="status" v={s.done ? 'done' : s.active ? 'flooding' : 'scanning'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-max-region';
export const title = 'Max region';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'mr1',
      label: '4×4 diagonal blob',
      value: {
        mat: [
          [1, 1, 0, 0],
          [0, 1, 1, 0],
          [0, 0, 1, 0],
          [1, 0, 0, 1],
        ],
      },
    },
    {
      id: 'mr2',
      label: '3×4 two regions',
      value: {
        mat: [
          [1, 0, 0, 1],
          [1, 0, 1, 1],
          [0, 0, 0, 1],
        ],
      },
    },
  ] satisfies SampleInput<MaxRegionInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MaxRegionState | undefined;
    const best = s?.best ?? 0;
    return { ok: true, label: `max region = ${best}` };
  },
};

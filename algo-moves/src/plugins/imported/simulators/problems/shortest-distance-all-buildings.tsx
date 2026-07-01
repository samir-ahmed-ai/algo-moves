import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface BuildingsInput {
  grid: number[][]; // 0 empty land, 1 building, 2 wall
}

interface BuildingsState {
  grid: number[][];
  total: number[][]; // accumulated travel distance per empty cell
  reach: number[][]; // how many buildings have reached each empty cell
  cur: [number, number] | null;
  buildingsSeen: number;
  buildingsTotal: number;
  answer: number | null; // null until DONE
  done: boolean;
}

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

function record({ grid }: BuildingsInput): Frame<BuildingsState>[] {
  const m = grid.length;
  const n = grid[0].length;
  const total = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  const reach = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  const frames: Frame<BuildingsState>[] = [];

  let buildingsTotal = 0;
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (grid[r][c] === 1) buildingsTotal++;

  let buildingsSeen = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    answer: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        grid,
        total: total.map((row) => row.slice()),
        reach: reach.map((row) => row.slice()),
        cur,
        buildingsSeen,
        buildingsTotal,
        answer,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `${m}×${n} grid · ${buildingsTotal} buildings`,
    `Reach every empty land cell (0) from all ${buildingsTotal} buildings (1); walls (2) block movement. From each building, BFS outward and add its distance into total[r][c], counting how many buildings reached each cell. Answer = the smallest total over cells reached by every building, or -1.`,
    null,
    null,
  );

  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== 1) continue;
      buildingsSeen++;
      emit(
        'BUILDING',
        `building #${buildingsSeen} at (${r},${c})`,
        `Building #${buildingsSeen} at (${r}, ${c}): run BFS outward, adding each empty cell's distance from here into total.`,
        [r, c],
        null,
      );

      const vis = Array.from({ length: m }, () => new Array<boolean>(n).fill(false));
      vis[r][c] = true;
      let q: [number, number][] = [[r, c]];
      let dist = 0;
      while (q.length) {
        dist++;
        const next: [number, number][] = [];
        for (const [cr, cc] of q) {
          for (const [dr, dc] of DIRS) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && !vis[nr][nc] && grid[nr][nc] === 0) {
              vis[nr][nc] = true;
              total[nr][nc] += dist;
              reach[nr][nc]++;
              next.push([nr, nc]);
              emit(
                'REACH',
                `(${nr},${nc}) +${dist} → total ${total[nr][nc]}`,
                `Cell (${nr}, ${nc}) is ${dist} step${dist === 1 ? '' : 's'} from building #${buildingsSeen}; total[${nr}][${nc}] becomes ${total[nr][nc]}, reached by ${reach[nr][nc]} building${reach[nr][nc] === 1 ? '' : 's'} so far.`,
                [nr, nc],
                null,
              );
            }
          }
        }
        q = next;
      }
    }
  }

  let res = Infinity;
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 0 && reach[r][c] === buildingsTotal && total[r][c] < res) res = total[r][c];
    }
  }
  const answer = res === Infinity ? -1 : res;

  if (answer === -1) {
    emit('DONE', 'no reachable cell', `No empty cell is reachable by all ${buildingsTotal} buildings. Answer = -1.`, null, -1, 'bad');
  } else {
    emit(
      'DONE',
      `min total = ${answer}`,
      `Smallest total travel distance over cells reached by all ${buildingsTotal} buildings = ${answer}.`,
      null,
      answer,
      'good',
    );
  }
  return frames;
}

function View({ frame }: PluginViewProps<BuildingsState>) {
  const s = frame.state;
  const display = s.grid.map((row, r) =>
    row.map((v, c) => {
      if (v === 1) return 'B';
      if (v === 2) return '#';
      return s.reach[r][c] > 0 ? s.total[r][c] : '·';
    }),
  );
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (s.grid[r][c] === 1) return 'land';
    if (s.grid[r][c] === 2) return 'water';
    return s.reach[r][c] > 0 ? 'visited' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        buildings reached ={' '}
        <span className="font-mono text-ink">
          {s.buildingsSeen}/{s.buildingsTotal}
        </span>
        {s.answer !== null && (
          <>
            {' · '}min total = <span className="font-mono text-ink">{s.answer}</span>
          </>
        )}
      </div>
      <GridBoard grid={display} cellTone={cellTone} active={s.cur} cellSize={44} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BuildingsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="cell" v={s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—'} />
      <InspectorRow k="cell total" v={s.cur ? s.total[s.cur[0]][s.cur[1]] : '—'} />
      <InspectorRow k="cell reach" v={s.cur ? s.reach[s.cur[0]][s.cur[1]] : '—'} />
      <InspectorRow k="buildings" v={`${s.buildingsSeen}/${s.buildingsTotal}`} />
      <InspectorRow k="answer" v={s.answer === null ? '—' : s.answer} />
    </VarGrid>
  );
}

const G1: BuildingsInput = {
  grid: [
    [1, 0, 2, 0, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
  ],
};
const G2: BuildingsInput = {
  grid: [
    [1, 0, 0],
    [0, 0, 0],
    [0, 0, 1],
  ],
};

export const manifestId = 'imp-0-07-shortest-distance-from-all-buildings';
export const title = 'Shortest Distance from All Buildings';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'g1', label: '3×5 · 3 buildings · 7', value: G1 },
    { id: 'g2', label: '3×3 · 2 buildings · 4', value: G2 },
  ] satisfies SampleInput<BuildingsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BuildingsState | undefined;
    const a = s?.answer ?? -1;
    return { ok: a !== -1, label: a === -1 ? 'unreachable (-1)' : `min total = ${a}` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SpgoInput {
  grid: number[][]; // 0 = open, 1 = obstacle
  k: number; // obstacles we may eliminate
}

interface SpgoState {
  grid: number[][];
  // visited[r][c] = best (max) remaining-k seen at that cell, or -1 if unseen.
  bestRem: number[][];
  cur: [number, number] | null;
  rem: number; // remaining eliminations at the current cell
  steps: number; // BFS layer (= moves taken) currently being processed
  k: number;
  answer: number | null; // min steps to the goal, or -1, or null while running
  done: boolean;
}

const DIRS: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

interface QItem {
  r: number;
  c: number;
  rem: number;
}

function record({ grid, k }: SpgoInput): Frame<SpgoState>[] {
  const m = grid.length;
  const n = grid[0].length;
  // bestRem[r][c] = the largest remaining-k with which we have reached (r,c).
  const bestRem = Array.from({ length: m }, () => new Array<number>(n).fill(-1));
  const frames: Frame<SpgoState>[] = [];

  const snap = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    rem: number,
    steps: number,
    answer: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        grid,
        bestRem: bestRem.map((row) => row.slice()),
        cur,
        rem,
        steps,
        k,
        answer,
        done: type === 'DONE',
      },
    });

  snap(
    'INIT',
    `${m}×${n} grid · k=${k}`,
    `Find the fewest moves from (0, 0) to (${m - 1}, ${n - 1}). You may pass through at most k=${k} obstacle (1) cells, so each BFS state is (row, col, remaining eliminations). The answer is the move count when BFS first dequeues the goal, or -1.`,
    [0, 0],
    k,
    0,
    null,
  );

  if (m === 1 && n === 1) {
    snap('DONE', '0 moves', `Start equals goal, so 0 moves are needed.`, [0, 0], k, 0, 0, 'good');
    return frames;
  }

  let queue: QItem[] = [{ r: 0, c: 0, rem: k }];
  bestRem[0][0] = k;
  let steps = 0;

  while (queue.length) {
    steps++;
    const next: QItem[] = [];
    for (const { r, c, rem } of queue) {
      const opened: string[] = [];
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
        const nextRem = rem - grid[nr][nc];
        // Skip if we'd run out of eliminations, or already reached this cell with >= remaining-k.
        if (nextRem < 0 || nextRem <= bestRem[nr][nc]) continue;
        if (nr === m - 1 && nc === n - 1) {
          snap(
            'GOAL',
            `reached in ${steps}`,
            `Stepping from (${r}, ${c}) reaches the goal (${nr}, ${nc}) after ${steps} move${steps === 1 ? '' : 's'}, with ${nextRem} elimination${nextRem === 1 ? '' : 's'} left. This is the first time BFS reaches the goal, so it is the minimum.`,
            [nr, nc],
            nextRem,
            steps,
            steps,
          );
          snap('DONE', `${steps} moves`, `Minimum moves to the goal = ${steps}.`, [nr, nc], nextRem, steps, steps, 'good');
          return frames;
        }
        bestRem[nr][nc] = nextRem;
        next.push({ r: nr, c: nc, rem: nextRem });
        opened.push(`(${nr}, ${nc}) [rem ${nextRem}]`);
      }
      const expanded =
        opened.length > 0
          ? `Enqueue states ${opened.join(', ')} for move ${steps}; passing through an obstacle costs one elimination.`
          : `No new states open up from here at this layer.`;
      snap(
        'EXPAND',
        `(${r},${c}) rem ${rem}`,
        `At move ${steps - 1}, expand state (${r}, ${c}) with ${rem} elimination${rem === 1 ? '' : 's'} left. ${expanded}`,
        [r, c],
        rem,
        steps - 1,
        null,
      );
    }
    queue = next;
  }

  snap('DONE', 'no path', `BFS exhausted every reachable state without reaching the goal: the answer is -1.`, null, 0, steps, -1, 'bad');
  return frames;
}

function View({ frame }: PluginViewProps<SpgoState>) {
  const s = frame.state;
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return 'active';
    if (s.bestRem[r][c] >= 0) return 'visited';
    return s.grid[r][c] === 1 ? 'water' : 'land';
  };
  const label = (r: number, c: number) => (s.grid[r][c] === 1 ? '✕' : '·');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        moves = <span className="font-mono text-ink">{s.answer !== null ? s.answer : s.steps}</span> · remaining k ={' '}
        <span className="font-mono text-ink">{s.cur ? s.rem : '—'}</span>
      </div>
      <GridBoard grid={s.grid} cellTone={cellTone} label={label} active={s.cur} cellSize={44} />
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SpgoState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="cell" v={s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—'} />
      <InspectorRow k="remaining k" v={s.cur ? s.rem : '—'} />
      <InspectorRow k="moves" v={s.steps} />
      <InspectorRow k="answer" v={s.answer !== null ? s.answer : '—'} />
    </VarGrid>
  );
}

const G1: SpgoInput = {
  grid: [
    [0, 0, 0],
    [1, 1, 0],
    [0, 0, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  k: 1,
};
const G2: SpgoInput = {
  grid: [
    [0, 1, 1],
    [1, 1, 0],
    [1, 0, 0],
  ],
  k: 1,
};

export const manifestId = 'imp-11-shortest-path-in-a-grid-with-obstacles-eliminati';
export const title = 'Shortest Path in a Grid with Obstacles Elimination';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'g1', label: '5×3 · k=1 · 6 moves', value: G1 },
    { id: 'g2', label: '3×3 · k=1 · no path', value: G2 },
  ] satisfies SampleInput<SpgoInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SpgoState | undefined;
    const ans = s?.answer ?? -1;
    return { ok: ans !== -1, label: ans === -1 ? 'no path (-1)' : `${ans} moves` };
  },
};

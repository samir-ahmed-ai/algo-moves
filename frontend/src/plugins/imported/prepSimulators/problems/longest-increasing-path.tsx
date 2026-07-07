import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { GridBoard } from '../../../../components/board/GridBoard';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LipInput {
  mat: number[][];
}

interface LipState {
  mat: number[][];
  memo: number[][]; // memo[i][j] = best path length from cell (i,j); 0 = unfilled
  cur: [number, number] | null; // cell DFS is currently resolving
  neighbor: [number, number] | null; // neighbor being inspected
  bestCell: [number, number] | null; // cell where the current overall best starts
  bestLen: number; // best path length found so far across all cells
  done: boolean;
}

const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

function record({ mat }: LipInput): Frame<LipState>[] {
  const m = mat.length;
  const n = mat[0].length;
  const memo: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  let bestCell: [number, number] | null = null;
  let bestLen = 0;

  const snapshot = (): number[][] => memo.map((row) => row.slice());

  const { emit, frames } = createRecorder<LipState>(() => ({
    mat,
    memo: snapshot(),
    cur: null,
    neighbor: null,
    bestCell,
    bestLen,
    done: false,
  }));

  emit(
    'INIT',
    `${m}×${n}`,
    `Longest Increasing Path: find the longest run of strictly increasing values, moving up/down/left/right. We DFS from each cell, only stepping to larger neighbors, and cache each cell's best length in memo so we never recompute it (Time O(m·n), Space O(m·n)).`,
    {},
  );

  const dfs = (i: number, j: number): number => {
    if (memo[i][j] !== 0) {
      emit(
        'CACHE',
        `memo[${i}][${j}]=${memo[i][j]}`,
        `Cell (${i},${j})=${mat[i][j]} was already solved: memo[${i}][${j}] = ${memo[i][j]}. Reuse the cached value instead of re-exploring — this is what makes the algorithm O(m·n).`,
        { cur: [i, j] },
      );
      return memo[i][j];
    }

    emit(
      'VISIT',
      `dfs(${i},${j})`,
      `Start DFS at cell (${i},${j}) with value ${mat[i][j]}. The path is at least length 1 (the cell itself); now look for strictly larger neighbors to extend it.`,
      { cur: [i, j] },
    );

    let best = 1;
    for (const [di, dj] of DIRS) {
      const ni = i + di;
      const nj = j + dj;
      const inBounds = ni >= 0 && nj >= 0 && ni < m && nj < n;
      if (inBounds && mat[ni][nj] > mat[i][j]) {
        emit(
          'STEP',
          `${mat[i][j]}→${mat[ni][nj]}`,
          `Neighbor (${ni},${nj})=${mat[ni][nj]} is strictly greater than ${mat[i][j]}, so we can step there. Recurse to find the longest increasing path that continues from it.`,
          { cur: [i, j], neighbor: [ni, nj] },
        );
        const v = dfs(ni, nj) + 1;
        if (v > best) {
          best = v;
          emit(
            'EXTEND',
            `best=${best}`,
            `The path through (${ni},${nj}) gives length ${v}, which beats the current best for (${i},${j}). Update best = ${best}.`,
            { cur: [i, j], neighbor: [ni, nj] },
          );
        }
      } else if (inBounds) {
        emit(
          'BLOCK',
          `${mat[ni][nj]}≤${mat[i][j]}`,
          `Neighbor (${ni},${nj})=${mat[ni][nj]} is not strictly greater than ${mat[i][j]}, so the path can't increase through it. Skip this direction.`,
          { cur: [i, j], neighbor: [ni, nj] },
        );
      }
    }

    memo[i][j] = best;
    emit(
      'MEMO',
      `memo[${i}][${j}]=${best}`,
      `Done with (${i},${j}): the longest increasing path starting here has length ${best}. Cache it as memo[${i}][${j}] = ${best} and backtrack.`,
      { cur: [i, j] },
    );
    return best;
  };

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const v = dfs(i, j);
      if (v > bestLen) {
        bestLen = v;
        bestCell = [i, j];
        emit(
          'BEST',
          `ans=${bestLen}`,
          `Cell (${i},${j}) starts a path of length ${v}, the longest seen so far. Record answer = ${bestLen} (path begins at (${i},${j})).`,
          { cur: [i, j], bestCell: [i, j], bestLen },
          'good',
        );
      }
    }
  }

  emit(
    'DONE',
    `${bestLen}`,
    `Every cell has been solved and cached. The longest strictly increasing path in the matrix has length ${bestLen}.`,
    { done: true, bestLen },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<LipState>) {
  const s = frame.state;
  const isCur = (r: number, c: number) => s.cur !== null && s.cur[0] === r && s.cur[1] === c;
  const isNeighbor = (r: number, c: number) =>
    s.neighbor !== null && s.neighbor[0] === r && s.neighbor[1] === c;
  const isBest = (r: number, c: number) =>
    s.bestCell !== null && s.bestCell[0] === r && s.bestCell[1] === c;

  const cellTone = (r: number, c: number): string => {
    if (isCur(r, c)) return 'active';
    if (isNeighbor(r, c)) return 'fill';
    if (isBest(r, c)) return 'path';
    if (s.memo[r][c] !== 0) return 'visited';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        longest increasing path ={' '}
        <span className="font-mono text-ink">{s.bestLen === 0 ? '…' : s.bestLen}</span>
      </div>
      <GridBoard grid={s.mat} cellTone={cellTone} active={s.cur} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        memo: {s.memo.flat().filter((v) => v !== 0).length}/{s.mat.length * (s.mat[0]?.length ?? 0)}{' '}
        cells cached
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LipState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.cur;
  const curVal = cur ? s.mat[cur[0]][cur[1]] : null;
  const curMemo = cur ? s.memo[cur[0]][cur[1]] : 0;
  return (
    <VarGrid>
      <InspectorRow k="current cell" v={cur ? `(${cur[0]}, ${cur[1]})` : '—'} />
      <InspectorRow k="mat[cell]" v={curVal ?? '—'} />
      <InspectorRow k="neighbor" v={s.neighbor ? `(${s.neighbor[0]}, ${s.neighbor[1]})` : '—'} />
      <InspectorRow k="memo[cell]" v={curMemo === 0 ? '·' : curMemo} />
      <InspectorRow k="best start" v={s.bestCell ? `(${s.bestCell[0]}, ${s.bestCell[1]})` : '—'} />
      <InspectorRow k="answer" v={s.bestLen === 0 ? '…' : s.bestLen} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-longest-increasing-path';
export const title = 'Longest increasing path';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Longest increasing path"?',
    choices: [
      {
        label: 'DFS + memo longest increasing path — fits this problem',
        correct: true,
      },
      {
        label: 'Spiral four-boundary shrink — different approach',
      },
      {
        label: 'Simulation — different approach',
      },
      {
        label: 'Boundary Simulation — different approach',
      },
    ],
    explain: "DFS only to strictly larger neighbors, caching each cell's best",
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Longest increasing path), what strategy is established?',
    choices: [
      {
        label: 'DFS only to strictly larger neighbors — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      "Longest Increasing Path: find the longest run of strictly increasing values, moving up/down/left/right. We DFS from each cell, only stepping to larger neighbors, and cache each cell's best length in memo so we never recompute it (Time O(m·n), Space O(m·n)).",
  },
  {
    id: 'key-step',
    prompt: 'On the "EXTEND" step (best=), what happens?',
    choices: [
      {
        label: 'The path through (,) gives length — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain:
      'The path through (,) gives length , which beats the current best for (,). Update best = .',
  },
  {
    id: 'state',
    prompt: 'What does the `memo` field track in the visualization state?',
    choices: [
      {
        label: 'memo[i][j] = best path length — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain:
      'The recorder keeps `memo` in sync: memo[i][j] = best path length from cell (i,j); 0 = unfilled',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Longest increasing path"?',
    choices: [
      {
        label: 'O(m·n) time, O(m·n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(m·n). O(m·n). memo[i][j]=1+max(dfs over greater neighbors)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Every cell has been solved — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain:
      'Every cell has been solved and cached. The longest strictly increasing path in the matrix has length .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'lip1',
      label: '[[9,9,4],[6,6,8],[2,1,1]]',
      value: {
        mat: [
          [9, 9, 4],
          [6, 6, 8],
          [2, 1, 1],
        ],
      },
    },
    {
      id: 'lip2',
      label: '[[3,4,5],[3,2,6],[2,2,1]]',
      value: {
        mat: [
          [3, 4, 5],
          [3, 2, 6],
          [2, 2, 1],
        ],
      },
    },
  ] satisfies SampleInput<LipInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LipState | undefined;
    const len = s?.bestLen ?? 0;
    return { ok: len > 0, label: `length ${len}` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface LipInput {
  matrix: number[][];
}

interface LipState {
  matrix: number[][];
  memo: number[][]; // memo[r][c] = longest increasing path starting at (r,c); 0 = not filled
  active: [number, number] | null; // cell DFS currently sits on
  stack: [number, number][]; // active recursion path (the increasing chain being explored)
  neighbor: [number, number] | null; // neighbor being inspected this step
  start: [number, number] | null; // outer-loop start cell
  best: number; // global best path length so far (res)
  result: number | null; // final answer
  done: boolean;
}

const cellKey = (r: number, c: number) => r * 1000 + c;

function record({ matrix }: LipInput): Frame<LipState>[] {
  const m = matrix.length;
  const n = matrix[0].length;
  const memo: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  const dirs: [number, number][] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  const stack: [number, number][] = [];
  let best = 0;
  let start: [number, number] | null = null;

  const { emit, frames } = createRecorder<LipState>(() => ({
    matrix,
    memo: memo.map((row) => row.slice()),
    active: null,
    stack: stack.map((p) => [p[0], p[1]] as [number, number]),
    neighbor: null,
    start,
    best,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `${m}×${n} grid`,
    `Longest Increasing Path: from any cell we may step to an orthogonal neighbor only if its value is strictly larger. We want the longest such chain. dfs(r,c) returns the longest increasing path that STARTS at (r,c); we memoize it so each cell is solved once — Time O(m·n), Space O(m·n).`,
    {},
  );

  const dfs = (r: number, c: number): number => {
    if (memo[r][c] > 0) {
      emit(
        'MEMO_HIT',
        `memo[${r}][${c}]=${memo[r][c]}`,
        `Cell (${r},${c}) value ${matrix[r][c]} was already solved: dfs returns its cached length ${memo[r][c]} without re-exploring. This caching is what keeps the algorithm O(m·n).`,
        { active: [r, c] },
      );
      return memo[r][c];
    }

    stack.push([r, c]);
    emit(
      'VISIT',
      `(${r},${c})=${matrix[r][c]}`,
      `Enter dfs(${r},${c}). The chain starts at least length 1 (the cell itself), so mx = 1. Now look at each strictly-larger neighbor to extend the path.`,
      { active: [r, c] },
    );

    let mx = 1;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
        if (matrix[nr][nc] > matrix[r][c]) {
          emit(
            'EXPLORE',
            `→ (${nr},${nc})`,
            `Neighbor (${nr},${nc})=${matrix[nr][nc]} is greater than ${matrix[r][c]}, so the path can step there. Recurse to find the longest path starting at (${nr},${nc}), then add 1 for the step from (${r},${c}).`,
            { active: [r, c], neighbor: [nr, nc] },
          );
          const v = 1 + dfs(nr, nc);
          if (v > mx) {
            mx = v;
            emit(
              'UPDATE',
              `mx=${mx}`,
              `Going through (${nr},${nc}) gives a chain of length ${v}, the best from (${r},${c}) so far, so mx = ${mx}.`,
              { active: [r, c], neighbor: [nr, nc] },
            );
          }
        } else {
          emit(
            'BLOCK',
            `(${nr},${nc}) not >`,
            `Neighbor (${nr},${nc})=${matrix[nr][nc]} is not strictly greater than ${matrix[r][c]}, so the path cannot increase in that direction. Skip it.`,
            { active: [r, c], neighbor: [nr, nc] },
          );
        }
      }
    }

    memo[r][c] = mx;
    emit(
      'SET',
      `memo[${r}][${c}]=${mx}`,
      `All four directions checked. The longest increasing path starting at (${r},${c}) is ${mx}; store it in memo so any later visit reuses it. Return ${mx}.`,
      { active: [r, c] },
      'good',
    );
    stack.pop();
    return mx;
  };

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      start = [i, j];
      emit(
        'START',
        `start (${i},${j})`,
        `Outer loop: try (${i},${j})=${matrix[i][j]} as a path start. Whatever dfs returns, keep the running maximum across all starting cells.`,
        { active: [i, j] },
      );
      const v = dfs(i, j);
      if (v > best) {
        best = v;
        emit(
          'BEST',
          `best=${best}`,
          `Starting at (${i},${j}) yields a longest path of ${v}, a new global maximum, so best = ${best}.`,
          { active: [i, j] },
          'good',
        );
      }
    }
  }

  emit(
    'DONE',
    `answer ${best}`,
    `Every cell has been solved and cached. The longest strictly increasing path anywhere in the matrix has length ${best}.`,
    { result: best, done: true, active: null },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LipState>) {
  const s = frame.state;
  const stackSet = new Set(s.stack.map(([r, c]) => cellKey(r, c)));
  const cellTone = (r: number, c: number) => {
    if (s.neighbor && s.neighbor[0] === r && s.neighbor[1] === c) return 'fill';
    if (stackSet.has(cellKey(r, c))) return 'path';
    if (s.memo[r][c] > 0) return 'visited';
    return 'land';
  };
  const at = s.active;
  const nb = s.neighbor;
  const chainItems = s.stack.map(([r, c]) => String(s.matrix[r][c]));
  const rail = (
    <>
      <RailStack label="dfs stack" items={chainItems} />
      <RailGroup label="scan">
        <RailStat k="cell" v={at ? `(${at[0]},${at[1]})` : '—'} tone="accent" />
        <RailStat k="val" v={at ? s.matrix[at[0]][at[1]] : '—'} />
        <RailStat k="memo" v={at && s.memo[at[0]][at[1]] > 0 ? s.memo[at[0]][at[1]] : '—'} />
        <RailStat k="nbr" v={nb ? `(${nb[0]},${nb[1]})` : '—'} />
      </RailGroup>
      <RailResult label="best" value={s.result ?? s.best} tone={s.result !== null ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={140}>
      <GridBoard
        grid={s.matrix}
        cellTone={cellTone}
        active={s.active}
        label={(r, c) => `${s.matrix[r][c]}${s.memo[r][c] > 0 ? `·${s.memo[r][c]}` : ''}`}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LipState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = s.active;
  return (
    <VarGrid>
      <InspectorRow k="grid" v={`${s.matrix.length}×${s.matrix[0].length}`} />
      <InspectorRow k="active cell" v={at ? `(${at[0]},${at[1]})` : '—'} />
      <InspectorRow k="value" v={at ? s.matrix[at[0]][at[1]] : '—'} />
      <InspectorRow k="memo[cell]" v={at && s.memo[at[0]][at[1]] > 0 ? s.memo[at[0]][at[1]] : '—'} />
      <InspectorRow k="neighbor" v={s.neighbor ? `(${s.neighbor[0]},${s.neighbor[1]})` : '—'} />
      <InspectorRow k="chain depth" v={s.stack.length} />
      <InspectorRow k="best" v={s.result ?? s.best} />
    </VarGrid>
  );
}

function computeLip(matrix: number[][]): number {
  const m = matrix.length;
  const n = matrix[0].length;
  const memo: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  const dirs: [number, number][] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  const dfs = (r: number, c: number): number => {
    if (memo[r][c] > 0) return memo[r][c];
    let mx = 1;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && matrix[nr][nc] > matrix[r][c]) {
        const v = 1 + dfs(nr, nc);
        if (v > mx) mx = v;
      }
    }
    memo[r][c] = mx;
    return mx;
  };
  let res = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const v = dfs(i, j);
      if (v > res) res = v;
    }
  }
  return res;
}

export const manifestId = 'prep-matrices-longest-increasing-path-in-a-matrix';
export const title = 'Longest Increasing Path in a Matrix';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'lip1',
      label: '[[9,9,4],[6,6,8],[2,1,1]] → 4',
      value: {
        matrix: [
          [9, 9, 4],
          [6, 6, 8],
          [2, 1, 1],
        ],
      },
    },
    {
      id: 'lip2',
      label: '[[3,4,5],[3,2,6],[2,2,1]] → 4',
      value: {
        matrix: [
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
    const answer = s ? computeLip(s.matrix) : 0;
    return { ok: answer > 0, label: `longest path = ${answer}` };
  },
};

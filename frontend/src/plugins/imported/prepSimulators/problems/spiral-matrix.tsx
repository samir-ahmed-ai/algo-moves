import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/board/GridBoard';

interface SpiralInput {
  matrix: number[][];
}

interface SpiralState {
  matrix: number[][];
  top: number;
  bot: number;
  left: number;
  right: number;
  active: [number, number] | null; // cell appended this frame
  visited: boolean[][]; // cells already appended to res
  res: number[]; // output so far
  done: boolean;
}

function emptyVisited(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
}

function cloneVisited(v: boolean[][]): boolean[][] {
  return v.map((row) => row.slice());
}

function record({ matrix }: SpiralInput): Frame<SpiralState>[] {
  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0].length : 0;
  const visited = emptyVisited(rows, cols);
  const res: number[] = [];

  let top = 0;
  let bot = rows - 1;
  let left = 0;
  let right = cols - 1;

  const { emit, frames } = createRecorder<SpiralState>(() => ({
    matrix,
    top,
    bot,
    left,
    right,
    active: null,
    visited: cloneVisited(visited),
    res: res.slice(),
    done: false,
  }));

  const snap = (
    type: string,
    note: string,
    caption: string,
    active: [number, number] | null,
    done: boolean,
    tone?: 'good' | 'bad',
  ) => emit(type, note, caption, { active, done }, tone);

  if (rows === 0 || cols === 0) {
    snap('DONE', 'empty', 'The matrix is empty, so the spiral order is the empty list.', null, true, 'good');
    return frames;
  }

  snap(
    'INIT',
    `${rows}x${cols}`,
    `Spiral Matrix: peel the outer ring of a ${rows}×${cols} grid, then move the four boundaries inward and repeat. Bounds start at top=${top}, bot=${bot}, left=${left}, right=${right}. Time O(m·n), Space O(1).`,
    null,
    false,
  );

  const take = (r: number, c: number) => {
    visited[r][c] = true;
    res.push(matrix[r][c]);
  };

  while (top <= bot && left <= right) {
    // Top row: left -> right.
    for (let c = left; c <= right; c++) {
      take(top, c);
      snap(
        'TOP',
        `${matrix[top][c]}`,
        `Top edge: walk left → right along row ${top}, appending ${matrix[top][c]} from (${top}, ${c}).`,
        [top, c],
        false,
      );
    }
    top++;
    snap(
      'SHRINK',
      `top=${top}`,
      `Finished the top row. Move the top boundary down: top = ${top}. Remaining rows [${top}..${bot}].`,
      null,
      false,
    );

    // Right column: top -> bottom.
    for (let r = top; r <= bot; r++) {
      take(r, right);
      snap(
        'RIGHT',
        `${matrix[r][right]}`,
        `Right edge: walk top → bottom down column ${right}, appending ${matrix[r][right]} from (${r}, ${right}).`,
        [r, right],
        false,
      );
    }
    right--;
    snap(
      'SHRINK',
      `right=${right}`,
      `Finished the right column. Move the right boundary in: right = ${right}. Remaining cols [${left}..${right}].`,
      null,
      false,
    );

    // Bottom row: right -> left (only if a row still remains).
    if (top <= bot) {
      for (let c = right; c >= left; c--) {
        take(bot, c);
        snap(
          'BOTTOM',
          `${matrix[bot][c]}`,
          `Bottom edge: walk right → left along row ${bot}, appending ${matrix[bot][c]} from (${bot}, ${c}).`,
          [bot, c],
          false,
        );
      }
      bot--;
      snap(
        'SHRINK',
        `bot=${bot}`,
        `Finished the bottom row. Move the bottom boundary up: bot = ${bot}. Remaining rows [${top}..${bot}].`,
        null,
        false,
      );
    } else {
      snap(
        'GUARD',
        'skip bottom',
        `Guard top ≤ bot is false, so the bottom row was already consumed — skip it to avoid re-appending cells.`,
        null,
        false,
      );
    }

    // Left column: bottom -> top (only if a column still remains).
    if (left <= right) {
      for (let r = bot; r >= top; r--) {
        take(r, left);
        snap(
          'LEFT',
          `${matrix[r][left]}`,
          `Left edge: walk bottom → top up column ${left}, appending ${matrix[r][left]} from (${r}, ${left}).`,
          [r, left],
          false,
        );
      }
      left++;
      snap(
        'SHRINK',
        `left=${left}`,
        `Finished the left column. Move the left boundary in: left = ${left}. Remaining cols [${left}..${right}].`,
        null,
        false,
      );
    } else {
      snap(
        'GUARD',
        'skip left',
        `Guard left ≤ right is false, so the left column was already consumed — skip it to avoid re-appending cells.`,
        null,
        false,
      );
    }
  }

  snap(
    'DONE',
    `${res.length} cells`,
    `Bounds crossed (top > bot or left > right), so every cell has been peeled exactly once. Spiral order: [${res.join(', ')}].`,
    null,
    true,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SpiralState>) {
  const s = frame.state;
  const cellTone = (r: number, c: number) => {
    if (s.active && s.active[0] === r && s.active[1] === c) return 'path';
    if (s.visited[r]?.[c]) return 'visited';
    return 'land';
  };
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="bounds">
            <RailStat k="rows" v={`[${s.top}..${s.bot}]`} />
            <RailStat k="cols" v={`[${s.left}..${s.right}]`} />
          </RailGroup>
          <RailStack label="result" items={s.res.map(String)} highlightEnd="bottom" topLabel="last" />
          {s.done && <RailResult label="order" value={`[${s.res.join(', ')}]`} tone="good" />}
        </>
      }
    >
      <GridBoard grid={s.matrix} cellTone={cellTone} active={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SpiralState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="top" v={s.top} />
      <InspectorRow k="bot" v={s.bot} />
      <InspectorRow k="left" v={s.left} />
      <InspectorRow k="right" v={s.right} />
      <InspectorRow k="current" v={s.active ? `(${s.active[0]}, ${s.active[1]})` : '—'} />
      <InspectorRow k="appended" v={s.res.length} />
      <InspectorRow k="result" v={s.done ? `[${s.res.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-spiral-matrix';
export const title = 'Spiral Matrix';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sm1',
      label: '3×3',
      value: {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      },
    },
    {
      id: 'sm2',
      label: '3×4',
      value: {
        matrix: [
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [9, 10, 11, 12],
        ],
      },
    },
  ] satisfies SampleInput<SpiralInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SpiralState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    return { ok: true, label: `[${s.res.join(', ')}]` };
  },
};

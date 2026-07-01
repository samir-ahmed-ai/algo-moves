import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/GridBoard';

interface SpiralInput {
  mat: number[][];
}

interface SpiralState {
  mat: number[][];
  startR: number;
  startC: number;
  endR: number;
  endC: number;
  active: [number, number] | null; // cell just appended this frame
  visited: boolean[][]; // cells already appended
  res: number[]; // output so far
  done: boolean;
}

function emptyVisited(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
}

function cloneVisited(v: boolean[][]): boolean[][] {
  return v.map((row) => row.slice());
}

function record({ mat }: SpiralInput): Frame<SpiralState>[] {
  const frames: Frame<SpiralState>[] = [];
  const rows = mat.length;
  const cols = rows > 0 ? mat[0].length : 0;
  const visited = emptyVisited(rows, cols);
  const res: number[] = [];

  let startR = 0;
  let startC = 0;
  let endR = rows - 1;
  let endC = cols - 1;

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: [number, number] | null,
    done: boolean,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        mat,
        startR,
        startC,
        endR,
        endC,
        active,
        visited: cloneVisited(visited),
        res: res.slice(),
        done,
      },
    });

  if (rows === 0 || cols === 0) {
    emit('DONE', 'empty', 'The matrix is empty, so the spiral order is the empty list.', null, true, 'good');
    return frames;
  }

  emit(
    'INIT',
    `${rows}x${cols}`,
    `Spiral order: peel the outer ring of a ${rows}×${cols} matrix, then shrink the four boundaries inward and repeat. Bounds start at rows [${startR}..${endR}] and cols [${startC}..${endC}].`,
    null,
    false,
  );

  const take = (r: number, c: number) => {
    visited[r][c] = true;
    res.push(mat[r][c]);
  };

  while (startR <= endR && startC <= endC) {
    // Top row, left -> right.
    for (let c = startC; c <= endC; c++) {
      take(startR, c);
      emit(
        'TOP',
        `${mat[startR][c]}`,
        `Top row: walk left → right across row ${startR}, appending ${mat[startR][c]} from (${startR}, ${c}).`,
        [startR, c],
        false,
      );
    }
    startR++;
    emit(
      'SHRINK',
      `startR=${startR}`,
      `Top row finished. Drop the top boundary down: startR = ${startR}. Remaining rows [${startR}..${endR}].`,
      null,
      false,
    );

    // Right column, top -> bottom.
    for (let r = startR; r <= endR; r++) {
      take(r, endC);
      emit(
        'RIGHT',
        `${mat[r][endC]}`,
        `Right column: walk top → bottom down column ${endC}, appending ${mat[r][endC]} from (${r}, ${endC}).`,
        [r, endC],
        false,
      );
    }
    endC--;
    emit(
      'SHRINK',
      `endC=${endC}`,
      `Right column finished. Pull the right boundary in: endC = ${endC}. Remaining cols [${startC}..${endC}].`,
      null,
      false,
    );

    // Bottom row, right -> left (only if a row remains).
    if (startR <= endR) {
      for (let c = endC; c >= startC; c--) {
        take(endR, c);
        emit(
          'BOTTOM',
          `${mat[endR][c]}`,
          `Bottom row: walk right → left across row ${endR}, appending ${mat[endR][c]} from (${endR}, ${c}).`,
          [endR, c],
          false,
        );
      }
      endR--;
      emit(
        'SHRINK',
        `endR=${endR}`,
        `Bottom row finished. Lift the bottom boundary up: endR = ${endR}. Remaining rows [${startR}..${endR}].`,
        null,
        false,
      );
    }

    // Left column, bottom -> top (only if a column remains).
    if (startC <= endC) {
      for (let r = endR; r >= startR; r--) {
        take(r, startC);
        emit(
          'LEFT',
          `${mat[r][startC]}`,
          `Left column: walk bottom → top up column ${startC}, appending ${mat[r][startC]} from (${r}, ${startC}).`,
          [r, startC],
          false,
        );
      }
      startC++;
      emit(
        'SHRINK',
        `startC=${startC}`,
        `Left column finished. Push the left boundary in: startC = ${startC}. Remaining cols [${startC}..${endC}].`,
        null,
        false,
      );
    }
  }

  emit(
    'DONE',
    `${res.length} cells`,
    `Bounds crossed (startR > endR or startC > endC), so every cell has been peeled. Spiral order: [${res.join(', ')}].`,
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
  const rail = (
    <>
      <RailGroup label="bounds">
        <RailStat k="r" v={`${s.startR}..${s.endR}`} />
        <RailStat k="c" v={`${s.startC}..${s.endC}`} />
      </RailGroup>
      <RailStack label="result" items={s.res.map(String)} />
      {s.done && <RailResult label="spiral" value={`[${s.res.join(', ')}]`} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <GridBoard grid={s.mat} cellTone={cellTone} active={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SpiralState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="startR" v={s.startR} />
      <InspectorRow k="endR" v={s.endR} />
      <InspectorRow k="startC" v={s.startC} />
      <InspectorRow k="endC" v={s.endC} />
      <InspectorRow k="current" v={s.active ? `(${s.active[0]}, ${s.active[1]})` : '—'} />
      <InspectorRow k="appended" v={s.res.length} />
      <InspectorRow k="result" v={s.done ? `[${s.res.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-print-matrix-in-spiral-order';
export const title = 'Print matrix in spiral Order';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sp1',
      label: '3×3',
      value: {
        mat: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      },
    },
    {
      id: 'sp2',
      label: '3×4',
      value: {
        mat: [
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

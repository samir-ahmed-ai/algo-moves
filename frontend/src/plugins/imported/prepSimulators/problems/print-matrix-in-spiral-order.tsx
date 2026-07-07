import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/board/GridBoard';

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
  const rows = mat.length;
  const cols = rows > 0 ? mat[0]!.length : 0;
  const visited = emptyVisited(rows, cols);
  const res: number[] = [];

  let startR = 0;
  let startC = 0;
  let endR = rows - 1;
  let endC = cols - 1;

  const { emit, frames } = createPrepRecorder<SpiralState>(() => ({
    mat: mat,
    startR: startR,
    startC: startC,
    endR: endR,
    endC: endC,
    visited: cloneVisited(visited),
    res: res.slice(),
    active: null,
    done: false,
  }));

  if (rows === 0 || cols === 0) {
    emit(
      'DONE',
      'empty',
      'The matrix is empty, so the spiral order is the empty list.',
      { active: null, done: true },
      'good',
    );
    return frames;
  }

  emit(
    'INIT',
    `${rows}x${cols}`,
    `Spiral order: peel the outer ring of a ${rows}×${cols} matrix, then shrink the four boundaries inward and repeat. Bounds start at rows [${startR}..${endR}] and cols [${startC}..${endC}].`,
    { active: null, done: false },
  );

  const take = (r: number, c: number) => {
    visited[r]![c] = true;
    res.push(mat[r]![c]!);
  };

  while (startR <= endR && startC <= endC) {
    // Top row, left -> right.
    for (let c = startC; c <= endC; c++) {
      take(startR, c);
      emit(
        'TOP',
        `${mat[startR]![c]}`,
        `Top row: walk left → right across row ${startR}, appending ${mat[startR]![c]} from (${startR}, ${c}).`,
        { active: [startR, c], done: false },
      );
    }
    startR++;
    emit(
      'SHRINK',
      `startR=${startR}`,
      `Top row finished. Drop the top boundary down: startR = ${startR}. Remaining rows [${startR}..${endR}].`,
      { active: null, done: false },
    );

    // Right column, top -> bottom.
    for (let r = startR; r <= endR; r++) {
      take(r, endC);
      emit(
        'RIGHT',
        `${mat[r]![endC]}`,
        `Right column: walk top → bottom down column ${endC}, appending ${mat[r]![endC]} from (${r}, ${endC}).`,
        { active: [r, endC], done: false },
      );
    }
    endC--;
    emit(
      'SHRINK',
      `endC=${endC}`,
      `Right column finished. Pull the right boundary in: endC = ${endC}. Remaining cols [${startC}..${endC}].`,
      { active: null, done: false },
    );

    // Bottom row, right -> left (only if a row remains).
    if (startR <= endR) {
      for (let c = endC; c >= startC; c--) {
        take(endR, c);
        emit(
          'BOTTOM',
          `${mat[endR]![c]}`,
          `Bottom row: walk right → left across row ${endR}, appending ${mat[endR]![c]} from (${endR}, ${c}).`,
          { active: [endR, c], done: false },
        );
      }
      endR--;
      emit(
        'SHRINK',
        `endR=${endR}`,
        `Bottom row finished. Lift the bottom boundary up: endR = ${endR}. Remaining rows [${startR}..${endR}].`,
        { active: null, done: false },
      );
    }

    // Left column, bottom -> top (only if a column remains).
    if (startC <= endC) {
      for (let r = endR; r >= startR; r--) {
        take(r, startC);
        emit(
          'LEFT',
          `${mat[r]![startC]}`,
          `Left column: walk bottom → top up column ${startC}, appending ${mat[r]![startC]} from (${r}, ${startC}).`,
          { active: [r, startC], done: false },
        );
      }
      startC++;
      emit(
        'SHRINK',
        `startC=${startC}`,
        `Left column finished. Push the left boundary in: startC = ${startC}. Remaining cols [${startC}..${endC}].`,
        { active: null, done: false },
      );
    }
  }

  emit(
    'DONE',
    `${res.length} cells`,
    `Bounds crossed (startR > endR or startC > endC), so every cell has been peeled. Spiral order: [${res.join(', ')}].`,
    { active: null, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SpiralState>) {
  const s = frame.state;
  const cellTone = (r: number, c: number) => {
    if (s.active && s.active[0]! === r && s.active[1]! === c) return 'path';
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
      <InspectorRow k="current" v={s.active ? `(${s.active[0]!}, ${s.active[1]!})` : '—'} />
      <InspectorRow k="appended" v={s.res.length} />
      <InspectorRow k="result" v={s.done ? `[${s.res.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-print-matrix-in-spiral-order';
export const title = 'Print matrix in spiral Order';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Print matrix in spiral Order"?',
    choices: [
      {
        label: 'Spiral four-boundary shrink — fits this problem',
        correct: true,
      },
      {
        label: 'Row Comparison (same or inverse of row 0) — different approach',
      },
      {
        label: 'First row/col as markers — different approach',
      },
      {
        label: 'Backtracking word search — different approach',
      },
    ],
    explain: 'Peel top row, right col, bottom row, left col; shrink the four bounds',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Print matrix in spiral Order), what strategy is established?',
    choices: [
      {
        label: 'Peel top row, right col, bottom — described in INIT caption',
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
      'Spiral order: peel the outer ring of a × matrix, then shrink the four boundaries inward and repeat. Bounds start at rows [..] and cols [..].',
  },
  {
    id: 'key-step',
    prompt: 'On the "BOTTOM" step (), what happens?',
    choices: [
      {
        label: 'Bottom row: walk right → left — this move caption',
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
    explain: 'Bottom row: walk right → left across row , appending  from (, ).',
  },
  {
    id: 'state',
    prompt: 'What does the `active` field track in the visualization state?',
    choices: [
      {
        label: 'cell just appended this frame — updated each frame',
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
    explain: 'The recorder keeps `active` in sync: cell just appended this frame',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Print matrix in spiral Order"?',
    choices: [
      {
        label: 'O(m·n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n log n) per axis time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(m·n). O(1). loop while bounds valid; shrink startR/endR/startC/endC each lap',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Bounds crossed (startR > endR — final DONE caption',
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
      'Bounds crossed (startR > endR or startC > endC), so every cell has been peeled. Spiral order: [].',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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

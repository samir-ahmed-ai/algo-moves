import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { GridBoard } from '../../../../components/board/GridBoard';

interface MatrixInput {
  mat: number[][];
  key: number;
}

interface MatrixState {
  mat: number[][];
  key: number;
  i: number | null; // current row
  j: number | null; // current column
  cur: number | null; // mat[i]![j] under inspection
  visited: [number, number][]; // cells the walk has already touched
  result: [number, number] | null; // answer cell, or null when not found
  done: boolean;
}

function record({ mat, key }: MatrixInput): Frame<MatrixState>[] {
  const visited: [number, number][] = [];

  const { emit, frames } = createPrepRecorder<MatrixState>(() => ({
    mat,
    key,
    i: null,
    j: null,
    cur: null,
    visited: visited.map((p): [number, number] => [p[0]!, p[1]!]),
    result: null,
    done: false,
  }));

  if (mat.length === 0) {
    emit(
      'DONE',
      'empty',
      `The matrix is empty, so the key ${key} cannot be present. Return [-1, -1].`,
      { done: true },
      'bad',
    );
    return frames;
  }

  let i = 0;
  let j = mat[0]!.length - 1;

  emit(
    'INIT',
    `key=${key}`,
    `Staircase search: each row is sorted left→right and each column top→bottom. Start at the top-right corner (i=0, j=${j}) — the only cell that is both the largest in its row and the smallest in its column, which makes every comparison decisive.`,
    { i, j, cur: mat[i]![j] },
  );

  while (i < mat.length && j >= 0) {
    const cur = mat[i]![j];
    emit(
      'LOOK',
      `mat[${i}]![${j}]=${cur}`,
      `Inspect the corner cell mat[${i}]![${j}] = ${cur} and compare it with the key ${key}.`,
      { i, j, cur },
    );

    if (cur === key) {
      emit(
        'FOUND',
        `${i},${j}`,
        `mat[${i}]![${j}] = ${cur} equals the key. The key is found at row ${i}, column ${j}. Return [${i}, ${j}].`,
        { i, j, cur, result: [i, j], done: true },
        'good',
      );
      return frames;
    }

    visited.push([i, j]);

    if (cur! > key) {
      emit(
        'LEFT',
        `j-- → ${j - 1}`,
        `${cur} > ${key}, so this whole column is too big at and above this corner — everything below in column ${j} is even larger. Discard the column and move left: j becomes ${j - 1}.`,
        { i, j, cur },
      );
      j--;
    } else {
      emit(
        'DOWN',
        `i++ → ${i + 1}`,
        `${cur} < ${key}, so this whole row is too small from this corner leftward — everything to the left in row ${i} is even smaller. Discard the row and move down: i becomes ${i + 1}.`,
        { i, j, cur },
      );
      i++;
    }
  }

  emit(
    'DONE',
    'not found',
    `The walk stepped off the matrix (i=${i}, j=${j}) without matching, so the key ${key} is not present. Return [-1, -1].`,
    { i: i < mat.length ? i : null, j: j >= 0 ? j : null, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MatrixState>) {
  const s = frame.state;
  const isVisited = (r: number, c: number) => s.visited.some((p) => p[0]! === r && p[1]! === c);
  const cellTone = (r: number, c: number): string => {
    if (s.result && s.result[0]! === r && s.result[1]! === c) return 'path';
    if (s.i === r && s.j === c && !s.done) return 'active';
    if (isVisited(r, c)) return 'visited';
    return '';
  };
  const active: [number, number] | null =
    s.i !== null && s.j !== null && !s.done ? [s.i, s.j] : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        key = <span className="font-mono text-ink">{s.key}</span>
        {s.cur !== null && !s.done && (
          <>
            {' · '}corner = <span className="font-mono text-ink">{s.cur}</span>
          </>
        )}
      </div>
      {s.mat.length === 0 ? (
        <VizEmpty message="empty matrix" />
      ) : (
        <GridBoard grid={s.mat} cellTone={cellTone} active={active} />
      )}
      {s.result ? (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → [{s.result[0]!}, {s.result[1]!}]
        </div>
      ) : s.done ? (
        <div className={cn('mt-1 font-mono text-bad', vizText.base)}>→ [-1, -1]</div>
      ) : null}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MatrixState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cmp =
    s.cur === null || s.done ? '—' : s.cur === s.key ? '= key' : s.cur > s.key ? '> key' : '< key';
  return (
    <VarGrid>
      <InspectorRow k="key" v={s.key} />
      <InspectorRow k="i (row)" v={s.i ?? '—'} />
      <InspectorRow k="j (col)" v={s.j ?? '—'} />
      <InspectorRow k="mat[i]![j]" v={s.cur ?? '—'} />
      <InspectorRow k="vs key" v={cmp} />
      <InspectorRow
        k="result"
        v={s.result ? `[${s.result.join(', ')}]` : s.done ? '[-1, -1]' : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-search-in-sorted-matrix';
export const title = 'Search in sorted matrix';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Search in sorted matrix"?',
    choices: [
      {
        label: 'Staircase search from top-right — fits this problem',
        correct: true,
      },
      {
        label: 'Grid DFS pathfinding — different approach',
      },
      {
        label: '1D meeting point two pointers — different approach',
      },
      {
        label: 'Segment Extraction + Forward/Backward — different approach',
      },
    ],
    explain: 'Start top-right; go left when too big, down when too small',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Search in sorted matrix), what strategy is established?',
    choices: [
      {
        label: 'Start top-right; go left when too — described in INIT caption',
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
      'Staircase search: each row is sorted left→right and each column top→bottom. Start at the top-right corner (i=0, j=) — the only cell that is both the largest in its row and the smallest in its column, which makes every comparison decisive.',
  },
  {
    id: 'key-step',
    prompt: 'On the "LEFT" step (j-- → ), what happens?',
    choices: [
      {
        label: '> , so this whole column — this move caption',
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
      ' > , so this whole column is too big at and above this corner — everything below in column  is even larger. Discard the column and move left: j becomes .',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'current row — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: current row',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Search in sorted matrix"?',
    choices: [
      {
        label: 'O(m+n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(1) extra space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(m+n). O(1). i,j=0,n-1; >key -> j--, else i++',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: '< , so this whole row — final DONE caption',
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
      ' < , so this whole row is too small from this corner leftward — everything to the left in row  is even smaller. Discard the row and move down: i becomes .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ssm1',
      label: 'find 29',
      value: {
        mat: [
          [1, 4, 7, 11],
          [8, 9, 16, 22],
          [10, 13, 29, 30],
          [21, 27, 33, 34],
        ],
        key: 29,
      },
    },
    {
      id: 'ssm2',
      label: 'find 5 (absent)',
      value: {
        mat: [
          [1, 4, 7, 11],
          [8, 9, 16, 22],
          [10, 13, 29, 30],
          [21, 27, 33, 34],
        ],
        key: 5,
      },
    },
  ] satisfies SampleInput<MatrixInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MatrixState | undefined;
    return s?.result
      ? { ok: true, label: `[${s.result.join(',')}]` }
      : { ok: false, label: '[-1,-1]' };
  },
};

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface LineInput {
  mat: number[][];
}

interface DirLengths {
  hor: number; // → consecutive 1s ending here, going left
  ver: number; // ↓ consecutive 1s ending here, going up
  diag: number; // ↘ consecutive 1s ending here, going up-left
  anti: number; // ↙ consecutive 1s ending here, going up-right
}

interface LineState {
  mat: number[][];
  // best[r][c] = the longest of the 4 direction lengths ending at (r,c); 0 if not visited / cell is 0
  best: number[][];
  cur: [number, number] | null; // current cell being processed
  dirs: DirLengths | null; // the 4 direction lengths computed for cur
  res: number; // best line length found so far
  bestDir: string; // which direction gave the local max at cur
  done: boolean;
}

function record({ mat }: LineInput): Frame<LineState>[] {
  const m = mat.length;
  const n = m > 0 ? mat[0].length : 0;

  // best[r][c] for the View — longest line ending at each visited cell.
  const best: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));

  // dp[j] holds the 4 direction lengths for the PREVIOUS row at column j.
  let dp: DirLengths[] = Array.from({ length: n }, () => ({ hor: 0, ver: 0, diag: 0, anti: 0 }));
  let res = 0;

  const { emit, frames } = createRecorder<LineState>(() => ({
    mat: mat,
    best: best.map((row) => row.slice()),
    res: res,
    cur: null,
    dirs: null,
    bestDir: '',
    done: false,
  }));

  emit(
    'INIT',
    `${m}×${n} grid`,
    `Longest Line of Consecutive One: find the longest run of 1s in any of 4 directions — horizontal →, vertical ↓, diagonal ↘, or anti-diagonal ↙. We sweep the matrix once, and for each 1 we extend the run from its neighbours, keeping only the previous row in memory.`,
    { cur: null, dirs: null, bestDir: '' },
  );

  for (let i = 0; i < m; i++) {
    const nd: DirLengths[] = Array.from({ length: n }, () => ({
      hor: 0,
      ver: 0,
      diag: 0,
      anti: 0,
    }));
    for (let j = 0; j < n; j++) {
      if (mat[i][j] === 1) {
        // horizontal: extend the cell to the left in this row
        nd[j].hor = j > 0 ? nd[j - 1].hor + 1 : 1;
        // vertical: extend the cell above (previous row, same column)
        nd[j].ver = dp[j].ver + 1;
        // diagonal ↘: extend the cell up-left (previous row, column j-1)
        nd[j].diag = j > 0 ? dp[j - 1].diag + 1 : 1;
        // anti-diagonal ↙: extend the cell up-right (previous row, column j+1)
        nd[j].anti = j < n - 1 ? dp[j + 1].anti + 1 : 1;

        const local = Math.max(nd[j].hor, nd[j].ver, nd[j].diag, nd[j].anti);
        const bestDir =
          local === nd[j].hor
            ? 'horizontal →'
            : local === nd[j].ver
              ? 'vertical ↓'
              : local === nd[j].diag
                ? 'diagonal ↘'
                : 'anti-diagonal ↙';
        best[i][j] = local;

        const improved = local > res;
        if (improved) res = local;

        emit(
          improved ? 'GROW' : 'CELL',
          `(${i},${j}) max=${local}`,
          `Cell (${i},${j}) is a 1. Extend each direction from its neighbours: horizontal=${nd[j].hor}, vertical=${nd[j].ver}, diagonal=${nd[j].diag}, anti-diagonal=${nd[j].anti}. The longest line ending here is ${local} (${bestDir}).${improved ? ` That beats the old best, so res = ${res}.` : ` The best so far stays ${res}.`}`,
          { cur: [i, j], dirs: { ...nd[j] }, bestDir: bestDir },
        );
      } else {
        emit(
          'ZERO',
          `(${i},${j})=0`,
          `Cell (${i},${j}) is a 0, so no line can pass through it. All four direction lengths reset to 0 here.`,
          { cur: [i, j], dirs: { hor: 0, ver: 0, diag: 0, anti: 0 }, bestDir: '' },
        );
      }
    }
    dp = nd; // slide the window: this row becomes "previous" for the next one
  }

  emit(
    'DONE',
    `${res}`,
    `Sweep complete. The longest line of consecutive 1s in any direction is ${res}.`,
    { cur: null, dirs: null, bestDir: '', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LineState>) {
  const s = frame.state;
  const cellTone = (r: number, c: number) => {
    if (s.cur && s.cur[0] === r && s.cur[1] === c) return s.mat[r][c] === 1 ? 'active' : 'water';
    if (s.mat[r][c] === 0) return 'water';
    if (s.best[r][c] > 0) return s.best[r][c] === s.res ? 'path' : 'visited';
    return 'land';
  };
  const showDirs = s.cur && s.dirs && s.mat[s.cur[0]][s.cur[1]] === 1;
  const at = s.cur ? `(${s.cur[0]},${s.cur[1]})` : '—';
  const rail = (
    <>
      {showDirs && (
        <RailGroup label="cell dirs">
          <RailStat k="cell" v={at} tone="accent" />
          <RailStat k="→" v={s.dirs!.hor} />
          <RailStat k="↓" v={s.dirs!.ver} />
          <RailStat k="↘" v={s.dirs!.diag} />
          <RailStat k="↙" v={s.dirs!.anti} />
          {s.bestDir && <RailStat k="best" v={s.bestDir} />}
        </RailGroup>
      )}
      <RailResult label="longest" value={s.res} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <GridBoard grid={s.mat} cellTone={cellTone} active={s.cur} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LineState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—';
  return (
    <VarGrid>
      <InspectorRow k="cell" v={at} />
      <InspectorRow k="value" v={s.cur ? s.mat[s.cur[0]][s.cur[1]] : '—'} />
      <InspectorRow k="horizontal →" v={s.dirs ? s.dirs.hor : '—'} />
      <InspectorRow k="vertical ↓" v={s.dirs ? s.dirs.ver : '—'} />
      <InspectorRow k="diagonal ↘" v={s.dirs ? s.dirs.diag : '—'} />
      <InspectorRow k="anti-diag ↙" v={s.dirs ? s.dirs.anti : '—'} />
      <InspectorRow k="best dir" v={s.bestDir || '—'} />
      <InspectorRow k="res (answer)" v={s.res} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-longest-line-of-consecutive-one-in-matrix';
export const title = 'Longest Line of Consecutive One in Matrix';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Longest Line of Consecutive One in Matrix"?',
    choices: [
      {
        label: '4-direction DP — fits this problem',
        correct: true,
      },
      {
        label: 'Staircase search from top-right — different approach',
      },
      {
        label: 'DFS + Memoization — different approach',
      },
      {
        label: 'Row Comparison (same or inverse of row 0) — different approach',
      },
    ],
    explain: 'See Longest Line Of Consecutive One In Matrix pattern',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Longest Line of Consecutive One in Matrix), what strategy is established?',
    choices: [
      {
        label: 'See Longest Line Of Consecutive One — described in INIT caption',
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
      'Longest Line of Consecutive One: find the longest run of 1s in any of 4 directions — horizontal →, vertical ↓, diagonal ↘, or anti-diagonal ↙. We sweep the matrix once, and for each 1 we extend the run from its neighbours, keeping only the previous row in memory.',
  },
  {
    id: 'key-step',
    prompt: 'On the "ZERO" step ((,)=0), what happens?',
    choices: [
      {
        label: 'Cell (,) is a 0 — this move caption',
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
      'Cell (,) is a 0, so no line can pass through it. All four direction lengths reset to 0 here.',
  },
  {
    id: 'state',
    prompt: 'What does the `cur` field track in the visualization state?',
    choices: [
      {
        label: 'current cell being processed — updated each frame',
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
    explain: 'The recorder keeps `cur` in sync: current cell being processed',
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "Longest Line of Consecutive One in Matrix"?',
    choices: [
      {
        label: 'O(m·n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n log n) per axis time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(m·n). O(n). Longest Line Of Consecutive One In Matrix',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Sweep complete. The longest line — final DONE caption',
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
    explain: 'Sweep complete. The longest line of consecutive 1s in any direction is .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'lloc1',
      label: '3×4, longest line = 2',
      value: {
        mat: [
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 1],
        ],
      },
    },
    {
      id: 'lloc2',
      label: '3×4 horizontal 3',
      value: {
        mat: [
          [1, 1, 1, 0],
          [0, 1, 0, 1],
          [1, 0, 0, 1],
        ],
      },
    },
  ] satisfies SampleInput<LineInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LineState | undefined;
    const ans = s ? s.res : 0;
    return { ok: ans > 0, label: `longest line = ${ans}` };
  },
};

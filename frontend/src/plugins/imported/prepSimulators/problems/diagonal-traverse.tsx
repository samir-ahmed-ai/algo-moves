import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/board/GridBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, RailGroup, RailResult, RailStack, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';

interface DiagonalInput {
  mat: number[][];
}

interface DiagonalState {
  mat: number[][];
  r: number; // current row
  c: number; // current column
  dir: 1 | -1; // 1 = up-right, -1 = down-left
  res: number[]; // values emitted so far, in output order
  visited: boolean[][]; // cells already appended to res
  done: boolean;
}

function record({ mat }: DiagonalInput): Frame<DiagonalState>[] {
  const m = mat.length;
  const n = mat[0].length;  const res: number[] = [];
  const visited: boolean[][] = mat.map((row) => row.map(() => false));

  let r = 0;
  let c = 0;
  let dir: 1 | -1 = 1;

  const cloneVisited = () => visited.map((row) => row.slice());
  const dirName = (d: 1 | -1) => (d === 1 ? 'up-right ↗' : 'down-left ↙');

  const { emit, frames } = createRecorder<DiagonalState>(() => ({
        mat: mat,
        r: r,
        c: c,
        dir: dir,
        res: res.slice(),
        visited: cloneVisited(),
        done: false
      }));

  emit('INIT', `${m}×${n}`, `Diagonal Traverse: walk the ${m}×${n} matrix along its anti-diagonals in a zig-zag. Start at (0,0) heading ${dirName(dir)}. Each diagonal is read in alternating direction. Time O(m·n), O(1) extra.`, {});

  for (let i = 0; i < m * n; i++) {
    // Append current cell.
    res.push(mat[r][c]);
    visited[r][c] = true;
    emit('VISIT', `take ${mat[r][c]}`, `Read mat[${r}][${c}] = ${mat[r][c]} and append it to the output (now length ${res.length}). Current direction is ${dirName(dir)}.`, {});

    if (i === m * n - 1) break; // all cells collected; stop before moving off-grid

    // Decide the next cell, mirroring the Go solution exactly.
    if (dir === 1) {
      if (c === n - 1) {
        r++;
        dir = -1;
        emit('TURN', `→ down to (${r},${c})`, `Moving up-right but already at the last column (c = ${c} = n−1), so we can't go right. Step DOWN to (${r},${c}) and flip direction to ${dirName(dir)}.`, {});
      } else if (r === 0) {
        c++;
        dir = -1;
        emit('TURN', `→ right to (${r},${c})`, `Moving up-right but already on the top row (r = 0), so we can't go up. Step RIGHT to (${r},${c}) and flip direction to ${dirName(dir)}.`, {});
      } else {
        r--;
        c++;
        emit('STEP', `↗ to (${r},${c})`, `Continue up-right: r−1, c+1 → (${r},${c}). Still inside the grid, keep going ${dirName(dir)}.`, {});
      }
    } else {
      if (r === m - 1) {
        c++;
        dir = 1;
        emit('TURN', `→ right to (${r},${c})`, `Moving down-left but already on the last row (r = ${r} = m−1), so we can't go down. Step RIGHT to (${r},${c}) and flip direction to ${dirName(dir)}.`, {});
      } else if (c === 0) {
        r++;
        dir = 1;
        emit('TURN', `→ down to (${r},${c})`, `Moving down-left but already on the first column (c = 0), so we can't go left. Step DOWN to (${r},${c}) and flip direction to ${dirName(dir)}.`, {});
      } else {
        r++;
        c--;
        emit('STEP', `↙ to (${r},${c})`, `Continue down-left: r+1, c−1 → (${r},${c}). Still inside the grid, keep going ${dirName(dir)}.`, {});
      }
    }
  }

  emit('DONE', `[${res.join(',')}]`, `Every one of the ${m * n} cells has been read exactly once. The diagonal order is [${res.join(', ')}].`, { done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<DiagonalState>) {
  const s = frame.state;
  const cellTone = (r: number, c: number) => {
    if (!s.done && r === s.r && c === s.c) return 'path';
    if (s.visited[r]?.[c]) return 'visited';
    return '';
  };
  const active: [number, number] | null = s.done ? null : [s.r, s.c];
  const dirLabel = s.dir === 1 ? '↗' : '↙';
  return (
    <VizStage rail={<>
      <RailGroup label="pos">
        <RailStat k="r" v={s.r} />
        <RailStat k="c" v={s.c} />
        <RailStat k="dir" v={dirLabel} tone="accent" />
      </RailGroup>
      <RailStack label="output" items={s.res.map(String)} highlightEnd="bottom" topLabel="last" />
      {s.done && <RailResult label="answer" value={`[${s.res.join(',')}]`} tone="good" />}
    </>}>
      <GridBoard grid={s.mat} cellTone={cellTone} active={active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DiagonalState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="r,c" v={`(${s.r}, ${s.c})`} />
      <InspectorRow k="dir" v={s.dir === 1 ? 'up-right ↗' : 'down-left ↙'} />
      <InspectorRow k="mat[r][c]" v={s.mat[s.r]?.[s.c] ?? '—'} />
      <InspectorRow k="collected" v={s.res.length} />
      <InspectorRow k="result" v={s.done ? `[${s.res.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-matrices-diagonal-traverse';
export const title = 'Diagonal Traverse';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Diagonal Traverse\"?",
    choices: [
      {
        label: "Simulation — fits this problem",
        correct: true
      },
      {
        label: "8-direction DFS region size — different approach"
      },
      {
        label: "Layer-by-layer 90° rotation — different approach"
      },
      {
        label: "DFS + memo longest increasing path — different approach"
      }
    ],
    explain: "See Diagonal Traverse pattern"
  },
  {
    id: "init",
    prompt: "At the start of a run (Diagonal Traverse), what strategy is established?",
    choices: [
      {
        label: "See Diagonal Traverse pattern — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "Diagonal Traverse: walk the × matrix along its anti-diagonals in a zig-zag. Start at (0,0) heading . Each diagonal is read in alternating direction. Time O(m·n), O(1) extra."
  },
  {
    id: "key-step",
    prompt: "On the \"STEP\" step (↗ to (,)), what happens?",
    choices: [
      {
        label: "Continue up-right: r−1, c+1 → (,). — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "Continue up-right: r−1, c+1 → (,). Still inside the grid, keep going ."
  },
  {
    id: "state",
    prompt: "What does the `r` field track in the visualization state?",
    choices: [
      {
        label: "current row — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder keeps `r` in sync: current row"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Diagonal Traverse\"?",
    choices: [
      {
        label: "O(m·n) time, O(1) extra space — standard bounds here",
        correct: true
      },
      {
        label: "O(m·n) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(m+n) time, O(1) space — wrong order of growth"
      }
    ],
    explain: "O(m·n). O(1) extra. Diagonal Traverse"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Every one of the cells — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "Every one of the  cells has been read exactly once. The diagonal order is []."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'dt1',
      label: '[[1,2,3],[4,5,6],[7,8,9]]',
      value: { mat: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
    },
    {
      id: 'dt2',
      label: '[[1,2],[3,4]]',
      value: { mat: [[1, 2], [3, 4]] },
    },
  ] satisfies SampleInput<DiagonalInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DiagonalState | undefined;
    return s
      ? { ok: true, label: `[${s.res.join(',')}]` }
      : { ok: false, label: 'no result' };
  },
};

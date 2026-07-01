import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const frames: Frame<LineState>[] = [];
  const m = mat.length;
  const n = m > 0 ? mat[0].length : 0;

  // best[r][c] for the View — longest line ending at each visited cell.
  const best: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));

  // dp[j] holds the 4 direction lengths for the PREVIOUS row at column j.
  let dp: DirLengths[] = Array.from({ length: n }, () => ({ hor: 0, ver: 0, diag: 0, anti: 0 }));
  let res = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    cur: [number, number] | null,
    dirs: DirLengths | null,
    bestDir: string,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        mat,
        best: best.map((row) => row.slice()),
        cur,
        dirs,
        res,
        bestDir,
        done: type === 'DONE',
      },
    });

  emit(
    'INIT',
    `${m}×${n} grid`,
    `Longest Line of Consecutive One: find the longest run of 1s in any of 4 directions — horizontal →, vertical ↓, diagonal ↘, or anti-diagonal ↙. We sweep the matrix once, and for each 1 we extend the run from its neighbours, keeping only the previous row in memory.`,
    null,
    null,
    '',
  );

  for (let i = 0; i < m; i++) {
    const nd: DirLengths[] = Array.from({ length: n }, () => ({ hor: 0, ver: 0, diag: 0, anti: 0 }));
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
          [i, j],
          { ...nd[j] },
          bestDir,
          improved ? 'good' : undefined,
        );
      } else {
        emit(
          'ZERO',
          `(${i},${j})=0`,
          `Cell (${i},${j}) is a 0, so no line can pass through it. All four direction lengths reset to 0 here.`,
          [i, j],
          { hor: 0, ver: 0, diag: 0, anti: 0 },
          '',
        );
      }
    }
    dp = nd; // slide the window: this row becomes "previous" for the next one
  }

  emit(
    'DONE',
    `${res}`,
    `Sweep complete. The longest line of consecutive 1s in any direction is ${res}.`,
    null,
    null,
    '',
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        longest line ={' '}
        <span className="font-mono text-ink">{s.res}</span>
        {s.cur && s.dirs && s.mat[s.cur[0]][s.cur[1]] === 1 && (
          <>
            {' · '}at ({s.cur[0]},{s.cur[1]}):{' '}
            <span className="font-mono text-ink">
              →{s.dirs.hor} ↓{s.dirs.ver} ↘{s.dirs.diag} ↙{s.dirs.anti}
            </span>
          </>
        )}
      </div>
      <GridBoard grid={s.mat} cellTone={cellTone} active={s.cur} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        green = a cell on the current longest line; the active cell shows its 4 direction lengths
      </div>
    </div>
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

export const simulator: ProblemSimulator = {
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

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CinemaInput {
  n: number;
  reservedSeats: [number, number][];
}

// Candidate group windows over seats 2..9 (1-indexed). Each is 4 consecutive seats.
// left  = seats 2,3,4,5 -> bits 2..5
// mid   = seats 4,5,6,7 -> bits 4..7
// right = seats 6,7,8,9 -> bits 6..9
const LEFT_MASK = 0b0000111100;
const MID_MASK = 0b0011110000;
const RIGHT_MASK = 0b1111000000;
const LEFT_SEATS = [2, 3, 4, 5];
const RIGHT_SEATS = [6, 7, 8, 9];

interface CinemaState {
  n: number;
  row: number | null; // row currently inspected (null before/after loop)
  mask: number; // bitmask of reserved seats in the current row
  reservedInRow: number[]; // seat numbers reserved in current row (for highlight)
  left: boolean; // seats 2-5 all free
  mid: boolean; // seats 4-7 all free
  right: boolean; // seats 6-9 all free
  granted: number[]; // seat numbers of groups placed this row (for green highlight)
  res: number; // running answer
  processed: [number, number][]; // [row, delta] log of decisions so far
  done: boolean;
}

function record({ n, reservedSeats }: CinemaInput): Frame<CinemaState>[] {
  const frames: Frame<CinemaState>[] = [];

  // Build one bitmask per row that has any reserved seat (mirrors the Go map).
  const rows = new Map<number, number>();
  for (const [r, seat] of reservedSeats) {
    rows.set(r, (rows.get(r) ?? 0) | (1 << seat));
  }
  const rowList = [...rows.entries()].sort((a, b) => a[0] - b[0]);

  let res = 2 * n;
  const processed: [number, number][] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<CinemaState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        n,
        row: null,
        mask: 0,
        reservedInRow: [],
        left: false,
        mid: false,
        right: false,
        granted: [],
        res,
        processed: processed.map((p) => [p[0], p[1]] as [number, number]),
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Cinema Seat Allocation: each of ${n} rows has 10 seats. A family needs 4 consecutive seats, and only the three windows 2-5, 4-7 or 6-9 count. At most 2 families fit per row, so start optimistically at 2 x ${n} = ${2 * n}. Rows with no reservation keep both groups; we only revisit rows that have a reserved seat.`,
    { res: 2 * n },
  );

  for (const [row, mask] of rowList) {
    const reservedInRow: number[] = [];
    for (let seat = 1; seat <= 10; seat++) {
      if (mask & (1 << seat)) reservedInRow.push(seat);
    }

    emit(
      'ROW',
      `row ${row}`,
      `Row ${row} has reserved seats { ${reservedInRow.join(', ')} }. Encode them as a bitmask, then test whether each 4-seat window is still fully open.`,
      { row, mask, reservedInRow },
    );

    const left = (mask & LEFT_MASK) === 0; // seats 2-5 free
    const mid = (mask & MID_MASK) === 0; // seats 4-7 free
    const right = (mask & RIGHT_MASK) === 0; // seats 6-9 free

    emit(
      'CHECK',
      `L=${left ? 1 : 0} M=${mid ? 1 : 0} R=${right ? 1 : 0}`,
      `Test the three windows against row ${row}: left seats 2-5 ${left ? 'free' : 'blocked'}, middle seats 4-7 ${mid ? 'free' : 'blocked'}, right seats 6-9 ${right ? 'free' : 'blocked'}.`,
      { row, mask, reservedInRow, left, mid, right },
    );

    if (left && right) {
      // Both non-overlapping windows fit -> 2 groups, already counted.
      processed.push([row, 0]);
      emit(
        'KEEP',
        'row 2',
        `Both the left (2-5) and right (6-9) windows are free and don't overlap, so 2 families still fit in row ${row}. No change — it was already counted as 2.`,
        {
          row,
          mask,
          reservedInRow,
          left,
          mid,
          right,
          granted: [...LEFT_SEATS, ...RIGHT_SEATS],
        },
        'good',
      );
    } else if (left || mid || right) {
      res -= 1;
      processed.push([row, -1]);
      const granted = left ? LEFT_SEATS : right ? RIGHT_SEATS : [4, 5, 6, 7];
      emit(
        'ONE',
        'res-1',
        `Only one window survives in row ${row} (${left ? 'left 2-5' : right ? 'right 6-9' : 'middle 4-7'}). That fits a single family instead of two, so subtract 1 -> res = ${res}.`,
        { row, mask, reservedInRow, left, mid, right, granted },
      );
    } else {
      res -= 2;
      processed.push([row, -2]);
      emit(
        'NONE',
        'res-2',
        `Every window in row ${row} is blocked — no family fits. This row contributes 0 instead of 2, so subtract 2 -> res = ${res}.`,
        { row, mask, reservedInRow, left, mid, right, granted: [] },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `${res} families`,
    `All reserved rows handled (each in O(1) work). The remaining ${n - rowList.length} untouched rows still hold 2 families each. Final answer: ${res} families.`,
    { res, done: true },
    'good',
  );

  return frames;
}

const SEAT_COUNT = 10;

function View({ frame }: PluginViewProps<CinemaState>) {
  const s = frame.state;
  // 10 seats, 1-indexed on the board; index 0 of the array maps to seat 1.
  const values = Array.from({ length: SEAT_COUNT }, (_, k) => k + 1);
  const grantedSet = new Set(s.granted);
  const reservedSet = new Set(s.reservedInRow);

  const cellTone = (i: number): string => {
    const seat = i + 1;
    if (reservedSet.has(seat)) return 'dead';
    if (grantedSet.has(seat)) return 'found';
    // Highlight the candidate windows so the 2-5 / 4-7 / 6-9 shape is visible.
    if (seat >= 2 && seat <= 9 && s.row !== null) return 'in-window';
    return '';
  };

  const pointers: ArrayPointer[] = [];
  if (s.row !== null && s.reservedInRow.length > 0) {
    pointers.push({ i: s.reservedInRow[0] - 1, label: 'X', tone: 'bad', place: 'above' });
  }

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span> rows · answer ={' '}
        <span className="font-mono text-ink">{s.res}</span>
        {s.row !== null && !s.done && (
          <>
            {' · '}row{' '}
            <span className="font-mono text-ink">{s.row}</span>
          </>
        )}
      </div>
      <ArrayRow
        values={values}
        cellTone={cellTone}
        pointers={pointers}
        windowRange={null}
        label={(i) => `s${i + 1}`}
      />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        windows: left 2-5 ={' '}
        <span className={s.left ? 'text-good' : 'text-bad'}>{s.left ? 'free' : 'blocked'}</span>
        {' · '}mid 4-7 ={' '}
        <span className={s.mid ? 'text-good' : 'text-bad'}>{s.mid ? 'free' : 'blocked'}</span>
        {' · '}right 6-9 ={' '}
        <span className={s.right ? 'text-good' : 'text-bad'}>{s.right ? 'free' : 'blocked'}</span>
      </div>
      {s.processed.length > 0 && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          decisions: {s.processed.map(([r, d]) => `r${r}:${d > 0 ? '+' : ''}${d}`).join(', ')}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CinemaState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const bits = s.row !== null ? s.mask.toString(2).padStart(11, '0') : '—';
  return (
    <VarGrid>
      <InspectorRow k="n (rows)" v={s.n} />
      <InspectorRow k="row" v={s.row ?? '—'} />
      <InspectorRow k="reserved" v={s.reservedInRow.length ? `{${s.reservedInRow.join(',')}}` : '—'} />
      <InspectorRow k="mask" v={bits} />
      <InspectorRow k="left 2-5" v={s.row !== null ? (s.left ? 'free' : 'blocked') : '—'} />
      <InspectorRow k="mid 4-7" v={s.row !== null ? (s.mid ? 'free' : 'blocked') : '—'} />
      <InspectorRow k="right 6-9" v={s.row !== null ? (s.right ? 'free' : 'blocked') : '—'} />
      <InspectorRow k="res" v={s.res} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-cinema-seat-allocation';
export const title = 'Cinema Seat Allocation';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'csa1',
      label: 'n=3, 5 reserved',
      value: {
        n: 3,
        reservedSeats: [
          [1, 2],
          [1, 3],
          [1, 8],
          [2, 6],
          [3, 1],
          [3, 10],
        ],
      },
    },
    {
      id: 'csa2',
      label: 'n=2, block middle',
      value: {
        n: 2,
        reservedSeats: [
          [2, 1],
          [1, 8],
          [2, 6],
        ],
      },
    },
  ] satisfies SampleInput<CinemaInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CinemaState | undefined;
    const v = s ? s.res : 0;
    return { ok: true, label: `${v} families` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { GridBoard } from '../../../../components/GridBoard';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

const MOD = 1_000_000_007;

// The 6 DP states, column order = [A0L0, A0L1, A0L2, A1L0, A1L1, A1L2].
// absences = a (0 or 1), trailing Ls = l (0, 1 or 2).
const STATE_LABELS = ['A0L0', 'A0L1', 'A0L2', 'A1L0', 'A1L1', 'A1L2'];
const idx = (a: number, l: number) => a * 3 + l;

interface AttInput {
  n: number;
}

interface AttState {
  n: number;
  // table[day] = the 6 counts after `day` characters (day 0 = empty record).
  table: number[][];
  day: number | null; // row just filled (highlight)
  done: boolean;
  answer: number | null;
}

// Returns one full table where row d = the 6-state vector after d characters.
function buildTable(n: number): number[][] {
  // Day 0: empty record sits in state A0L0 (no absences, no trailing Ls).
  const table: number[][] = [[1, 0, 0, 0, 0, 0]];
  if (n === 0) return table;

  // Day 1 base case (mirrors the Go seed dp[0][0]=dp[0][1]=dp[1][0]=1).
  const day1 = [0, 0, 0, 0, 0, 0];
  day1[idx(0, 0)] = 1; // "P"
  day1[idx(0, 1)] = 1; // "L"
  day1[idx(1, 0)] = 1; // "A"
  table.push(day1);

  for (let i = 2; i <= n; i++) {
    const prev = table[i - 1];
    const nd = [0, 0, 0, 0, 0, 0];
    // Append 'P': resets trailing Ls to 0, absences unchanged.
    nd[idx(0, 0)] = (prev[idx(0, 0)] + prev[idx(0, 1)] + prev[idx(0, 2)]) % MOD;
    nd[idx(1, 0)] = (prev[idx(1, 0)] + prev[idx(1, 1)] + prev[idx(1, 2)]) % MOD;
    // Append 'L': bumps trailing Ls by one, absences unchanged.
    nd[idx(0, 1)] = prev[idx(0, 0)];
    nd[idx(0, 2)] = prev[idx(0, 1)];
    nd[idx(1, 1)] = prev[idx(1, 0)];
    nd[idx(1, 2)] = prev[idx(1, 1)];
    // Append 'A': only legal from a 0-absence state; lands in A1L0.
    nd[idx(1, 0)] = (nd[idx(1, 0)] + prev[idx(0, 0)] + prev[idx(0, 1)] + prev[idx(0, 2)]) % MOD;
    table.push(nd);
  }
  return table;
}

function sumRow(row: number[]): number {
  return row.reduce((acc, v) => (acc + v) % MOD, 0);
}

function record({ n }: AttInput): Frame<AttState>[] {
  const full = buildTable(n);
  const frames: Frame<AttState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    day: number | null,
    upto: number, // rows of `full` revealed so far
    answer: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { n, table: full.slice(0, upto).map((r) => r.slice()), day, done: type === 'DONE', answer },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Student Attendance Record II: count valid length-${n} records (fewer than 2 total 'A', never 3 'L' in a row) mod 1e9+7. Each cell = how many records sit in one of the 6 states A0L0…A1L2 after that many days, where AxLy means x absences so far and y trailing 'L's.`,
    null,
    1, // reveal day 0 only
    null,
  );

  // Day 1 base case.
  emit(
    'BASE',
    'day 1 seeded',
    `Day 1 base case: a 1-char record is "P" (state A0L0), "L" (state A0L1) or "A" (state A1L0) — one record each, so those three cells are 1.`,
    1,
    2,
    null,
  );

  for (let i = 2; i <= n; i++) {
    const row = full[i];
    emit(
      'FILL',
      `day ${i}`,
      `Day ${i}: extend every day-${i - 1} record by one of P/L/A. P resets trailing L's, L bumps them up (3 L's is illegal so A?L2 has no L-child), A is only allowed from a 0-absence state and lands in A1L0. The 6 counts become [${row.join(', ')}].`,
      i,
      i + 1,
      null,
    );
  }

  const answer = n === 0 ? 1 : sumRow(full[n]);
  emit(
    'DONE',
    `${answer} records`,
    `Sum the 6 counts on day ${n}: ${full[n].join(' + ')} = ${answer}. So there are ${answer} valid attendance records of length ${n}.`,
    n,
    n + 1,
    answer,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<AttState>) {
  const s = frame.state;
  // Header row of state labels + one row per revealed day.
  const grid: (number | string)[][] = [['day', ...STATE_LABELS]];
  s.table.forEach((row, d) => {
    grid.push([d, ...row]);
  });

  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return ''; // header band
    const day = r - 1;
    if (s.day !== null && day === s.day) return s.done ? 'path' : 'active';
    return 'visited';
  };

  const answer = s.answer !== null ? s.answer : '…filling';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = {s.n}, valid records = <span className="font-mono text-ink">{answer}</span>
      </div>
      <GridBoard grid={grid} cellTone={cellTone} active={null} cellSize={52} />
      <div className={cn(vizText.sm, 'text-ink3')}>row = day, column = state (absences × trailing L's), value = record count</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<AttState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const row = s.day !== null ? s.table[s.day] : null;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="current day" v={s.day ?? '—'} />
      <InspectorRow k="row sum" v={row ? sumRow(row) : '—'} />
      <InspectorRow k="answer" v={s.answer !== null ? `${s.answer} records` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-84-student-attendance-record-ii';
export const title = 'Student Attendance Record II';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'n2', label: 'n = 2 (answer 8)', value: { n: 2 } },
    { id: 'n3', label: 'n = 3 (answer 19)', value: { n: 3 } },
  ] satisfies SampleInput<AttInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AttState | undefined;
    const v = s?.answer ?? 0;
    return { ok: true, label: `${v} records` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { GridBoard } from '../../../../components/GridBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, RailGroup, RailResult, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';

interface ReInput {
  s: string;
  p: string;
}

interface ReState {
  s: string;
  p: string;
  dp: (boolean | null)[][]; // null = not yet filled; dp[i][j] = s[0..i) matches p[0..j)
  cur: [number, number] | null;
  done: boolean;
}

function record({ s, p }: ReInput): Frame<ReState>[] {
  const m = s.length;
  const n = p.length;
  const dp: (boolean | null)[][] = Array.from({ length: m + 1 }, () => new Array<boolean | null>(n + 1).fill(null));
  const { emit, frames } = createRecorder<ReState>(() => ({
        s: s,
        p: p,
        dp: dp.map((r) => r.slice()),
        cur: null,
        done: false
      }));

  emit('INIT', `"${s}" ~ "${p}"`, `Regular Expression Matching: does the whole string "${s}" match the pattern "${p}", where '.' matches any single char and '*' means zero-or-more of the preceding element? dp[i][j] is true when the first i chars of s match the first j chars of p.`, { cur: null });

  dp[0][0] = true;
  emit('BASE', `dp[0][0]=✓`, `Base case: an empty string matches an empty pattern, so dp[0][0] = true.`, { cur: [0, 0] });

  // First row: empty string vs non-empty pattern. Only "x*" groups can match "".
  for (let j = 1; j <= n; j++) {
    if (p[j - 1] === '*') {
      dp[0][j] = dp[0][j - 2] ?? false;
      emit('BASE', `dp[0][${j}]=${dp[0][j] ? '✓' : '✗'}`, `Empty string row: '${p[j - 1]}' lets the group "${p[j - 2]}*" match zero times, so dp[0][${j}] copies dp[0][${j - 2}] = ${dp[0][j - 2] ? 'true' : 'false'} → ${dp[0][j] ? 'true' : 'false'}.`, { cur: [0, j] });
    } else {
      dp[0][j] = false;
      emit('BASE', `dp[0][${j}]=✗`, `Empty string row: pattern char '${p[j - 1]}' is not '*', so it must consume a char that the empty string lacks — dp[0][${j}] = false.`, { cur: [0, j] });
    }
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sc = s[i - 1];
      const pc = p[j - 1];
      if (pc === '*') {
        const prev = p[j - 2];
        const zero = dp[i][j - 2] ?? false;
        const charMatches = prev === '.' || prev === sc;
        const more = charMatches ? (dp[i - 1][j] ?? false) : false;
        dp[i][j] = zero || more;
        emit('FILL', `dp[${i}][${j}]=${dp[i][j] ? '✓' : '✗'}`, `'*' on group "${prev}*": use it zero times → dp[${i}][${j - 2}] = ${zero}, OR (since '${prev}' ${charMatches ? `matches '${sc}'` : `does not match '${sc}'`}) consume '${sc}' and reuse the star → ${charMatches ? `dp[${i - 1}][${j}] = ${more}` : 'unavailable'}. dp[${i}][${j}] = ${dp[i][j]}.`, { cur: [i, j] });
      } else {
        const charMatches = pc === '.' || pc === sc;
        dp[i][j] = charMatches ? (dp[i - 1][j - 1] ?? false) : false;
        emit('FILL', `dp[${i}][${j}]=${dp[i][j] ? '✓' : '✗'}`, `'${pc}' ${charMatches ? `matches '${sc}'` : `does not match '${sc}'`}: ${charMatches ? `carry the diagonal dp[${i - 1}][${j - 1}] = ${dp[i - 1][j - 1]}` : 'no match here'}. dp[${i}][${j}] = ${dp[i][j]}.`, { cur: [i, j] });
      }
    }
  }

  const ans = dp[m][n] ?? false;
  emit('DONE', ans ? 'match ✓' : 'no match ✗', `The table is full. dp[${m}][${n}] = ${ans}, so "${s}" ${ans ? 'matches' : 'does not match'} "${p}".`, { cur: [m, n] , done: true }, 'good');
  return frames;
}

function buildDisplay(state: ReState): (number | string)[][] {
  const m = state.s.length;
  const n = state.p.length;
  // +2 for header row (pattern chars) and header col (string chars), with an ε corner.
  const display: (number | string)[][] = Array.from({ length: m + 2 }, () => new Array<number | string>(n + 2).fill(''));
  display[0][1] = 'ε';
  for (let j = 0; j < n; j++) display[0][j + 2] = state.p[j];
  display[1][0] = 'ε';
  for (let i = 0; i < m; i++) display[i + 2][0] = state.s[i];
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      const v = state.dp[i][j];
      display[i + 1][j + 1] = v === null ? '' : v ? '✓' : '✗';
    }
  }
  return display;
}

function View({ frame }: PluginViewProps<ReState>) {
  const s = frame.state;
  const m = s.s.length;
  const n = s.p.length;
  const display = buildDisplay(s);
  const final = s.dp[m][n];
  const displayActive: [number, number] | null = s.cur ? [s.cur[0] + 1, s.cur[1] + 1] : null;
  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'land';
    if (s.cur && s.cur[0] + 1 === r && s.cur[1] + 1 === c) return 'active';
    const v = s.dp[r - 1][c - 1];
    return v === null ? '' : 'visited';
  };
  const cellVal = s.cur ? s.dp[s.cur[0]][s.cur[1]] : null;
  const cellStr = cellVal === null ? '—' : cellVal ? '✓' : '✗';
  const ansDone = final !== null;
  const ansLabel = final === null ? '…' : final ? 'match' : 'no match';
  return (
    <VizStage rail={<>
      <RailGroup label="cell">
        <RailStat k="pos" v={s.cur ? `dp[${s.cur[0]}][${s.cur[1]}]` : '—'} />
        <RailStat k="val" v={cellStr} tone={cellVal === true ? 'good' : cellVal === false ? 'bad' : undefined} />
      </RailGroup>
      <RailResult label="answer" value={ansLabel} tone={ansDone ? (final ? 'good' : 'bad') : 'accent'} />
    </>}>
      <GridBoard grid={display} cellTone={cellTone} active={displayActive} cellSize={36} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ReState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const m = s.s.length;
  const n = s.p.length;
  const cellVal = s.cur ? s.dp[s.cur[0]][s.cur[1]] : null;
  const cellStr = cellVal === null ? '—' : cellVal ? '✓ true' : '✗ false';
  const final = s.dp[m][n];
  const answer = final === null ? '…filling' : final ? 'match ✓' : 'no match ✗';
  return (
    <VarGrid>
      <InspectorRow k="string" v={`"${s.s}"`} />
      <InspectorRow k="pattern" v={`"${s.p}"`} />
      <InspectorRow k="cell" v={s.cur ? `dp[${s.cur[0]}][${s.cur[1]}]` : '—'} />
      <InspectorRow k="cell value" v={cellStr} />
      <InspectorRow k="dp[m][n]" v={answer} />
    </VarGrid>
  );
}

export const manifestId = 'imp-82-regular-expression-matching';
export const title = 'Regular Expression Matching';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'aa-astar', label: '"aa" ~ "a*"', value: { s: 'aa', p: 'a*' } },
    { id: 'ab-dotstar', label: '"ab" ~ ".*"', value: { s: 'ab', p: '.*' } },
  ] satisfies SampleInput<ReInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const last = frames[frames.length - 1]?.state as ReState | undefined;
    if (!last) return { ok: false, label: 'no match' };
    const v = last.dp[last.s.length][last.p.length] ?? false;
    return { ok: v, label: v ? 'match' : 'no match' };
  },
};

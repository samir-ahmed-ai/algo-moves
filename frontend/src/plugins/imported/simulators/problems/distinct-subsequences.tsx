import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
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

interface DSInput {
  s: string; // source
  t: string; // target
}

interface DSState {
  s: string;
  t: string;
  dp: number[][]; // (m+1) x (n+1), -1 = not yet filled
  cur: [number, number] | null;
  done: boolean;
}

function record({ s, t }: DSInput): Frame<DSState>[] {
  const m = s.length;
  const n = t.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(-1));
  const { emit, frames } = createRecorder<DSState>(() => ({
    s: s,
    t: t,
    dp: dp.map((r) => r.slice()),
    cur: null,
    done: false,
  }));

  emit(
    'INIT',
    `"${s}" / "${t}"`,
    `Distinct Subsequences: count how many distinct subsequences of "${s}" equal "${t}". dp[i][j] is the number of ways the first i chars of "${s}" can form the first j chars of "${t}", built bottom-up.`,
    { cur: null },
  );

  for (let i = 0; i <= m; i++) {
    dp[i][0] = 1;
    emit(
      'BASE',
      `dp[${i}][0]=1`,
      `Base case: the empty target "" can always be formed exactly 1 way (pick nothing), so dp[${i}][0] = 1.`,
      { cur: [i, 0] },
    );
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cs = s[i - 1];
      const ct = t[j - 1];
      const skip = dp[i - 1][j];
      if (cs === ct) {
        const take = dp[i - 1][j - 1];
        dp[i][j] = skip + take;
        emit(
          'FILL',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `'${cs}' == '${ct}': either skip this '${cs}' (dp[${i - 1}][${j}]=${skip}) or use it to match (dp[${i - 1}][${j - 1}]=${take}). dp[${i}][${j}] = ${skip} + ${take} = ${dp[i][j]}.`,
          { cur: [i, j] },
        );
      } else {
        dp[i][j] = skip;
        emit(
          'FILL',
          `dp[${i}][${j}]=${dp[i][j]}`,
          `'${cs}' != '${ct}': this '${cs}' cannot match '${ct}', so just carry from above. dp[${i}][${j}] = dp[${i - 1}][${j}] = ${skip}.`,
          { cur: [i, j] },
        );
      }
    }
  }

  emit(
    'DONE',
    `${dp[m][n]} ways`,
    `The table is full. dp[${m}][${n}] = ${dp[m][n]}, so "${s}" contains ${dp[m][n]} distinct subsequence(s) equal to "${t}".`,
    { cur: [m, n], done: true },
    'good',
  );
  return frames;
}

function buildDisplay(state: DSState): (number | string)[][] {
  const m = state.s.length;
  const n = state.t.length;
  const display: (number | string)[][] = Array.from({ length: m + 2 }, () =>
    new Array<number | string>(n + 2).fill(''),
  );
  display[0][1] = 'ε';
  for (let j = 0; j < n; j++) display[0][j + 2] = state.t[j];
  display[1][0] = 'ε';
  for (let i = 0; i < m; i++) display[i + 2][0] = state.s[i];
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      display[i + 1][j + 1] = state.dp[i][j] < 0 ? '' : state.dp[i][j];
    }
  }
  return display;
}

function View({ frame }: PluginViewProps<DSState>) {
  const state = frame.state;
  const display = buildDisplay(state);
  const m = state.s.length;
  const n = state.t.length;
  const ans = state.dp[m][n] >= 0 ? state.dp[m][n] : undefined;
  const cell = (r: number, c: number) =>
    r >= 0 && c >= 0 && state.dp[r]?.[c] >= 0 ? state.dp[r][c] : '—';
  const displayActive: [number, number] | null = state.cur
    ? [state.cur[0] + 1, state.cur[1] + 1]
    : null;
  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'land';
    if (state.cur && state.cur[0] + 1 === r && state.cur[1] + 1 === c) return 'active';
    return state.dp[r - 1][c - 1] >= 0 ? 'visited' : '';
  };
  const rail = (
    <>
      <RailGroup label="inputs">
        <RailStat k="s" v={`"${state.s}"`} />
        <RailStat k="t" v={`"${state.t}"`} />
      </RailGroup>
      <RailGroup label="cell">
        <RailStat
          k="cur"
          v={state.cur ? `[${state.cur[0]}][${state.cur[1]}]` : '—'}
          tone="accent"
        />
        <RailStat k="skip" v={state.cur ? cell(state.cur[0] - 1, state.cur[1]) : '—'} />
        <RailStat k="take" v={state.cur ? cell(state.cur[0] - 1, state.cur[1] - 1) : '—'} />
      </RailGroup>
      <RailResult
        label="ways"
        value={ans !== undefined ? ans : '…'}
        tone={state.done ? 'good' : 'accent'}
      />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <GridBoard grid={display} cellTone={cellTone} active={displayActive} cellSize={36} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DSState>) {
  if (!frame) return <VizEmpty />;
  const state = frame.state;
  const m = state.s.length;
  const n = state.t.length;
  const cell = (r: number, c: number) =>
    r >= 0 && c >= 0 && state.dp[r]?.[c] >= 0 ? state.dp[r][c] : '—';
  const answer = state.dp[m][n] >= 0 ? state.dp[m][n] : '…filling';
  return (
    <VarGrid>
      <InspectorRow k="s (source)" v={`"${state.s}"`} />
      <InspectorRow k="t (target)" v={`"${state.t}"`} />
      <InspectorRow k="cell" v={state.cur ? `dp[${state.cur[0]}][${state.cur[1]}]` : '—'} />
      <InspectorRow k="skip (above)" v={state.cur ? cell(state.cur[0] - 1, state.cur[1]) : '—'} />
      <InspectorRow
        k="take (diagonal)"
        v={state.cur ? cell(state.cur[0] - 1, state.cur[1] - 1) : '—'}
      />
      <InspectorRow k="dp[m][n]" v={answer} />
    </VarGrid>
  );
}

export const manifestId = 'imp-76-distinct-subsequences';
export const title = 'Distinct Subsequences';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'rabbbit-rabbit', label: '"rabbbit" / "rabbit"', value: { s: 'rabbbit', t: 'rabbit' } },
    { id: 'babgbag-bag', label: '"babgbag" / "bag"', value: { s: 'babgbag', t: 'bag' } },
  ] satisfies SampleInput<DSInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const st = frames[frames.length - 1]?.state as DSState | undefined;
    const v = st ? st.dp[st.s.length][st.t.length] : 0;
    return { ok: true, label: `${v} ways` };
  },
};

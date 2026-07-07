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
  InspectorRow,
  RailGroup,
  RailResult,
  RailStat,
  VarGrid,
  VizEmpty,
  VizStage,
} from '../../../_shared/vizKit';

interface OSEInput {
  s1: string;
  s2: string;
}

// Per (i, j) reachability projection: 1 = some explored state here is reachable,
// 0 = explored but all false, -1 = not yet visited.
interface OSEState {
  s1: string;
  s2: string;
  grid: number[][]; // (m+1) x (n+1) over -1 / 0 / 1
  cur: [number, number] | null; // (i, j) being resolved
  diff: number | null; // diff component of the current state
  answer: boolean | null;
  done: boolean;
}

const isDigit = (c: string) => c >= '0' && c <= '9';
const isLower = (c: string) => c >= 'a' && c <= 'z';

function record({ s1, s2 }: OSEInput): Frame<OSEState>[] {
  const m = s1.length;
  const n = s2.length;
  const grid: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(-1));
  const memo = new Map<string, boolean>();
  const { emit, frames } = createRecorder<OSEState>(() => ({
    s1: s1,
    s2: s2,
    grid: grid.map((r) => r.slice()),
    cur: null,
    diff: null,
    answer: null,
    done: false,
  }));

  emit(
    'INIT',
    `"${s1}" ?= "${s2}"`,
    `Check if An Original String Exists: could "${s1}" and "${s2}" both be run-length encodings of one original string? A memoized search tracks state (i, j, diff): position i in "${s1}", position j in "${s2}", and diff = how many more raw letters "${s1}" has consumed than "${s2}". Each cell below marks whether some state at (i, j) is reachable to a solution.`,
    { cur: null, diff: null, answer: null },
  );

  const bt = (i: number, j: number, diff: number): boolean => {
    if (i === m && j === n) {
      const ok = diff === 0;
      if (grid[i]![j] !== 1) grid[i]![j] = ok ? 1 : 0;
      emit(
        ok ? 'GOAL' : 'STATE',
        `(${i},${j},${diff})`,
        ok
          ? `Reached the end of both strings with diff = 0 — the lengths reconcile, so this branch succeeds.`
          : `Reached the end of both strings but diff = ${diff} != 0, so this branch fails.`,
        { cur: [i, j], diff: diff, answer: null },
      );
      return ok;
    }
    const key = `${i},${j},${diff}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      emit(
        'MEMO',
        `(${i},${j},${diff})`,
        `State (${i}, ${j}, diff=${diff}) was already resolved to ${cached} — reuse the memo, no recompute.`,
        { cur: [i, j], diff: diff, answer: null },
      );
      return cached;
    }

    let res = false;
    if (i < m && isDigit(s1[i]!)) {
      let num = 0;
      for (let p = i; p < m && isDigit(s1[p]!); p++) {
        num = num * 10 + (s1.charCodeAt(p) - 48);
        if (bt(p + 1, j, diff + num)) {
          res = true;
          break;
        }
      }
    } else if (j < n && isDigit(s2[j]!)) {
      let num = 0;
      for (let p = j; p < n && isDigit(s2[p]!); p++) {
        num = num * 10 + (s2.charCodeAt(p) - 48);
        if (bt(i, p + 1, diff - num)) {
          res = true;
          break;
        }
      }
    } else if (diff > 0 && j < n) {
      if (isLower(s2[j]!)) res = bt(i, j + 1, diff - 1);
    } else if (diff < 0 && i < m) {
      if (isLower(s1[i]!)) res = bt(i + 1, j, diff + 1);
    } else if (diff === 0 && i < m && j < n) {
      if (isLower(s1[i]!) && isLower(s2[j]!)) res = s1[i] === s2[j] && bt(i + 1, j + 1, 0);
    }

    memo.set(key, res);
    if (res) grid[i]![j] = 1;
    else if (grid[i]![j] !== 1) grid[i]![j] = 0;

    const reason =
      i < m && isDigit(s1[i]!)
        ? `"${s1}" has a digit run at index ${i}; try expanding it into letter counts.`
        : j < n && isDigit(s2[j]!)
          ? `"${s2}" has a digit run at index ${j}; try expanding it into letter counts.`
          : diff > 0
            ? `diff = ${diff} > 0: "${s1}" is ahead, so consume a letter of "${s2}" at index ${j} to shrink diff.`
            : diff < 0
              ? `diff = ${diff} < 0: "${s2}" is ahead, so consume a letter of "${s1}" at index ${i} to grow diff.`
              : `diff = 0: both sides must consume a matching literal letter here.`;
    emit(
      'STATE',
      `(${i},${j},${diff})=${res}`,
      `State (${i}, ${j}, diff=${diff}) resolves to ${res}. ${reason}`,
      { cur: [i, j], diff: diff, answer: null },
    );
    return res;
  };

  const answer = bt(0, 0, 0);
  emit(
    'DONE',
    answer ? 'true' : 'false',
    answer
      ? `The root state (0, 0, 0) is reachable: "${s1}" and "${s2}" can encode the same original string. Answer: true.`
      : `The root state (0, 0, 0) has no reachable solution: "${s1}" and "${s2}" cannot encode the same original string. Answer: false.`,
    { cur: [0, 0], diff: 0, answer: answer, done: true },
  );
  return frames;
}

function buildDisplay(s: OSEState): (number | string)[][] {
  const m = s.s1.length;
  const n = s.s2.length;
  const display: (number | string)[][] = Array.from({ length: m + 2 }, () =>
    new Array<number | string>(n + 2).fill(''),
  );
  display[0]![1] = 'ε';
  for (let j = 0; j < n; j++) display[0]![j + 2]! = s.s2[j]!;
  display[1]![0] = 'ε';
  for (let i = 0; i < m; i++) display[i + 2]![0]! = s.s1[i]!;
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      const v = s.grid[i]![j];
      display[i + 1]![j + 1] = v === 1 ? '✓' : v === 0 ? '✗' : '';
    }
  }
  return display;
}

function View({ frame }: PluginViewProps<OSEState>) {
  const s = frame.state;
  const display = buildDisplay(s);
  const displayActive: [number, number] | null = s.cur ? [s.cur[0] + 1, s.cur[1] + 1] : null;
  const cellTone = (r: number, c: number) => {
    if (r === 0 || c === 0) return 'land';
    if (s.cur && s.cur[0] + 1 === r && s.cur[1] + 1 === c) return 'active';
    const v = s.grid[r - 1]![c - 1];
    if (v === 1) return 'path';
    if (v === 0) return 'visited';
    return '';
  };
  const ansDone = s.answer !== null;
  const ans = ansDone ? (s.answer ? 'true' : 'false') : '—';
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="state">
            <RailStat k="i" v={s.cur ? s.cur[0] : '—'} />
            <RailStat k="j" v={s.cur ? s.cur[1] : '—'} />
            <RailStat k="diff" v={s.diff ?? '—'} tone="accent" />
          </RailGroup>
          {ansDone && <RailResult label="answer" value={ans} tone={s.answer ? 'good' : 'bad'} />}
        </>
      }
    >
      <GridBoard grid={display} cellTone={cellTone} active={displayActive} cellSize={34} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<OSEState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const ans = s.answer === null ? '…searching' : s.answer ? 'true' : 'false';
  return (
    <VarGrid>
      <InspectorRow k="s1" v={`"${s.s1}"`} />
      <InspectorRow k="s2" v={`"${s.s2}"`} />
      <InspectorRow k="state (i,j)" v={s.cur ? `(${s.cur[0]}, ${s.cur[1]})` : '—'} />
      <InspectorRow k="diff" v={s.diff ?? '—'} />
      <InspectorRow k="answer" v={ans} />
    </VarGrid>
  );
}

export const manifestId = 'imp-57-check-if-an-original-string-exists-given-two-enc';
export const title = 'Check if An Original String Exists Given Two Encoded Strings';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'l2t-leet', label: '"l2t" ?= "leet" (true)', value: { s1: 'l2t', s2: 'leet' } },
    { id: 'ab-a2', label: '"ab" ?= "a2" (false)', value: { s1: 'ab', s2: 'a2' } },
  ] satisfies SampleInput<OSEInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as OSEState | undefined;
    const ok = s?.answer === true;
    return { ok, label: ok ? 'true' : 'false' };
  },
};

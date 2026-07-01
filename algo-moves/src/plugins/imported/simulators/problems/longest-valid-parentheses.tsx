import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface LVPInput {
  s: string;
}

interface LVPState {
  s: string;
  dp: number[]; // -1 = not yet filled; dp[i] = longest valid substring ending at i
  i: number | null;
  from: number | null; // the index the recurrence pulls dp from (or null)
  best: number; // running max so far
  done: boolean;
}

function record({ s }: LVPInput): Frame<LVPState>[] {
  const n = s.length;
  const dp = new Array<number>(n).fill(-1);
  const frames: Frame<LVPState>[] = [];
  let best = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    i: number | null,
    from: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { s, dp: dp.slice(), i, from, best, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `s="${s}"`,
    `Longest Valid Parentheses: find the longest run of well-matched brackets in "${s}". dp[i] = the length of the longest valid substring that ENDS at index i, built left to right. dp[i] = 0 whenever s[i] is '('.`,
    null,
    null,
  );

  for (let i = 0; i < n; i++) {
    if (s[i] === '(') {
      dp[i] = 0;
      emit('OPEN', `dp[${i}]=0`, `s[${i}] is '(' — no valid substring can end on an open bracket, so dp[${i}] = 0.`, i, null);
      continue;
    }
    // s[i] === ')'
    if (i >= 1 && s[i - 1] === '(') {
      const prior = i >= 2 ? dp[i - 2] : 0;
      dp[i] = prior + 2;
      best = Math.max(best, dp[i]);
      emit(
        'PAIR',
        `dp[${i}]=${dp[i]}`,
        `s[${i}]=')' closes the '(' right before it at ${i - 1}. That pair adds 2 on top of dp[${i - 2}] (=${prior}), so dp[${i}] = ${prior} + 2 = ${dp[i]}.`,
        i,
        i >= 2 ? i - 2 : null,
      );
    } else {
      const j = i - dp[i - 1] - 1; // index that would hold the matching '('
      if (i >= 1 && dp[i - 1] > 0 && j >= 0 && s[j] === '(') {
        const inner = dp[i - 1];
        const outer = j >= 1 ? dp[j - 1] : 0;
        dp[i] = inner + 2 + outer;
        best = Math.max(best, dp[i]);
        emit(
          'NEST',
          `dp[${i}]=${dp[i]}`,
          `s[${i}]=')' wraps the valid block of length dp[${i - 1}]=${inner}, and the char at ${j} is its matching '('. Add that 2, plus whatever valid run sat before it (dp[${j - 1}]=${outer}): dp[${i}] = ${inner} + 2 + ${outer} = ${dp[i]}.`,
          i,
          i - 1,
        );
      } else {
        dp[i] = 0;
        emit('UNMATCHED', `dp[${i}]=0`, `s[${i}]=')' has no matching '(' to close, so no valid substring ends here: dp[${i}] = 0.`, i, null);
      }
    }
  }

  emit(
    'DONE',
    `${best}`,
    n === 0
      ? `The string is empty, so the longest valid parentheses substring has length 0.`
      : `The table is complete. The largest value in dp is ${best}, so the longest valid parentheses substring of "${s}" has length ${best}.`,
    null,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LVPState>) {
  const s = frame.state;
  const cells = s.dp.map((v, i) => (v < 0 ? s.s[i] : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: `i='${s.s[s.i]}'`, tone: 'accent', place: 'above' });
  if (s.from !== null) pointers.push({ i: s.from, label: 'pulls', tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.i === i ? 'found' : s.dp[i] > 0 ? 'match' : '');
  const dpI = s.i !== null && s.dp[s.i] >= 0 ? s.dp[s.i] : '—';
  const dpFrom = s.from !== null && s.dp[s.from] >= 0 ? s.dp[s.from] : '—';
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="i" v={s.i !== null ? `${s.i} ('${s.s[s.i]}')` : '—'} tone={s.i !== null ? 'accent' : undefined} />
        <RailStat k="dp[i]" v={dpI} />
        <RailStat k="pulls" v={dpFrom} tone={s.from !== null ? 'warn' : undefined} />
      </RailGroup>
      <RailResult label="best" value={s.done ? s.best : s.best > 0 ? s.best : '…'} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} label={(i) => s.s[i]} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LVPState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (i: number) => (i >= 0 && i < s.dp.length && s.dp[i] >= 0 ? s.dp[i] : '—');
  return (
    <VarGrid>
      <InspectorRow k="s" v={`"${s.s}"`} />
      <InspectorRow k="i" v={s.i !== null ? `${s.i} ('${s.s[s.i]}')` : '—'} />
      <InspectorRow k="dp[i]" v={s.i !== null ? cell(s.i) : '—'} />
      <InspectorRow k="pulls dp[..]" v={s.from !== null ? cell(s.from) : '—'} />
      <InspectorRow k="best so far" v={s.best} />
      <InspectorRow k="answer" v={s.done ? s.best : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-69-longest-valid-parentheses';
export const title = 'Longest Valid Parentheses';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'oop', label: 's = "(()"', value: { s: '(()' } },
    { id: 'closes', label: 's = ")()())"', value: { s: ')()())' } },
  ] satisfies SampleInput<LVPInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as LVPState) ?? null;
    const v = s ? s.best : 0;
    return { ok: true, label: `length ${v}` };
  },
};

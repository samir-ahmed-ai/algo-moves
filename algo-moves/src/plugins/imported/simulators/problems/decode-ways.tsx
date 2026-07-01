import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface DecodeInput {
  s: string;
}

interface DecodeState {
  s: string;
  dp: number[]; // dp[i] = ways to decode the first i chars; -1 = not filled yet
  i: number | null; // current dp index being filled
  one: number | null; // dp index used by the single-digit transition (i-1)
  two: number | null; // dp index used by the two-digit transition (i-2)
  done: boolean;
}

const EMPTY = -1;

function record({ s }: DecodeInput): Frame<DecodeState>[] {
  const n = s.length;
  const dp = new Array<number>(n + 1).fill(EMPTY);
  const frames: Frame<DecodeState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    i: number | null,
    one: number | null,
    two: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { s, dp: dp.slice(), i, one, two, done: type === 'DONE' },
    });

  emit(
    'INIT',
    `s="${s}"`,
    `Decode Ways: 'A'..'Z' map to "1".."26", so we count how many ways the digit string "${s}" decodes. dp[i] = number of ways to decode the first i characters, built up from i = 0.`,
    null,
    null,
    null,
  );

  // Empty string decodes one way (the empty decoding).
  dp[0] = 1;
  emit('BASE', 'dp[0]=1', `Base case: the empty prefix decodes exactly one way (decode nothing). dp[0] = 1.`, 0, null, null);

  // A leading '0' kills everything: no letter maps to 0.
  if (n === 0 || s[0] === '0') {
    dp.fill(0, 1);
    emit(
      'DONE',
      '0 ways',
      `The string starts with '0', and no letter maps to "0", so "${s}" cannot be decoded at all. The answer is 0.`,
      null,
      null,
      null,
      'bad',
    );
    return frames;
  }

  dp[1] = 1;
  emit(
    'BASE',
    'dp[1]=1',
    `The first character s[0]='${s[0]}' is not '0', so the single character decodes one way. dp[1] = 1.`,
    1,
    null,
    null,
  );

  for (let i = 2; i <= n; i++) {
    const cur = s[i - 1];
    const prevCh = s[i - 2];
    let ways = 0;
    const parts: string[] = [];

    // Single-digit transition: s[i-1] forms a valid 1..9 letter on its own.
    if (cur !== '0') {
      ways += dp[i - 1];
      parts.push(`take '${cur}' alone → dp[${i - 1}] (=${dp[i - 1]})`);
    }

    // Two-digit transition: s[i-2..i-1] forms 10..26.
    const two = Number(prevCh) * 10 + Number(cur);
    if (two >= 10 && two <= 26) {
      ways += dp[i - 2];
      parts.push(`pair "${prevCh}${cur}" (=${two}) → dp[${i - 2}] (=${dp[i - 2]})`);
    }

    dp[i] = ways;
    const reason =
      parts.length === 0
        ? `Neither '${cur}' alone (it's '0') nor the pair "${prevCh}${cur}" (=${two}) is a valid letter, so dp[${i}] = 0 — this prefix is undecodable.`
        : `For the first ${i} chars we can ${parts.join(' and ')}, summing to dp[${i}] = ${ways}.`;
    emit(
      ways === 0 ? 'DEAD' : 'FILL',
      `dp[${i}]=${ways}`,
      reason,
      i,
      cur !== '0' ? i - 1 : null,
      two >= 10 && two <= 26 ? i - 2 : null,
    );
  }

  const answer = dp[n];
  emit(
    'DONE',
    `${answer} ways`,
    `The table is full. dp[${n}] = ${answer}, so "${s}" decodes in ${answer} way${answer === 1 ? '' : 's'}.`,
    n,
    null,
    null,
    answer > 0 ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<DecodeState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v === EMPTY ? '·' : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.one !== null) pointers.push({ i: s.one, label: 'i−1', tone: 'good', place: 'below' });
  if (s.two !== null) pointers.push({ i: s.two, label: 'i−2', tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.i === i ? 'found' : s.dp[i] !== EMPTY ? 'match' : '');
  const cell = (i: number | null) =>
    i !== null && i >= 0 && i < s.dp.length ? (s.dp[i] === EMPTY ? '·' : s.dp[i]) : '—';
  const known = s.dp[s.s.length] !== EMPTY;
  const ans = known ? s.dp[s.s.length] : null;
  const done = s.done;
  return (
    <VizStage rail={<>
      <RailGroup label="scan">
        <RailStat k="i" v={s.i ?? '—'} tone="accent" />
        <RailStat k="dp[i−1]" v={cell(s.one)} tone="good" />
        <RailStat k="dp[i−2]" v={cell(s.two)} tone="warn" />
        <RailStat k="dp[i]" v={cell(s.i)} />
      </RailGroup>
      {known && <RailResult label="answer" value={`${ans} ways`} tone={done ? (ans as number) > 0 ? 'good' : 'bad' : 'accent'} />}
    </>}>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DecodeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (i: number | null) =>
    i !== null && i >= 0 && i < s.dp.length ? (s.dp[i] === EMPTY ? '·' : s.dp[i]) : '—';
  const known = s.dp[s.s.length] !== EMPTY;
  return (
    <VarGrid>
      <InspectorRow k="string" v={`"${s.s}"`} />
      <InspectorRow k="i (chars)" v={s.i ?? '—'} />
      <InspectorRow k="dp[i−1] (single)" v={cell(s.one)} />
      <InspectorRow k="dp[i−2] (pair)" v={cell(s.two)} />
      <InspectorRow k="dp[i]" v={cell(s.i)} />
      <InspectorRow k="answer" v={known ? `${s.dp[s.s.length]} ways` : '…filling'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-78-decode-ways';
export const title = 'Decode Ways';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'd226', label: 's = "226"', value: { s: '226' } },
    { id: 'd12', label: 's = "12"', value: { s: '12' } },
  ] satisfies SampleInput<DecodeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as DecodeState) ?? null;
    const v = s ? s.dp[s.s.length] : 0;
    return v > 0 ? { ok: true, label: `${v} ways` } : { ok: false, label: '0 ways' };
  },
};

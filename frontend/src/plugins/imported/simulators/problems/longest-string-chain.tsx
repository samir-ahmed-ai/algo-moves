import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
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

interface ChainInput {
  words: string[];
}

interface ChainState {
  sorted: string[]; // words sorted by length (the index order of dp)
  dp: number[]; // 0 = not yet filled, aligned to `sorted`
  i: number | null; // index in `sorted` currently being decided
  from: number | null; // index in `sorted` of the winning predecessor, or null
  pred: string | null; // the predecessor word that won, or null
  best: number; // running answer = max(dp)
  done: boolean;
}

function record({ words }: ChainInput): Frame<ChainState>[] {
  const sorted = words.slice().sort((a, b) => a.length - b.length);
  const n = sorted.length;
  const indexOf = new Map<string, number>();
  sorted.forEach((w, k) => indexOf.set(w, k));

  const dp = new Array<number>(n).fill(0);
  const { emit, frames } = createRecorder<ChainState>(() => ({
    sorted: sorted,
    dp: dp.slice(),
    i: null,
    from: null,
    pred: null,
    best: 0,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Longest String Chain. Sort the words by length → [${sorted.join(', ')}]. dp[w] = the longest chain ending at word w, built by deleting one character to find a shorter predecessor already seen.`,
    { i: null, from: null, pred: null, best: 0 },
  );

  let best = 0;
  for (let i = 0; i < n; i++) {
    const w = sorted[i];
    let cur = 1; // a word alone is a chain of length 1
    let from: number | null = null;
    let pred: string | null = null;
    for (let c = 0; c < w!.length; c++) {
      const p = w!.slice(0, c) + w!.slice(c + 1);
      const pi = indexOf.get(p);
      if (pi !== undefined && pi < i && dp[pi]! + 1 > cur) {
        cur = dp[pi]! + 1;
        from = pi;
        pred = p;
      }
    }
    dp[i] = cur;
    if (cur > best) best = cur;

    const caption =
      pred === null
        ? `"${w}": deleting one character never yields an earlier word, so it starts a new chain — dp["${w}"] = 1.`
        : `"${w}": delete one character to reach "${pred}" (dp = ${dp[from as number]}), the best predecessor, so dp["${w}"] = ${dp[from as number]} + 1 = ${cur}.`;
    emit('FILL', `dp["${w}"]=${cur}`, caption, { i: i, from: from, pred: pred, best: best });
  }

  emit(
    'DONE',
    `chain = ${best}`,
    `Every word is processed. The answer is max(dp) = ${best}, the length of the longest string chain.`,
    { i: null, from: null, pred: null, best: best, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ChainState>) {
  const s = frame.state;
  const cells = s.dp.map((v) => (v === 0 ? '·' : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null)
    pointers.push({ i: s.i, label: `w "${s.sorted[s.i]}"`, tone: 'accent', place: 'above' });
  if (s.from !== null)
    pointers.push({ i: s.from, label: `pred "${s.pred}"`, tone: 'warn', place: 'below' });
  const tone = (i: number) => (s.i === i ? 'found' : s.dp[i] !== 0 ? 'match' : '');
  const cell = (i: number | null) => (i !== null && s.dp[i] !== 0 ? s.dp[i] : '—');
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat
          k="w"
          v={s.i !== null ? `"${s.sorted[s.i]}"` : '—'}
          tone={s.i !== null ? 'accent' : undefined}
        />
        <RailStat k="pred" v={s.pred !== null ? `"${s.pred}"` : '—'} />
        <RailStat k="dp[pred]" v={cell(s.from)} />
        <RailStat k="dp[w]" v={cell(s.i)} />
      </RailGroup>
      <RailResult label="best" value={s.best} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow
        values={cells}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={(i) => s.sorted[i]}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ChainState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cell = (i: number | null) => (i !== null && s.dp[i] !== 0 ? s.dp[i] : '—');
  return (
    <VarGrid>
      <InspectorRow k="word w" v={s.i !== null ? `"${s.sorted[s.i]}"` : '—'} />
      <InspectorRow k="predecessor" v={s.pred !== null ? `"${s.pred}"` : '—'} />
      <InspectorRow k="dp[predecessor]" v={cell(s.from)} />
      <InspectorRow k="dp[w]" v={cell(s.i)} />
      <InspectorRow k="best so far" v={s.best} />
    </VarGrid>
  );
}

export const manifestId = 'imp-68-longest-string-chain';
export const title = 'Longest String Chain';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'lsc6',
      label: '["a","b","ba","bca","bda","bdca"]',
      value: { words: ['a', 'b', 'ba', 'bca', 'bda', 'bdca'] },
    },
    {
      id: 'lsc5',
      label: '["xbc","pcxbcf","xb","cxbc","pcxbc"]',
      value: { words: ['xbc', 'pcxbcf', 'xb', 'cxbc', 'pcxbc'] },
    },
  ] satisfies SampleInput<ChainInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = (frames[frames.length - 1]?.state as ChainState) ?? null;
    const v = s ? s.best : 0;
    return { ok: true, label: `chain = ${v}` };
  },
};

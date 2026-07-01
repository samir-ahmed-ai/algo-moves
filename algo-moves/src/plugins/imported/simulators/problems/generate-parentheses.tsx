import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, PathDisplay } from '../../../_shared/vizKit';

interface ParenInput {
  n: number;
}

interface ParenState {
  n: number;
  path: string; // current partial string of parentheses
  open: number; // count of '(' placed
  close: number; // count of ')' placed
  results: string[];
  done: boolean;
}

function record({ n }: ParenInput): Frame<ParenState>[] {  const results: string[] = [];

  const { emit, frames } = createRecorder<ParenState>(() => ({
        n: n,
        results: results.slice(),
        path: '',
        open: 0,
        close: 0,
        done: false
      }));

  emit('INIT', `n=${n}`, `Build every valid string of ${n} pairs of parentheses. Two choices at each step: add '(' while open < ${n}, or add ')' while close < open (closing only what is already open keeps the string valid). There are C(${n}) = Catalan(${n}) results.`, { path: '', open: 0, close: 0 });

  const bt = (path: string, open: number, close: number) => {
    if (path.length === 2 * n) {
      results.push(path);
      emit('RECORD', `+"${path}"`, `Length reached ${2 * n} with open=close=${n} — record the valid string "${path}" (${results.length} so far).`, { path: path, open: open, close: close }, 'good');
      return;
    }
    if (open < n) {
      emit('OPEN', `add '('`, `open=${open} < ${n}, so we may add '('. Now open=${open + 1}, close=${close}. path = "${path}(".`, { path: path + '(', open: open + 1, close: close });
      bt(path + '(', open + 1, close);
    }
    if (close < open) {
      emit('CLOSE', `add ')'`, `close=${close} < open=${open}, so we may add ')' to match an open bracket. Now open=${open}, close=${close + 1}. path = "${path})".`, { path: path + ')', open: open, close: close + 1 });
      bt(path + ')', open, close + 1);
    }
  };

  bt('', 0, 0);
  emit('DONE', `${results.length} strings`, `All branches explored — ${results.length} valid parenthesizations of ${n} pairs.`, { path: '', open: 0, close: 0 , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<ParenState>) {
  const s = frame.state;
  return (
    <VizStage rail={<>
      <RailStack label="results" items={s.results} highlightEnd="bottom" topLabel="latest" />
      <RailGroup label="counters">
        <RailStat k="open" v={s.open} tone="accent" />
        <RailStat k="close" v={s.close} />
        <RailStat k="n" v={s.n} />
      </RailGroup>
      {s.done && <RailResult label="found" value={s.results.length} tone="good" />}
    </>}>
      <PathDisplay value={s.path || '·'} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ParenState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const catalan = (m: number) => {
    let r = 1;
    for (let i = 0; i < m; i++) r = (r * 2 * (2 * i + 1)) / (i + 2);
    return Math.round(r);
  };
  return (
    <VarGrid>
      <InspectorRow k="n (pairs)" v={s.n} />
      <InspectorRow k="path" v={`"${s.path}"`} />
      <InspectorRow k="open / close" v={`${s.open} / ${s.close}`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target C(n)" v={catalan(s.n)} />
    </VarGrid>
  );
}

export const manifestId = 'imp-34-generate-parentheses';
export const title = 'Generate Parentheses';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'n3', label: 'n = 3', value: { n: 3 } },
    { id: 'n2', label: 'n = 2', value: { n: 2 } },
  ] satisfies SampleInput<ParenInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ParenState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} strings` };
  },
};

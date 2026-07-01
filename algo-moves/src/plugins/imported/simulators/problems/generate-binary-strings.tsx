import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, PathDisplay } from '../../../_shared/vizKit';

interface BinInput {
  n: number;
}

interface BinState {
  n: number;
  path: string; // current partial binary string
  results: string[];
  done: boolean;
}

function record({ n }: BinInput): Frame<BinState>[] {  const results: string[] = [];

  const { emit, frames } = createRecorder<BinState>(() => ({
        n: n,
        results: results.slice(),
        path: '',
        done: false
      }));

  emit('INIT', `n=${n}`, `Generate every binary string of length ${n}. At each position there are no constraints — branch on '0' first, then '1', and record once the string reaches length ${n}. There are 2^${n} = ${2 ** n} strings.`, { path: '' });

  const bt = (path: string) => {
    if (path.length === n) {
      results.push(path);
      emit('RECORD', `+"${path}"`, `Length reached ${n} — record the binary string "${path}" (${results.length} so far).`, { path: path }, 'good');
      return;
    }
    emit('ZERO', `add '0'`, `Position ${path.length}: append '0' first and recurse. path = "${path}0".`, { path: path + '0' });
    bt(path + '0');
    emit('ONE', `add '1'`, `Position ${path.length}: now append '1' and recurse. path = "${path}1".`, { path: path + '1' });
    bt(path + '1');
  };

  bt('');
  emit('DONE', `${results.length} strings`, `All branches explored — ${results.length} binary strings of length ${n}.`, { path: '' , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<BinState>) {
  const s = frame.state;
  return (
    <VizStage rail={<>
      <RailStack label="found" items={s.results} />
      <RailGroup label="path">
        <RailStat k="bits" v={`${s.path.length} / ${s.n}`} />
      </RailGroup>
      {s.done && <RailResult label="total" value={s.results.length} tone="good" />}
    </>}>
      <PathDisplay value={s.path || '·'} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<BinState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="length n" v={s.n} />
      <InspectorRow k="path" v={`"${s.path}"`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target 2^n" v={2 ** s.n} />
    </VarGrid>
  );
}

export const manifestId = 'imp-32-generate-binary-strings';
export const title = 'Generate Binary Strings';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'n3', label: 'n = 3', value: { n: 3 } },
    { id: 'n2', label: 'n = 2', value: { n: 2 } },
  ] satisfies SampleInput<BinInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BinState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} strings` };
  },
};

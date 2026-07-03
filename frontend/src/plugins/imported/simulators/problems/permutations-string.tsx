import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, RailGroup, RailResult, RailStack, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';

interface StrPermInput {
  s: string;
}

interface StrPermState {
  chars: string[];
  low: number;
  high: number;
  swap: [number, number] | null;
  results: string[];
  done: boolean;
}

function record({ s }: StrPermInput): Frame<StrPermState>[] {
  const chars = s.split('');  const results: string[] = [];

  const { emit, frames } = createRecorder<StrPermState>(() => ({
        chars: chars.slice(),
        results: results.slice(),
        swap: null,
        low: 0,
        high: 0,
        done: false
      }));

  emit('INIT', `s="${s}"`, `Swap-backtracking on "${s}": fix position low, swap each candidate into place, recurse, then swap back.`, { swap: null, low: 0, high: chars.length - 1 });

  const bt = (low: number, high: number) => {
    if (low === high) {
      const perm = chars.join('');
      results.push(perm);
      emit('RECORD', perm, `low == high — record permutation "${perm}" (${results.length} total).`, { swap: null, low: low, high: high }, 'good');
      return;
    }
    for (let i = low; i <= high; i++) {
      [chars[low], chars[i]] = [chars[i], chars[low]];
      emit('SWAP', `swap ${low}↔${i}`, `Swap chars[${low}] and chars[${i}] to try '${chars[low]}' at position ${low}.`, { swap: [low, i], low: low, high: high });
      bt(low + 1, high);
      [chars[low], chars[i]] = [chars[i], chars[low]];
      emit('UNDO', `undo ${low}↔${i}`, `Swap back to restore the slice before trying the next candidate at position ${low}.`, { swap: [low, i], low: low, high: high });
    }
  };

  bt(0, chars.length - 1);
  emit('DONE', `${results.length} perms`, `All ${results.length} permutations of "${s}" collected.`, { swap: null, low: 0, high: chars.length - 1 , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<StrPermState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.swap) {
    pointers.push({ i: s.swap[0], label: 'a', tone: 'warn', place: 'above' });
    pointers.push({ i: s.swap[1], label: 'b', tone: 'accent', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.swap && (s.swap[0] === i || s.swap[1] === i)) return 'mid';
    if (i >= s.low && i <= s.high) return 'match';
    return 'sorted';
  };
  const rail = (
    <>
      <RailGroup label="window">
        <RailStat k="lo" v={s.low} />
        <RailStat k="hi" v={s.high} />
      </RailGroup>
      <RailStack label="results" items={s.results} />
      {s.done && <RailResult label="found" value={s.results.length} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<StrPermState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="string" v={s.chars.join('')} />
      <InspectorRow k="low" v={s.low} />
      <InspectorRow k="high" v={s.high} />
      <InspectorRow k="found" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'imp-43-permutations';
export const title = 'Permutations (string)';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'abc', label: 's="abc"', value: { s: 'abc' } },
    { id: 'ab', label: 's="ab"', value: { s: 'ab' } },
  ] satisfies SampleInput<StrPermInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const st = frames[frames.length - 1]?.state as StrPermState | undefined;
    return { ok: true, label: `${st ? st.results.length : 0} perms` };
  },
};

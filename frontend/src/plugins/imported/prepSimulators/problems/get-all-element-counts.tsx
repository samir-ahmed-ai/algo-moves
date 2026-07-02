import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CountsInput {
  a: number[];
}

interface CountsState {
  a: number[];
  i: number | null; // current index being tallied
  x: number | null; // value at index i
  counts: [number, number][]; // value -> running count entries
  bumped: number | null; // value whose count we just incremented
  done: boolean;
}

function record({ a }: CountsInput): Frame<CountsState>[] {  const counts = new Map<number, number>();

  const { emit, frames } = createRecorder<CountsState>(() => ({
        a,
        i: null,
        x: null,
        counts: [...counts.entries()],
        bumped: null,
        done: false
      }));

  emit(
    'INIT',
    `n=${a.length}`,
    `Get all element counts: walk the array once and tally every value into a hash map. counts[x]++ builds a frequency map of how many times each value appears. Time O(n), Space O(n).`,
    {},
  );

  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const before = counts.get(x) ?? 0;
    emit(
      'SCAN',
      `x=${x}`,
      `At index ${i} the value is ${x}. Its current count is ${before}${before === 0 ? ' (not seen yet, so it starts at 0)' : ''}. Increment it: counts[${x}]++.`,
      { i, x },
    );
    counts.set(x, before + 1);
    emit(
      'BUMP',
      `counts[${x}]=${before + 1}`,
      `counts[${x}] is now ${before + 1}. The map remembers every distinct value and how often it has appeared so far.`,
      { i, x, bumped: x },
    );
  }

  const distinct = counts.size;
  emit(
    'DONE',
    `${distinct} keys`,
    `The whole array is tallied. The frequency map holds ${distinct} distinct value${distinct === 1 ? '' : 's'} with their counts — that is the answer.`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<CountsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : s.i !== null && i < s.i ? 'dead' : '');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.x !== null && !s.done ? (
          <>
            current value x = <span className="font-mono text-ink">{s.x}</span>
          </>
        ) : (
          <>frequency map (counts[x]++)</>
        )}
      </div>
      <ArrayRow values={s.a} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        counts {'{'}
        {s.counts
          .map(([v, c]) => `${v}:${c}`)
          .join(', ')}
        {'}'}
      </div>
      {s.bumped !== null && !s.done && (
        <div className={cn('mt-1 font-mono text-accent', vizText.sm)}>
          counts[{s.bumped}] = {s.counts.find(([v]) => v === s.bumped)?.[1] ?? 0}
        </div>
      )}
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.counts.length} distinct keys</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CountsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (length)" v={s.a.length} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="a[i] (x)" v={s.x ?? '—'} />
      <InspectorRow k="distinct keys" v={s.counts.length} />
      <InspectorRow
        k="counts[x]"
        v={s.x !== null ? (s.counts.find(([v]) => v === s.x)?.[1] ?? 0) : '—'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-get-all-element-counts';
export const title = 'Get all element counts';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'gec1', label: '[1,2,2,3,3,3]', value: { a: [1, 2, 2, 3, 3, 3] } },
    { id: 'gec2', label: '[5,5,1,5,2,1]', value: { a: [5, 5, 1, 5, 2, 1] } },
  ] satisfies SampleInput<CountsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CountsState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const label = `{${s.counts.map(([v, c]) => `${v}:${c}`).join(', ')}}`;
    return { ok: true, label };
  },
};

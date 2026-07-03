import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailStack, RailResult } from '../../../_shared/vizKit';
import { minHeapPop, minHeapPush } from '../../../_shared/dualHeapBoard';

interface KthStreamInput {
  k: number;
  init: number[];
  stream: number[];
}

interface KthStreamState {
  k: number;
  heap: number[];
  added: number | null;
  popped: number | null;
  kth: number | null;
  answers: number[];
  done: boolean;
}

function record({ k, init, stream }: KthStreamInput): Frame<KthStreamState>[] {
  let heap: number[] = [];
  const answers: number[] = [];
  const heapDisplay = () => [...heap].sort((a, b) => a - b);

  const { emit, frames } = createRecorder<KthStreamState>(() => ({
    k,
    heap: heapDisplay(),
    added: null,
    popped: null,
    kth: null,
    answers: answers.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `Kth largest in stream: maintain a min-heap of size k holding the k largest values seen. The root (smallest of those k) is the kth largest.`,
    {},
  );

  for (const v of init) {
    heap = minHeapPush(heap, v);
    emit('PUSH', `push ${v}`, `Bootstrap: push ${v} into the min-heap.`, { added: v, heap: heapDisplay() });
    if (heap.length > k) {
      let popped: number;
      [heap, popped] = minHeapPop(heap);
      emit(
        'TRIM',
        `popMin ${popped}`,
        `Heap size ${heap.length + 1} > k=${k} — popMin removes ${popped} (too small to be in top k).`,
        { added: v, popped, heap: heapDisplay() },
      );
    }
  }

  for (const v of stream) {
    heap = minHeapPush(heap, v);
    emit('ADD', `push ${v}`, `Stream add ${v}: push into min-heap.`, { added: v, heap: heapDisplay() });
    let popped: number | null = null;
    if (heap.length > k) {
      [heap, popped] = minHeapPop(heap);
      emit(
        'TRIM',
        `popMin ${popped}`,
        `Size > k — popMin ${popped}. Heap now holds the ${k} largest values.`,
        { added: v, popped, heap: heapDisplay() },
      );
    }
    const kth = heap[0];
    answers.push(kth);
    emit(
      'KTH',
      `kth=${kth}`,
      `Return heap[0] = ${kth} — the kth largest after adding ${v}.`,
      { added: v, popped, kth, answers: answers.slice(), heap: heapDisplay() },
      'good',
    );
  }

  emit(
    'DONE',
    answers.length ? `last=${answers[answers.length - 1]}` : 'empty',
    `Stream complete. Kth-largest answers: [${answers.join(', ')}].`,
    { kth: answers[answers.length - 1] ?? null, answers: answers.slice(), done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<KthStreamState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="k" v={s.k} />
        <RailStat k="added" v={s.added ?? '—'} tone={s.added !== null ? 'accent' : undefined} />
        <RailStat k="popped" v={s.popped ?? '—'} tone={s.popped !== null ? 'bad' : undefined} />
      </RailGroup>
      <RailStack label="answers" items={s.answers.map(String)} />
      {(s.kth !== null || s.done) && (
        <RailResult label="kth largest" value={s.kth ?? '—'} tone={s.done ? 'good' : 'accent'} />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow
        values={s.heap.length ? s.heap.map(String) : ['—']}
        cellTone={(i) => (i === 0 ? 'match' : 'found')}
        pointers={s.heap.length ? [{ i: 0, label: 'root', tone: 'accent', place: 'above' }] : []}
        windowRange={null}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<KthStreamState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="heap size" v={s.heap.length} />
      <InspectorRow k="heap root" v={s.heap[0] ?? '—'} />
      <InspectorRow k="added" v={s.added ?? '—'} />
      <InspectorRow k="kth" v={s.kth ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-find-kth-largest-in-stream';
export const title = 'Find Kth largest in stream';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'kts1', label: 'k=3, init=[4,5], stream=[8,2,9]', value: { k: 3, init: [4, 5], stream: [8, 2, 9] } },
    { id: 'kts2', label: 'k=2, init=[], stream=[3,1,4,1,5]', value: { k: 2, init: [], stream: [3, 1, 4, 1, 5] } },
  ] satisfies SampleInput<KthStreamInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as KthStreamState | undefined;
    if (!s?.done) return { ok: false, label: 'incomplete' };
    return { ok: true, label: s.answers.length ? `last kth = ${s.answers[s.answers.length - 1]}` : 'done' };
  },
};

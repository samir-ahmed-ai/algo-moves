import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { minHeapPop, minHeapPush } from '../../../_shared/dualHeapBoard';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const frames: Frame<KthStreamState>[] = [];
  let heap: number[] = [];
  const answers: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<KthStreamState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        k,
        heap: [...heap].sort((a, b) => a - b),
        added: null,
        popped: null,
        kth: null,
        answers: answers.slice(),
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `k=${k}`,
    `Kth largest in stream: maintain a min-heap of size k holding the k largest values seen. The root (smallest of those k) is the kth largest.`,
    {},
  );

  for (const v of init) {
    heap = minHeapPush(heap, v);
    emit('PUSH', `push ${v}`, `Bootstrap: push ${v} into the min-heap.`, { added: v, heap: [...heap].sort((a, b) => a - b) });
    if (heap.length > k) {
      let popped: number;
      [heap, popped] = minHeapPop(heap);
      emit(
        'TRIM',
        `popMin ${popped}`,
        `Heap size ${heap.length + 1} > k=${k} — popMin removes ${popped} (too small to be in top k).`,
        { added: v, popped, heap: [...heap].sort((a, b) => a - b) },
      );
    }
  }

  for (const v of stream) {
    heap = minHeapPush(heap, v);
    emit('ADD', `push ${v}`, `Stream add ${v}: push into min-heap.`, { added: v, heap: [...heap].sort((a, b) => a - b) });
    let popped: number | null = null;
    if (heap.length > k) {
      [heap, popped] = minHeapPop(heap);
      emit(
        'TRIM',
        `popMin ${popped}`,
        `Size > k — popMin ${popped}. Heap now holds the ${k} largest values.`,
        { added: v, popped, heap: [...heap].sort((a, b) => a - b) },
      );
    }
    const kth = heap[0];
    answers.push(kth);
    emit(
      'KTH',
      `kth=${kth}`,
      `Return heap[0] = ${kth} — the kth largest after adding ${v}.`,
      { added: v, popped, kth, answers: answers.slice(), heap: [...heap].sort((a, b) => a - b) },
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {s.added !== null && (
          <>
            {' · '}added <span className="font-mono text-ink">{s.added}</span>
          </>
        )}
        {s.popped !== null && (
          <>
            {' · '}popped <span className="font-mono text-bad">{s.popped}</span>
          </>
        )}
      </div>
      <div className={cn(vizText.sm, 'text-ink3')}>min-heap (size ≤ k) · root = kth largest</div>
      <ArrayRow
        values={s.heap.length ? s.heap.map(String) : ['—']}
        cellTone={(i) => (i === 0 ? 'match' : 'found')}
        pointers={s.heap.length ? [{ i: 0, label: 'root', tone: 'accent', place: 'above' }] : []}
        windowRange={null}
      />
      {s.kth !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          kth largest = {s.kth}
        </div>
      )}
      {s.answers.length > 0 && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          answers [{s.answers.join(', ')}]
        </div>
      )}
    </div>
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

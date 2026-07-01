import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface StreamItem {
  val: number;
  stream: number;
  idx: number;
}

interface MergeStreamsInput {
  streams: number[][];
}

interface MergeStreamsState {
  streams: number[][];
  /** Each stream's next unread index. */
  cursors: number[];
  heap: StreamItem[];
  out: number[];
  popped: StreamItem | null;
  done: boolean;
}

function heapPush(items: StreamItem[], it: StreamItem): StreamItem[] {
  const h = [...items, it];
  let i = h.length - 1;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (h[p].val <= h[i].val) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
  return h;
}

function heapPopMin(items: StreamItem[]): [StreamItem[], StreamItem] {
  if (items.length === 0) return [[], { val: 0, stream: 0, idx: 0 }];
  const top = items[0];
  if (items.length === 1) return [[], top];
  const h = [...items];
  const last = h.pop()!;
  h[0] = last;
  let i = 0;
  for (;;) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let smallest = i;
    if (l < h.length && h[l].val < h[smallest].val) smallest = l;
    if (r < h.length && h[r].val < h[smallest].val) smallest = r;
    if (smallest === i) break;
    [h[i], h[smallest]] = [h[smallest], h[i]];
    i = smallest;
  }
  return [h, top];
}

function heapDisplay(heap: StreamItem[]): string[] {
  return heap.length
    ? [...heap].sort((a, b) => a.val - b.val).map((it) => `s${it.stream}:${it.val}`)
    : ['—'];
}

function record({ streams }: MergeStreamsInput): Frame<MergeStreamsState>[] {
  const frames: Frame<MergeStreamsState>[] = [];
  const cursors = streams.map(() => 0);
  let heap: StreamItem[] = [];
  const out: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<MergeStreamsState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        streams,
        cursors: cursors.slice(),
        heap: heap.slice(),
        out: out.slice(),
        popped: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `k=${streams.length}`,
    `Merge K sorted streams: seed a min-heap with the first element of each non-empty stream. Repeatedly popMin, append to output, push that stream's next.`,
    {},
  );

  for (let si = 0; si < streams.length; si++) {
    if (streams[si].length > 0) {
      const it: StreamItem = { val: streams[si][0], stream: si, idx: 0 };
      heap = heapPush(heap, it);
      emit(
        'SEED',
        `s${si}→${it.val}`,
        `Seed heap with stream ${si}'s head: ${it.val}.`,
        { heap: heap.slice(), cursors: cursors.slice() },
      );
    }
  }

  while (heap.length > 0) {
    let popped: StreamItem;
    [heap, popped] = heapPopMin(heap);
    out.push(popped.val);
    emit(
      'POP',
      `take ${popped.val}`,
      `PopMin: value ${popped.val} from stream ${popped.stream} (index ${popped.idx}). Append to merged output.`,
      { heap: heap.slice(), out: out.slice(), popped, cursors: cursors.slice() },
      'good',
    );
    cursors[popped.stream] = popped.idx + 1;
    const next = popped.idx + 1;
    if (next < streams[popped.stream].length) {
      const nxt: StreamItem = { val: streams[popped.stream][next], stream: popped.stream, idx: next };
      heap = heapPush(heap, nxt);
      emit(
        'PUSH',
        `s${nxt.stream}→${nxt.val}`,
        `Stream ${popped.stream} has a next element ${nxt.val} — push it into the heap.`,
        { heap: heap.slice(), cursors: cursors.slice(), out: out.slice(), popped },
      );
    }
  }

  emit(
    'DONE',
    `[${out.join(', ')}]`,
    `Heap empty — all streams exhausted. Merged sorted output: [${out.join(', ')}].`,
    { out: out.slice(), done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MergeStreamsState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>streams (cursors mark next unread)</div>
      {s.streams.map((st, si) => (
        <div key={si} className={cn('font-mono', vizText.sm)}>
          s{si}:{' '}
          {st.map((v, i) => (
            <span
              key={i}
              className={cn(
                'mr-1',
                i < s.cursors[si] ? 'text-ink3 line-through' : i === s.cursors[si] ? 'rounded bg-accentbg text-accent' : 'text-ink',
              )}
            >
              {v}
            </span>
          ))}
        </div>
      ))}
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        min-heap heads [{heapDisplay(s.heap).join(', ')}]
      </div>
      {s.popped && (
        <div className={cn('font-mono', vizText.sm, 'text-accent')}>
          popped s{s.popped.stream}:{s.popped.val}
        </div>
      )}
      <div className={cn('mt-1 font-mono', vizText.sm, s.done ? 'text-good' : 'text-ink3')}>
        merged [{s.out.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MergeStreamsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="heap size" v={s.heap.length} />
      <InspectorRow k="heap min" v={s.heap.length ? Math.min(...s.heap.map((h) => h.val)) : '—'} />
      <InspectorRow k="merged len" v={s.out.length} />
      <InspectorRow k="last popped" v={s.popped ? `s${s.popped.stream}:${s.popped.val}` : '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-merge-k-sorted-streams-in-one';
export const title = 'Merge K sorted streams in one';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'mks1',
      label: '[[1,4,7],[2,5,8],[3,6,9]]',
      value: { streams: [[1, 4, 7], [2, 5, 8], [3, 6, 9]] },
    },
    {
      id: 'mks2',
      label: '[[1,10],[2,3,4]]',
      value: { streams: [[1, 10], [2, 3, 4]] },
    },
  ] satisfies SampleInput<MergeStreamsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MergeStreamsState | undefined;
    if (!s?.done) return { ok: false, label: 'incomplete' };
    const flat = s.streams.flat().sort((a, b) => a - b);
    const ok = s.out.length === flat.length && s.out.every((v, i) => v === flat[i]);
    return { ok, label: `[${s.out.join(', ')}]` };
  },
};

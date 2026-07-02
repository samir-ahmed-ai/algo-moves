import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SrvInput {
  k: number;
  arrival: number[];
  load: number[];
}

interface BusyItem {
  freeTime: number;
  id: number;
}

interface SrvState {
  k: number;
  avail: number[];
  busy: BusyItem[];
  cnt: number[];
  req: number;
  assigned: number | null;
  op: string;
  result: number[];
  done: boolean;
}

function heapPush(h: BusyItem[], item: BusyItem): BusyItem[] {
  const a = [...h, item];
  let i = a.length - 1;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (a[p].freeTime <= a[i].freeTime) break;
    [a[p], a[i]] = [a[i], a[p]];
    i = p;
  }
  return a;
}

function heapPop(h: BusyItem[]): [BusyItem[], BusyItem] {
  if (h.length === 0) return [[], { freeTime: 0, id: -1 }];
  const top = h[0];
  if (h.length === 1) return [[], top];
  const a = [...h];
  const last = a.pop()!;
  a[0] = last;
  let i = 0;
  for (;;) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let smallest = i;
    if (l < a.length && a[l].freeTime < a[smallest].freeTime) smallest = l;
    if (r < a.length && a[r].freeTime < a[smallest].freeTime) smallest = r;
    if (smallest === i) break;
    [a[i], a[smallest]] = [a[smallest], a[i]];
    i = smallest;
  }
  return [a, top];
}

function insertSorted(avail: number[], id: number): number[] {
  const a = [...avail];
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < id) lo = mid + 1;
    else hi = mid;
  }
  a.splice(lo, 0, id);
  return a;
}

function record({ k, arrival, load }: SrvInput): Frame<SrvState>[] {  let busy: BusyItem[] = [];
  let avail = Array.from({ length: k }, (_, i) => i);
  const cnt = new Array(k).fill(0);

  const { emit, frames } = createRecorder<SrvState>(() => ({
        k,
        avail: avail.slice(),
        busy: busy.map((b) => ({ ...b })),
        cnt: cnt.slice(),
        req: 0,
        assigned: null,
        op: '',
        result: [],
        done: false
      }));

  emit(
    'INIT',
    `${k} servers`,
    `Busiest Servers: min-heap of busy servers by freeTime. avail sorted list; assign request i to server at/after i%k (wrap).`,
    {},
  );

  for (let i = 0; i < arrival.length; i++) {
    const arr = arrival[i];
    while (busy.length > 0 && busy[0].freeTime <= arr) {
      let freed: BusyItem;
      [busy, freed] = heapPop(busy);
      avail = insertSorted(avail, freed.id);
    }
    if (avail.length === 0) {
      emit('SKIP', `req ${i} @${arr}`, `Request ${i} at t=${arr}: all servers busy → skip.`, { req: i, op: `skip @${arr}` });
      continue;
    }
    const target = i % k;
    let idx = avail.findIndex((x) => x >= target);
    if (idx < 0) idx = 0;
    const srv = avail[idx];
    avail = [...avail.slice(0, idx), ...avail.slice(idx + 1)];
    cnt[srv]++;
    busy = heapPush(busy, { freeTime: arr + load[i], id: srv });
    emit(
      'ASSIGN',
      `srv ${srv}`,
      `Request ${i} at t=${arr}: target=${target} → server ${srv}, busy until ${arr + load[i]}. cnt[${srv}]=${cnt[srv]}.`,
      { req: i, assigned: srv, op: `req${i}→srv${srv}`, cnt: cnt.slice(), avail: avail.slice(), busy: busy.slice() },
      'good',
    );
  }

  const mx = Math.max(...cnt);
  const result = cnt.map((c, i) => (c === mx ? i : -1)).filter((i) => i >= 0);
  emit(
    'DONE',
    `[${result.join(',')}]`,
    `Done. Max requests handled = ${mx}. Busiest server(s): [${result.join(', ')}].`,
    { op: 'done', result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SrvState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.assigned !== null && <span className="ml-2 font-mono text-good">srv {s.assigned}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        avail: [{s.avail.join(', ') || 'none'}]
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {s.cnt.map((c, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.assigned ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            srv{i}:{c}
          </span>
        ))}
      </div>
      {s.result.length > 0 && (
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-good')}>busiest: [{s.result.join(', ')}]</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SrvState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="request" v={s.req || '—'} />
      <InspectorRow k="assigned" v={s.assigned ?? '—'} />
      <InspectorRow k="avail" v={s.avail.length ? `[${s.avail.join(', ')}]` : 'empty'} />
      <InspectorRow k="counts" v={`[${s.cnt.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-find-servers-that-handled-most-number-of-requests';
export const title = 'Find Servers That Handled Most Number of Requests';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'srv1',
      label: 'k=3 · 5 requests',
      value: { k: 3, arrival: [1, 2, 3, 4, 5], load: [5, 1, 4, 3, 2] },
    },
  ] satisfies SampleInput<SrvInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SrvState | undefined;
    return s?.done ? { ok: true, label: `[${s.result.join(',')}]` } : { ok: false, label: 'incomplete' };
  },
};

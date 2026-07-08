import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailStack,
  vizText,
} from '../../../_shared/vizKit';

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
    if (a[p]!.freeTime <= a[i]!.freeTime) break;
    [a[p]!, a[i]!] = [a[i]!, a[p]!];
    i = p;
  }
  return a;
}

function heapPop(h: BusyItem[]): [BusyItem[], BusyItem] {
  if (h.length === 0) return [[], { freeTime: 0, id: -1 }];
  const top = h[0]!;
  if (h.length === 1) return [[], top!];
  const a = [...h];
  const last = a.pop()!;
  a[0]! = last;
  let i = 0;
  for (;;) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let smallest = i;
    if (l < a.length && a[l]!.freeTime < a[smallest]!.freeTime) smallest = l;
    if (r < a.length && a[r]!.freeTime < a[smallest]!.freeTime) smallest = r;
    if (smallest === i) break;
    [a[i]!, a[smallest]!] = [a[smallest]!, a[i]!];
    i = smallest;
  }
  return [a, top!];
}

function insertSorted(avail: number[], id: number): number[] {
  const a = [...avail];
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid]! < id) lo = mid + 1;
    else hi = mid;
  }
  a.splice(lo, 0, id);
  return a;
}

function record({ k, arrival, load }: SrvInput): Frame<SrvState>[] {
  let busy: BusyItem[] = [];
  let avail = Array.from({ length: k }, (_, i) => i);
  const cnt = new Array(k).fill(0);

  const { emit, frames } = createPrepRecorder<SrvState>(() => ({
    k,
    avail: avail.slice(),
    busy: busy.map((b) => ({ ...b })),
    cnt: cnt.slice(),
    req: 0,
    assigned: null,
    op: '',
    result: [],
    done: false,
  }));

  emit(
    'INIT',
    `${k} servers`,
    `Busiest Servers: min-heap of busy servers by freeTime. avail sorted list; assign request i to server at/after i%k (wrap).`,
    {},
  );

  for (let i = 0; i < arrival.length; i++) {
    const arr = arrival[i]!;
    while (busy.length > 0 && busy[0]!.freeTime <= arr!) {
      let freed: BusyItem;
      [busy, freed] = heapPop(busy);
      avail = insertSorted(avail, freed.id);
    }
    if (avail.length === 0) {
      emit('SKIP', `req ${i} @${arr}`, `Request ${i} at t=${arr}: all servers busy → skip.`, {
        req: i,
        op: `skip @${arr}`,
      });
      continue;
    }
    const target = i % k;
    let idx = avail.findIndex((x) => x >= target);
    if (idx < 0) idx = 0;
    const srv = avail[idx]!;
    avail = [...avail.slice(0, idx), ...avail.slice(idx + 1)];
    cnt[srv!]!++;
    busy = heapPush(busy, { freeTime: arr! + load[i]!, id: srv });
    emit(
      'ASSIGN',
      `srv ${srv}`,
      `Request ${i} at t=${arr}: target=${target} → server ${srv}, busy until ${arr! + load[i]!}. cnt[${srv}]!=${cnt[srv!]!}.`,
      {
        req: i,
        assigned: srv,
        op: `req${i}→srv${srv}`,
        cnt: cnt.slice(),
        avail: avail.slice(),
        busy: busy.slice(),
      },
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
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.assigned !== null && <RailStat k="srv" v={s.assigned} tone="good" />}
      </RailGroup>
      <RailStack label="avail" items={s.avail.length ? s.avail.map(String) : []} empty="none" />
      {s.result.length > 0 && <RailStack label="busiest" items={s.result.map(String)} />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
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
    </VizStage>
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

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How are requests assigned to k servers in this simulation?',
    choices: [
      {
        label: 'Min-heap busy by freeTime — sorted avail list with i mod k target',
        correct: true,
      },
      {
        label: 'Round-robin index cycling — ignore busy-until assignment rules',
      },
      {
        label: 'Half-open calendar — reject overlapping server bookings',
      },
      {
        label: 'Reservoir pick — uniform random server among idle ids',
      },
    ],
    explain:
      'Busy heap frees servers at arrival; avail picks first id ≥ i%k (wrap); cnt tracks handled load.',
  },
  {
    id: 'key-step',
    prompt: 'On ASSIGN for request i, how is the server chosen?',
    choices: [
      {
        label: 'Target i mod k — first avail id at or after target, wrap if needed',
        correct: true,
      },
      {
        label: 'Smallest cnt always — pick least-used server ignoring target',
      },
      {
        label: 'Highest freeTime — busiest server receives next request',
      },
      {
        label: 'Random avail index — uniform among currently free servers',
      },
    ],
    explain:
      'findIndex on avail for x >= target; if none, idx=0; server removed from avail and pushed busy.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for busiest-servers assignment?',
    choices: [
      {
        label: 'O(m log k) time, O(k) space — heap ops over m requests',
        correct: true,
      },
      {
        label: 'O(m) time, O(1) space — no heap structure maintained',
      },
      {
        label: 'O(k²) per request, O(m) space — scan all pairs each arrival',
      },
      {
        label: 'O(log m) only, O(m) space — binary search arrivals once',
      },
    ],
    explain: 'Each request may pop/push busy heap; avail and cnt arrays size k.',
  },
  {
    id: 'edge',
    prompt: 'When does the recorder emit SKIP for a request?',
    choices: [
      {
        label: 'avail empty after freeing — all k servers still busy at arrival',
        correct: true,
      },
      {
        label: 'cnt already maximal — server hit request limit cap',
      },
      {
        label: 'arrival time zero — invalid timestamp rejects request',
      },
      {
        label: 'target server missing — id not in initial 0..k-1 range',
      },
    ],
    explain: 'If no server freed by arrival time and avail.length===0, assignment is skipped.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
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
    return s?.done
      ? { ok: true, label: `[${s.result.join(',')}]` }
      : { ok: false, label: 'incomplete' };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SortPairsInput {
  // Each entry maps a key to the value that follows it in the chain.
  pairs: [string, string][];
}

interface SortPairsState {
  pairs: [string, string][]; // the raw key->next links
  dest: string[]; // values seen on the right-hand side (cannot be the head)
  keys: string[]; // all keys, for the pointer row
  start: string | null; // the discovered head (key never used as a value)
  scanKey: string | null; // key being checked while hunting for the head
  cur: string | null; // current key while walking the chain
  next: string | null; // inputMap[cur], the link we just followed
  route: string[]; // accumulated 'a-b' segments
  done: boolean;
}

function record({ pairs }: SortPairsInput): Frame<SortPairsState>[] {
  const frames: Frame<SortPairsState>[] = [];
  const inputMap = new Map<string, string>(pairs);
  const keys = pairs.map(([k]) => k);

  let dest: string[] = [];
  let start: string | null = null;
  let route: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<SortPairsState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        pairs,
        keys,
        dest: [...dest],
        start,
        scanKey: null,
        cur: null,
        next: null,
        route: [...route],
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${pairs.length} pairs`,
    `Sort pairs: each entry links a key to its next value. We rebuild the single chain by finding the head (a key that never appears as a value) and walking the map from there.`,
    {},
  );

  // Pass 1: collect every value into the dest set — these can never be the head.
  for (const [, v] of pairs) {
    dest.push(v);
    emit(
      'DEST',
      `dest += ${v}`,
      `Record "${v}" as a destination: it appears on the right of a link, so it has something pointing at it and cannot be the start.`,
      { dest: [...dest] },
    );
  }

  // Pass 2: the head is the one key that is not in dest.
  const destSet = new Set(dest);
  for (const k of keys) {
    if (!destSet.has(k)) {
      start = k;
      emit(
        'HEAD',
        `start=${k}`,
        `"${k}" is a key but never showed up as a destination, so nothing points to it — it is the head of the chain. Start walking here.`,
        { scanKey: k, start: k },
        'good',
      );
      break;
    }
    emit(
      'SCAN',
      `${k} in dest`,
      `"${k}" is also a destination, so something points to it — it is not the head. Keep looking.`,
      { scanKey: k },
    );
  }

  // Pass 3: walk the chain, appending 'cur-next' until a key has no link.
  let cur: string | null = start;
  while (cur !== null) {
    const next = inputMap.get(cur);
    const hasNext = next !== undefined;
    const segment = `${cur}-${hasNext ? next : ''}`;
    route.push(segment);
    if (!hasNext) {
      emit(
        'TAIL',
        `${segment}`,
        `"${cur}" has no outgoing link, so it is the tail. Append "${segment}" and stop — the chain is fully rebuilt.`,
        { cur, next: null, route: [...route] },
        'good',
      );
      break;
    }
    emit(
      'WALK',
      `${segment}`,
      `Follow the link from "${cur}" to "${next}". Append the segment "${segment}" to the route, then move to "${next}".`,
      { cur, next, route: [...route] },
    );
    cur = next;
  }

  emit(
    'DONE',
    `${route.length} segments`,
    `Done. The reconstructed route is [${route.join(', ')}] — one pass to find destinations, one to find the head, one to walk the chain: Time O(n), Space O(n).`,
    { cur: null, next: null, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SortPairsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.scanKey !== null) {
    const idx = s.keys.indexOf(s.scanKey);
    if (idx >= 0) pointers.push({ i: idx, label: 'scan', tone: 'warn', place: 'above' });
  }
  if (s.cur !== null) {
    const idx = s.keys.indexOf(s.cur);
    if (idx >= 0) pointers.push({ i: idx, label: 'cur', tone: 'accent', place: 'above' });
  }
  if (s.next !== null) {
    const idx = s.keys.indexOf(s.next);
    if (idx >= 0) pointers.push({ i: idx, label: 'next', tone: 'good', place: 'below' });
  }
  const destSet = new Set(s.dest);
  const tone = (i: number) => {
    const k = s.keys[i];
    if (s.start !== null && k === s.start) return 'found';
    if (s.cur !== null && k === s.cur) return 'match';
    if (destSet.has(k)) return 'dead';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        keys (head =
        <span className="font-mono text-ink"> {s.start ?? '?'}</span>)
      </div>
      <ArrayRow values={s.keys} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        map {'{'}
        {s.pairs.map(([k, v]) => `${k}→${v}`).join(', ')}
        {'}'}
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        dest {'{'}
        {s.dest.join(', ')}
        {'}'}
      </div>
      {s.route.length > 0 && (
        <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink', vizText.base)}>
          → [{s.route.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SortPairsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="pairs" v={s.pairs.length} />
      <InspectorRow k="dest size" v={s.dest.length} />
      <InspectorRow k="start (head)" v={s.start ?? '—'} />
      <InspectorRow k="cur" v={s.cur ?? '—'} />
      <InspectorRow k="next" v={s.next ?? '—'} />
      <InspectorRow k="route len" v={s.route.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-sort-pairs';
export const title = 'Sort pairs';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sp1',
      label: 'a→b→c→d',
      value: {
        pairs: [
          ['c', 'd'],
          ['a', 'b'],
          ['b', 'c'],
        ],
      },
    },
    {
      id: 'sp2',
      label: 'x→y→z',
      value: {
        pairs: [
          ['y', 'z'],
          ['x', 'y'],
        ],
      },
    },
  ] satisfies SampleInput<SortPairsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SortPairsState | undefined;
    return s && s.route.length > 0
      ? { ok: true, label: s.route.join(', ') }
      : { ok: false, label: 'no chain' };
  },
};

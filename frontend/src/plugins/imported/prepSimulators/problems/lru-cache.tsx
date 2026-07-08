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
  vizText,
} from '../../../_shared/vizKit';

type LruOp = { kind: 'get'; key: number } | { kind: 'put'; key: number; val: number };

interface LruInput {
  cap: number;
  ops: LruOp[];
}

interface LruNode {
  key: number;
  val: number;
}

interface LruState {
  cap: number;
  list: LruNode[];
  op: string;
  out: number | null;
  evicted: LruNode | null;
  touched: number | null;
  done: boolean;
}

function record({ cap, ops }: LruInput): Frame<LruState>[] {
  const cache = new Map<number, LruNode>();
  let list: LruNode[] = [];

  const remove = (n: LruNode) => {
    list = list.filter((x) => x.key !== n.key);
  };
  const addHead = (n: LruNode) => {
    remove(n);
    list.unshift(n);
  };

  const { emit, frames } = createPrepRecorder<LruState>(() => ({
    cap,
    list: list.map((x) => ({ ...x })),
    op: '',
    out: null,
    evicted: null,
    touched: null,
    done: false,
  }));

  emit(
    'INIT',
    `cap=${cap}`,
    `LRU Cache (capacity ${cap}): a hash map points to nodes in a doubly-linked list. MRU sits at the front, LRU at the tail. Get/Put move a node to the front; Put evicts tail.prev when full.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'get') {
      const n = cache.get(o.key);
      if (!n) {
        emit(
          'GET',
          `get ${o.key} miss`,
          `Get(${o.key}): key not in map → return -1.`,
          { op: `get ${o.key}`, out: -1 },
          'bad',
        );
        continue;
      }
      addHead(n);
      emit(
        'GET',
        `get ${o.key}=${n.val}`,
        `Get(${o.key}): hit value ${n.val}. Move node to MRU (front) so it won't be evicted next.`,
        { op: `get ${o.key}`, out: n.val, touched: o.key },
        'good',
      );
    } else {
      const existing = cache.get(o.key);
      if (existing) {
        existing.val = o.val;
        addHead(existing);
        emit(
          'PUT',
          `put ${o.key}=${o.val} update`,
          `Put(${o.key}, ${o.val}): key exists — update value and move to MRU front.`,
          { op: `put ${o.key}=${o.val}`, touched: o.key },
        );
        continue;
      }
      let evicted: LruNode | null = null;
      if (cache.size >= cap && cap > 0) {
        const lru = list[list.length - 1]!;
        if (lru) {
          evicted = { ...lru };
          remove(lru);
          cache.delete(lru.key);
          emit(
            'EVICT',
            `evict ${lru.key}`,
            `At capacity ${cap}. Evict LRU key ${lru.key} (tail) before inserting new key ${o.key}.`,
            { op: `put ${o.key}=${o.val}`, evicted },
          );
        }
      }
      const node: LruNode = { key: o.key, val: o.val };
      cache.set(o.key, node);
      addHead(node);
      emit(
        'PUT',
        `put ${o.key}=${o.val}`,
        `Insert new node (${o.key}, ${o.val}) at MRU front. Map now has ${cache.size} entr${cache.size === 1 ? 'y' : 'ies'}.`,
        { op: `put ${o.key}=${o.val}`, touched: o.key, evicted },
      );
    }
  }

  emit(
    'DONE',
    `${list.length} nodes`,
    `Done. Final order MRU → LRU: ${list.map((n) => `${n.key}:${n.val}`).join(', ') || 'empty'}.`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LruState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.out !== null && (
        <RailGroup label="result">
          <RailStat k="val" v={s.out} tone="good" />
        </RailGroup>
      )}
      <RailGroup label="cache">
        <RailStat k="cap" v={s.cap} />
        <RailStat k="used" v={s.list.length} />
      </RailGroup>
      {s.evicted && (
        <RailGroup label="evict">
          <RailStat k="key" v={`${s.evicted.key}:${s.evicted.val}`} tone="bad" />
        </RailGroup>
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
        {s.list.length === 0 ? (
          <span className={cn(vizText.sm, 'text-ink3')}>empty</span>
        ) : (
          s.list.map((n, i) => (
            <span
              key={`${n.key}-${i}`}
              className={cn(
                'rounded border px-2 py-0.5 font-mono',
                vizText.sm,
                n.key === s.touched
                  ? 'border-accent bg-accentbg text-accent'
                  : 'border-edge text-ink',
                i === s.list.length - 1 && s.list.length > 0 ? 'opacity-80' : '',
              )}
            >
              {n.key}:{n.val}
              {i === 0 && ' · MRU'}
              {i === s.list.length - 1 && s.list.length > 1 && ' · LRU'}
            </span>
          ))
        )}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LruState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="capacity" v={s.cap} />
      <InspectorRow k="size" v={s.list.length} />
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="returned" v={s.out ?? '—'} />
      <InspectorRow k="MRU" v={s.list[0]! ? `${s.list[0]!.key}:${s.list[0]!.val}` : '—'} />
      <InspectorRow
        k="LRU"
        v={
          s.list[s.list.length - 1]!
            ? `${s.list[s.list.length - 1]!.key}:${s.list[s.list.length - 1]!.val}`
            : '—'
        }
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-lru-cache';
export const title = 'LRU Cache';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which structures implement LRU Cache here?',
    choices: [
      {
        label: 'Hash map plus linked list — map key to node, MRU at front',
        correct: true,
      },
      {
        label: 'Two lazy heaps — track min and max price by timestamp',
      },
      {
        label: 'Round-robin server index — cycle through backend pool',
      },
      {
        label: 'Per-index snap history — versioned array entries',
      },
    ],
    explain: 'The map finds nodes in O(1); the list order encodes recency with LRU at the tail.',
  },
  {
    id: 'key-step',
    prompt: 'When Put inserts a new key at full capacity, what happens first?',
    choices: [
      {
        label: 'Evict LRU tail key — remove from map before inserting',
        correct: true,
      },
      {
        label: 'Reject the Put outright — return false without changes',
      },
      {
        label: 'Double capacity silently — grow list without eviction',
      },
      {
        label: 'Move every node one slot — shift entire list right',
      },
    ],
    explain:
      'At capacity the tail node is removed from both list and map, then the new key is inserted at MRU.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for LRU Cache?',
    choices: [
      {
        label: 'O(1) get/put time, O(capacity) space — map plus list nodes',
        correct: true,
      },
      {
        label: 'O(log n) get/put time, O(n) space — heap rebalancing each touch',
      },
      {
        label: 'O(n) get time, O(1) space — scan list for every lookup',
      },
      {
        label: 'O(path depth) time, O(nodes) space — trie walk per access',
      },
    ],
    explain: 'Map lookup and list splice are constant time; storage is bounded by capacity.',
  },
  {
    id: 'edge',
    prompt: 'What does Get return on a cache miss?',
    choices: [
      {
        label: 'Return -1 — list order stays unchanged on a miss',
        correct: true,
      },
      {
        label: 'Insert default value zero — treat miss like Put',
      },
      {
        label: 'Evict LRU entry — make room for the missing key',
      },
      {
        label: 'Throw error — abort the simulation run immediately',
      },
    ],
    explain: 'A missing key emits a miss frame with out=-1 and does not reorder the list.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'lru1',
      label: 'cap 2 · put 1,2 · get 1 · put 3 · get 2',
      value: {
        cap: 2,
        ops: [
          { kind: 'put', key: 1, val: 1 },
          { kind: 'put', key: 2, val: 2 },
          { kind: 'get', key: 1 },
          { kind: 'put', key: 3, val: 3 },
          { kind: 'get', key: 2 },
        ],
      },
    },
  ] satisfies SampleInput<LruInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LruState | undefined;
    return s?.done
      ? { ok: true, label: `${s.list.length} in cache` }
      : { ok: false, label: 'incomplete' };
  },
};

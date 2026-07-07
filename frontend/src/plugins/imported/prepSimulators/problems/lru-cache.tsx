import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

  const { emit, frames } = createRecorder<LruState>(() => ({
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
        const lru = list[list.length - 1];
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        op = <span className="font-mono text-ink">{s.op || '—'}</span>
        {s.out !== null && (
          <>
            {' · '}returned <span className="font-mono text-ink">{s.out}</span>
          </>
        )}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        MRU → LRU (cap {s.cap}, {s.list.length} used)
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
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
      {s.evicted && (
        <div className={cn('mt-1', vizText.sm, 'text-bad')}>
          evicted {s.evicted.key}:{s.evicted.val}
        </div>
      )}
    </div>
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
      <InspectorRow k="MRU" v={s.list[0] ? `${s.list[0].key}:${s.list[0].val}` : '—'} />
      <InspectorRow
        k="LRU"
        v={
          s.list[s.list.length - 1]
            ? `${s.list[s.list.length - 1].key}:${s.list[s.list.length - 1].val}`
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
    prompt: 'Which approach fits "LRU Cache"?',
    choices: [
      {
        label: 'Hash map + doubly linked list LRU — fits this problem',
        correct: true,
      },
      {
        label: 'Round-robin load balancer — different approach',
      },
      {
        label: 'Copy-on-write version snapshots — different approach',
      },
      {
        label: 'Trie dictionary + spell suggest — different approach',
      },
    ],
    explain: 'Map key->node; the list keeps MRU at the front, LRU at the tail',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (LRU Cache), what strategy is established?',
    choices: [
      {
        label: 'Map key->node; the list keeps MRU — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'LRU Cache (capacity ): a hash map points to nodes in a doubly-linked list. MRU sits at the front, LRU at the tail. Get/Put move a node to the front; Put evicts tail.prev when full.',
  },
  {
    id: 'key-step',
    prompt: 'On the "PUT" step (put = update), what happens?',
    choices: [
      {
        label: 'Put(, ): key exists — update — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain: 'Put(, ): key exists — update value and move to MRU front.',
  },
  {
    id: 'state',
    prompt: 'What does the `cap` field track in the visualization state?',
    choices: [
      {
        label: 'Field cap in state — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain:
      'The recorder snapshots `cap` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "LRU Cache"?',
    choices: [
      {
        label: 'O(1) get/put time, O(capacity) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(servers) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(versions) get time, O(changes) space — wrong order of growth',
      },
    ],
    explain:
      'O(1) get/put. O(capacity). get/put -> remove+insertFront; over capacity -> evict tail.prev',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Done. Final order MRU → LRU: — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain: 'Done. Final order MRU → LRU: ${list.map((n) => ',
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

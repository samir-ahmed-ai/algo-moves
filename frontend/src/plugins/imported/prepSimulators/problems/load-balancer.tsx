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
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type LbOp = { kind: 'next' } | { kind: 'add'; server: string } | { kind: 'remove'; server: string };

interface LbInput {
  servers: string[];
  ops: LbOp[];
}

interface LbState {
  servers: string[];
  index: number;
  op: string;
  result: string;
  ok: boolean | null;
  done: boolean;
}

function record({ servers: init, ops }: LbInput): Frame<LbState>[] {
  let servers = [...init];
  let index = 0;

  const { emit, frames } = createPrepRecorder<LbState>(() => ({
    servers: servers.slice(),
    index,
    op: '',
    result: '',
    ok: null,
    done: false,
  }));

  emit(
    'INIT',
    init.join(', '),
    `Load Balancer: round-robin nextServer() cycles index. addServer appends; removeServer splices and resets index if needed.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'next') {
      if (servers.length === 0) {
        emit(
          'NEXT',
          'empty',
          `nextServer(): no servers → ("", false).`,
          { op: 'next', result: '', ok: false },
          'bad',
        );
      } else {
        const server = servers[index]!;
        emit(
          'NEXT',
          server!,
          `nextServer(): return "${server}" (index ${index}), then index → ${(index + 1) % servers.length}.`,
          { op: 'next', result: server, ok: true, index },
          'good',
        );
        index = (index + 1) % servers.length;
      }
    } else if (o.kind === 'add') {
      servers.push(o.server);
      emit('ADD', o.server, `addServer("${o.server}"): pool now [${servers.join(', ')}].`, {
        op: `add ${o.server}`,
        servers: servers.slice(),
      });
    } else {
      const i = servers.indexOf(o.server);
      if (i >= 0) {
        servers.splice(i, 1);
        if (index >= servers.length) index = 0;
        emit(
          'REMOVE',
          o.server,
          `removeServer("${o.server}"): pool now [${servers.join(', ')}], index=${index}.`,
          {
            op: `remove ${o.server}`,
            servers: servers.slice(),
            index,
          },
        );
      }
    }
  }

  emit('DONE', 'done', `Done. Pool: [${servers.join(', ')}].`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<LbState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.ok !== null && s.result && (
          <span className="ml-2 font-mono text-good">→ {s.result}</span>
        )}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>index = {s.index}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {s.servers.map((srv, i) => (
          <span
            key={srv}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.index ? 'border-accent bg-accentbg text-accent' : 'border-edge',
            )}
          >
            {srv}
            {i === s.index && ' ← next'}
          </span>
        ))}
        {s.servers.length === 0 && <span className={cn(vizText.sm, 'text-ink3')}>empty</span>}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LbState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="index" v={s.index} />
      <InspectorRow k="pool size" v={s.servers.length} />
      <InspectorRow k="result" v={s.result || '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-load-balancer';
export const title = 'Load balancer';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Load balancer"?',
    choices: [
      {
        label: 'Round-robin load balancer — fits this problem',
        correct: true,
      },
      {
        label: 'Hash map + doubly linked list LRU — different approach',
      },
      {
        label: 'Stack — different approach',
      },
      {
        label: 'Trie phone directory autocomplete — different approach',
      },
    ],
    explain: 'Circular index cycling through the backend list',
  },
  {
    id: 'state',
    prompt: 'What does the `servers` field track in the visualization state?',
    choices: [
      {
        label: 'Field servers in state — updated each frame',
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
      'The recorder snapshots `servers` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Load balancer"?',
    choices: [
      {
        label: 'O(1) time, O(servers) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) get/put time, O(capacity) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(1). O(servers). server=servers[idx]!; idx=(idx+1)%len',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'lb1',
      label: 'round-robin + add/remove',
      value: {
        servers: ['A', 'B'],
        ops: [
          { kind: 'next' },
          { kind: 'next' },
          { kind: 'next' },
          { kind: 'add', server: 'C' },
          { kind: 'next' },
        ],
      },
    },
  ] satisfies SampleInput<LbInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LbState | undefined;
    return s?.done
      ? { ok: true, label: `${s.servers.length} servers` }
      : { ok: false, label: 'incomplete' };
  },
};

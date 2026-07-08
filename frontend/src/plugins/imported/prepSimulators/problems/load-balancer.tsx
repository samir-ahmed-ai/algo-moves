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
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.ok !== null && s.result && <RailStat k="out" v={s.result} tone="good" />}
      </RailGroup>
      <RailGroup label="round">
        <RailStat k="index" v={s.index} />
        <RailStat k="pool" v={s.servers.length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
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
    </VizStage>
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
    prompt: 'How does this load balancer pick the next server?',
    choices: [
      {
        label: 'Round-robin index — return pool[index] then advance modulo size',
        correct: true,
      },
      {
        label: 'Random reservoir — uniform pick among target occurrences',
      },
      {
        label: 'Min-heap by free time — assign earliest finishing server',
      },
      {
        label: 'Prefix-sum buckets — binary search weighted draw',
      },
    ],
    explain: 'nextServer reads servers[index], then index becomes (index + 1) % servers.length.',
  },
  {
    id: 'key-step',
    prompt: 'On a NEXT step with a non-empty pool, what happens?',
    choices: [
      {
        label: 'Return server at index — advance index to next slot modulo n',
        correct: true,
      },
      {
        label: 'Always return first server — index never changes after start',
      },
      {
        label: 'Pick heaviest-loaded server — maximize current assignment count',
      },
      {
        label: 'Skip to DONE — terminate when any server is returned',
      },
    ],
    explain: 'The caption names the returned server and the next index after the modulo wrap.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for this load balancer?',
    choices: [
      {
        label: 'O(1) per op time, O(servers) space — index plus server list',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — resort pool every next call',
      },
      {
        label: 'O(m log k) time, O(k) space — heap per request assignment',
      },
      {
        label: 'O(path depth) time, O(nodes) space — trie walk each route',
      },
    ],
    explain: 'next, add, and remove each touch only the pool array and a single index variable.',
  },
  {
    id: 'edge',
    prompt: 'What happens when removeServer shrinks the pool below the current index?',
    choices: [
      {
        label: 'Reset index to zero — avoid pointing past the new pool end',
        correct: true,
      },
      {
        label: 'Keep old index — next call indexes out of bounds silently',
      },
      {
        label: 'Clear entire pool — drop all servers after any removal',
      },
      {
        label: 'Reverse server order — invert list on every remove',
      },
    ],
    explain: 'After splice, if index >= servers.length the recorder sets index back to 0.',
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

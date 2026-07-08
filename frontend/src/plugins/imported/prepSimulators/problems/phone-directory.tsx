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

type PhoneOp =
  | { kind: 'add'; number: string; name: string }
  | { kind: 'lookup'; number: string }
  | { kind: 'suggest'; prefix: string };

interface PhoneInput {
  ops: PhoneOp[];
}

interface PhoneState {
  contacts: Record<string, string>;
  suggestions: string[];
  op: string;
  result: string;
  found: boolean | null;
  done: boolean;
}

interface PhoneNode {
  children: Record<string, PhoneNode>;
  names: string[];
}

function emptyPhoneNode(): PhoneNode {
  return { children: {}, names: [] };
}

function record({ ops }: PhoneInput): Frame<PhoneState>[] {
  const contacts: Record<string, string> = {};
  const root = emptyPhoneNode();

  const { emit, frames } = createPrepRecorder<PhoneState>(() => ({
    contacts: { ...contacts },
    suggestions: [],
    op: '',
    result: '',
    found: null,
    done: false,
  }));

  emit(
    'INIT',
    'empty trie',
    `Phone Directory: trie keyed by digits stores names at each prefix node. lookup uses hash map; suggest returns names at prefix node.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'add') {
      contacts[o.number]! = o.name;
      let node = root;
      for (const ch of o.number) {
        if (!node.children[ch]!) node.children[ch]! = emptyPhoneNode();
        node = node.children[ch]!;
        node.names.push(o.name);
      }
      emit(
        'ADD',
        `${o.number}→${o.name}`,
        `addContact("${o.number}", "${o.name}"): store in map and append name along digit trie path.`,
        { op: `add ${o.number}`, contacts: { ...contacts } },
      );
    } else if (o.kind === 'lookup') {
      const name = contacts[o.number]!;
      const found = name !== undefined;
      emit(
        found ? 'LOOKUP' : 'MISS',
        o.number,
        `lookup("${o.number}"): ${found ? `return "${name}"` : 'not found'}.`,
        { op: `lookup ${o.number}`, result: name ?? '', found, contacts: { ...contacts } },
        found ? 'good' : 'bad',
      );
    } else {
      let node: PhoneNode | undefined = root;
      for (const ch of o.prefix) {
        const next: PhoneNode | undefined = node?.children[ch];
        node = next;
        if (!node) break;
      }
      const suggestions = node ? [...node.names] : [];
      emit(
        'SUGGEST',
        suggestions.join(', '),
        `suggest("${o.prefix}"): walk trie → [${suggestions.join(', ')}].`,
        { op: `suggest ${o.prefix}`, suggestions, result: suggestions.join(', ') },
        'good',
      );
    }
  }

  emit(
    'DONE',
    `${Object.keys(contacts).length} contacts`,
    `Done.`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PhoneState>) {
  const s = frame.state;
  const entries = Object.entries(s.contacts);
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.result && <RailStat k="out" v={s.result} tone="good" />}
      </RailGroup>
      <RailGroup label="book">
        <RailStat k="contacts" v={entries.length} />
      </RailGroup>
      {s.suggestions.length > 0 && <RailStack label="suggest" items={s.suggestions} />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="space-y-1">
        {entries.map(([num, name]) => (
          <div
            key={num}
            className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}
          >
            {num} → {name}
          </div>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<PhoneState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="contacts" v={Object.keys(s.contacts).length} />
      <InspectorRow k="found" v={s.found === null ? '—' : s.found ? 'yes' : 'no'} />
      <InspectorRow k="suggestions" v={s.suggestions.length ? s.suggestions.join(', ') : '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-phone-directory';
export const title = 'Phone directory';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which structures power the phone directory?',
    choices: [
      {
        label: 'Hash map plus digit trie — O(1) lookup and prefix suggest',
        correct: true,
      },
      {
        label: 'Sorted interval list — half-open booking overlap checks',
      },
      {
        label: 'Dual lazy heaps — track min and max stock prices',
      },
      {
        label: 'Reservoir over array — uniform random target index',
      },
    ],
    explain:
      'contacts maps number to name; the trie stores names at every prefix along the digit path.',
  },
  {
    id: 'key-step',
    prompt: 'On ADD, what happens besides storing in the contacts map?',
    choices: [
      {
        label: 'Append name at each trie node — along the number digit path',
        correct: true,
      },
      {
        label: 'Binary-search insert rank — sort by score then name',
      },
      {
        label: 'Copy prior map snapshot — push new version layer',
      },
      {
        label: 'Swap with last array slot — O(1) deletion trick',
      },
    ],
    explain: 'Each digit descends the trie and pushes the contact name into that node names list.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for the phone directory?',
    choices: [
      {
        label: 'O(digits) per op time, O(contacts) space — map plus trie nodes',
        correct: true,
      },
      {
        label: 'O(1) all ops, O(1) space — single flat hash only',
      },
      {
        label: 'O(n log n) suggest, O(n) space — resort all names each prefix',
      },
      {
        label: 'O(log snaps) get, O(length) space — per-cell snap history',
      },
    ],
    explain:
      'add, lookup, and suggest walk at most the number length; trie nodes scale with stored prefixes.',
  },
  {
    id: 'edge',
    prompt: 'What does suggest return when the prefix path is missing in the trie?',
    choices: [
      {
        label: 'Empty suggestion list — prefix walk stopped at a missing child',
        correct: true,
      },
      {
        label: 'All contacts in map — ignore prefix and return everyone',
      },
      {
        label: 'Error and abort — treat missing prefix as fatal failure',
      },
      {
        label: 'Random subset — reservoir sample from global contact list',
      },
    ],
    explain:
      'If any prefix digit has no child, node is undefined and suggestions become an empty array.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ph1',
      label: 'add, lookup, suggest',
      value: {
        ops: [
          { kind: 'add', number: '123', name: 'Alice' },
          { kind: 'add', number: '124', name: 'Bob' },
          { kind: 'lookup', number: '123' },
          { kind: 'suggest', prefix: '12' },
        ],
      },
    },
  ] satisfies SampleInput<PhoneInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PhoneState | undefined;
    return s?.done
      ? { ok: true, label: `${Object.keys(s.contacts).length} contacts` }
      : { ok: false, label: 'incomplete' };
  },
};

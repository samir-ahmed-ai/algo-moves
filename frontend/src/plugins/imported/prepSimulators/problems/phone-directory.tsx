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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result && <span className="ml-2 font-mono text-ink">{s.result}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>{entries.length} contact(s)</div>
      <div className="mt-1 space-y-1">
        {entries.map(([num, name]) => (
          <div
            key={num}
            className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}
          >
            {num} → {name}
          </div>
        ))}
      </div>
      {s.suggestions.length > 0 && (
        <div className={cn('mt-2', vizText.sm, 'text-good')}>
          suggest: {s.suggestions.join(', ')}
        </div>
      )}
    </div>
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
    prompt: 'Which approach fits "Phone directory"?',
    choices: [
      {
        label: 'Trie phone directory autocomplete — fits this problem',
        correct: true,
      },
      {
        label: 'Log parsing aggregation — different approach',
      },
      {
        label: 'Stack — different approach',
      },
      {
        label: 'Two Heaps — different approach',
      },
    ],
    explain: 'Map number->name plus a digit trie holding names for prefix suggestions',
  },
  {
    id: 'key-step',
    prompt: 'On the "ADD" step (→), what happens?',
    choices: [
      {
        label: 'addContact("", ""): store in map — this move caption',
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
    explain: 'addContact("", ""): store in map and append name along digit trie path.',
  },
  {
    id: 'state',
    prompt: 'What does the `contacts` field track in the visualization state?',
    choices: [
      {
        label: 'Field contacts in state — updated each frame',
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
      'The recorder snapshots `contacts` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Phone directory"?',
    choices: [
      {
        label: 'O(digits) time, O(contacts) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(lines) time, O(unique keys) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(digits). O(contacts). store contacts; each digit node keeps names; suggest returns node.names',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Done. — final DONE caption',
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
    explain: 'Done.',
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

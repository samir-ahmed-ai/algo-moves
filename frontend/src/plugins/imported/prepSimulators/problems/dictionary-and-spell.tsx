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

type DictOp = { kind: 'search'; word: string } | { kind: 'suggest'; prefix: string; limit: number };

interface DictInput {
  words: string[];
  ops: DictOp[];
}

interface DictState {
  words: string[];
  op: string;
  result: string;
  found: boolean | null;
  suggestions: string[];
  done: boolean;
}

interface TrieNode {
  children: Record<string, TrieNode>;
  word: boolean;
}

function buildTrie(words: string[]): TrieNode {
  const root: TrieNode = { children: {}, word: false };
  for (const w of words) {
    let node = root;
    for (const ch of w) {
      if (!node.children[ch]!) node.children[ch]! = { children: {}, word: false };
      node = node.children[ch]!;
    }
    node.word = true;
  }
  return root;
}

function search(root: TrieNode, word: string): boolean {
  let node = root;
  for (const ch of word) {
    if (!node.children[ch]!) return false;
    node = node.children[ch]!;
  }
  return node.word;
}

function suggest(root: TrieNode, prefix: string, limit: number): string[] {
  let node = root;
  for (const ch of prefix) {
    if (!node.children[ch]!) return [];
    node = node.children[ch]!;
  }
  const out: string[] = [];
  const dfs = (n: TrieNode, path: string) => {
    if (out.length >= limit) return;
    if (n.word) out.push(path);
    for (const [ch, child] of Object.entries(n.children)) dfs(child, path + ch);
  };
  dfs(node, prefix);
  return out;
}

function record({ words, ops }: DictInput): Frame<DictState>[] {
  const root = buildTrie(words);

  const { emit, frames } = createPrepRecorder<DictState>(() => ({
    words: [...words],
    op: '',
    result: '',
    found: null,
    suggestions: [],
    done: false,
  }));

  emit(
    'INIT',
    `${words.length} words`,
    `Dictionary & Spell: trie stores words. search() walks prefix; suggest(prefix, limit) DFS-collects words under prefix.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'search') {
      const found = search(root, o.word);
      emit(
        found ? 'HIT' : 'MISS',
        o.word,
        `search("${o.word}"): ${found ? 'found in trie' : 'not a complete word'}.`,
        { op: `search "${o.word}"`, found, result: found ? 'true' : 'false' },
        found ? 'good' : 'bad',
      );
    } else {
      const suggestions = suggest(root, o.prefix, o.limit);
      emit(
        'SUGGEST',
        suggestions.join(', '),
        `suggest("${o.prefix}", ${o.limit}): DFS from prefix node → [${suggestions.join(', ')}].`,
        { op: `suggest "${o.prefix}"`, suggestions, result: suggestions.join(', ') },
        'good',
      );
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<DictState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.found !== null && (
        <RailGroup label="result">
          <RailStat k="val" v={s.result} tone={s.found ? 'good' : 'bad'} />
        </RailGroup>
      )}
      <RailGroup label="dict">
        <RailStat k="words" v={s.words.length} />
      </RailGroup>
      {s.suggestions.length > 0 && <RailStack label="suggest" items={s.suggestions} />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
        {s.words.map((w) => (
          <span
            key={w}
            className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}
          >
            {w}
          </span>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DictState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="found" v={s.found === null ? '—' : s.found ? 'yes' : 'no'} />
      <InspectorRow k="suggestions" v={s.suggestions.length ? s.suggestions.join(', ') : '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-dictionary-and-spell';
export const title = 'Dictionary and Spell';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which structure stores the dictionary words?',
    choices: [
      {
        label: 'Prefix trie with word flags — char edges and terminal markers',
        correct: true,
      },
      {
        label: 'Sorted merged intervals — coverage queries on ranges',
      },
      {
        label: 'Message timestamp map — ten-second rate limit window',
      },
      {
        label: 'Index-value pair lists — merge-walk for dot product',
      },
    ],
    explain:
      'buildTrie inserts each word char-by-char; node.word marks complete dictionary entries.',
  },
  {
    id: 'key-step',
    prompt: 'On SUGGEST(prefix, limit), how are words collected?',
    choices: [
      {
        label: 'DFS from prefix node — gather words until limit reached',
        correct: true,
      },
      {
        label: 'Binary search sorted array — locate prefix by name only',
      },
      {
        label: 'Scan every map entry — filter strings starting with prefix',
      },
      {
        label: 'Pop stack operands — build expression subtree nodes',
      },
    ],
    explain:
      'After walking to the prefix node, DFS accumulates complete words up to the requested limit.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for Dictionary and Spell?',
    choices: [
      {
        label: 'O(word len) search, O(total chars) space — trie node storage',
        correct: true,
      },
      {
        label: 'O(1) all ops, O(words) space — flat hash of whole strings',
      },
      {
        label: 'O(n²) suggest, O(1) space — compare all pairs each call',
      },
      {
        label: 'O(log n) book, O(n) space — interval overlap scan only',
      },
    ],
    explain:
      'search walks one path; suggest DFS touches nodes under the prefix; trie size scales with characters.',
  },
  {
    id: 'edge',
    prompt: 'Why does search("ca") return false for dictionary {cat, car}?',
    choices: [
      {
        label: 'Prefix node lacks word flag — ca is not a complete word',
        correct: true,
      },
      {
        label: 'Trie missing ca branch — path not created during build',
      },
      {
        label: 'Limit zero on suggest — search shares suggest limit rules',
      },
      {
        label: 'Lowercase ca mismatch — case differs from stored CAT node',
      },
    ],
    explain:
      'Walking reaches the ca node, but search requires node.word true at the terminal character.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'dict1',
      label: 'cat,cats,car · search & suggest',
      value: {
        words: ['cat', 'cats', 'car', 'card'],
        ops: [
          { kind: 'search', word: 'cat' },
          { kind: 'search', word: 'ca' },
          { kind: 'suggest', prefix: 'ca', limit: 3 },
        ],
      },
    },
  ] satisfies SampleInput<DictInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DictState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};

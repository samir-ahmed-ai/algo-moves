import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type DictOp =
  | { kind: 'search'; word: string }
  | { kind: 'suggest'; prefix: string; limit: number };

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
      if (!node.children[ch]) node.children[ch] = { children: {}, word: false };
      node = node.children[ch];
    }
    node.word = true;
  }
  return root;
}

function search(root: TrieNode, word: string): boolean {
  let node = root;
  for (const ch of word) {
    if (!node.children[ch]) return false;
    node = node.children[ch];
  }
  return node.word;
}

function suggest(root: TrieNode, prefix: string, limit: number): string[] {
  let node = root;
  for (const ch of prefix) {
    if (!node.children[ch]) return [];
    node = node.children[ch];
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
  const frames: Frame<DictState>[] = [];
  const root = buildTrie(words);

  const emit = (type: string, note: string, caption: string, s: Partial<DictState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        words: [...words],
        op: '',
        result: '',
        found: null,
        suggestions: [],
        done: false,
        ...s,
      },
    });

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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.found !== null && (
          <span className={cn('ml-2 font-mono', s.found ? 'text-good' : 'text-bad')}>{s.result}</span>
        )}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>dictionary ({s.words.length} words)</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {s.words.map((w) => (
          <span key={w} className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}>
            {w}
          </span>
        ))}
      </div>
      {s.suggestions.length > 0 && (
        <div className={cn('mt-2', vizText.sm, 'text-good')}>suggestions: {s.suggestions.join(', ')}</div>
      )}
    </div>
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

export const simulator: ProblemSimulator = {
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

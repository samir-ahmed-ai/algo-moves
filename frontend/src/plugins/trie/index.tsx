import {
  definePlugin,
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../core/types';
import { NaryTreeBoard } from '../../components/board/NaryTreeBoard';
import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, badCases } from './cases';
import { quiz, codePieces } from './practice';
import { GraphInspector, GraphStatRow as InspectorRow } from '../_shared/graphInspector';
import { VizStage, RailGroup, RailStat, RailResult } from '../_shared/vizKit';

export interface TrieInput {
  insert: string[];
  search: string;
}

interface TrieNode {
  label: string;
  children: number[];
  isEnd: boolean;
}

export interface TrieState {
  nodes: TrieNode[];
  active: number | null;
  highlight: number | null;
  phase: 'insert' | 'search';
  word: string;
  pathOk: boolean;
  result: string;
}

function record({ insert, search }: TrieInput): Frame<TrieState>[] {
  const frames: Frame<TrieState>[] = [];
  const nodes: TrieNode[] = [{ label: '•', children: [], isEnd: false }];
  // Parallel char->child index map per node; not part of state.
  const childMap: Record<string, number>[] = [{}];

  const snapshot = (): TrieNode[] =>
    nodes.map((nd) => ({ label: nd.label, children: nd.children.slice(), isEnd: nd.isEnd }));

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    highlight: number | null,
    phase: 'insert' | 'search',
    word: string,
    pathOk: boolean,
    result: string,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { nodes: snapshot(), active, highlight, phase, word, pathOk, result },
    });

  emit(
    'INIT',
    'root',
    'Start with an empty trie holding only the root node.',
    0,
    null,
    'insert',
    '',
    true,
    '',
  );

  for (const word of insert) {
    let cur = 0;
    for (const ch of word) {
      const existing = childMap[cur][ch];
      if (existing !== undefined) {
        cur = existing;
        emit(
          'DOWN',
          ch,
          `Inserting "${word}": child '${ch}' already exists, so descend into it.`,
          cur,
          cur,
          'insert',
          word,
          true,
          '',
        );
      } else {
        const next = nodes.length;
        nodes.push({ label: ch, children: [], isEnd: false });
        childMap.push({});
        nodes[cur].children.push(next);
        childMap[cur][ch] = next;
        cur = next;
        emit(
          'ADD',
          ch,
          `Inserting "${word}": no child '${ch}', so create a new node for it.`,
          cur,
          cur,
          'insert',
          word,
          true,
          '',
        );
      }
    }
    nodes[cur].isEnd = true;
    emit(
      'MARK',
      word,
      `Mark the node for "${word}" as end-of-word.`,
      cur,
      null,
      'insert',
      word,
      true,
      '',
    );
  }

  let cur = 0;
  let ok = true;
  for (const ch of search) {
    const next = childMap[cur][ch];
    if (next === undefined) {
      ok = false;
      emit(
        'MISS',
        ch,
        `Searching "${search}": no child '${ch}' from here, so the word is absent.`,
        cur,
        null,
        'search',
        search,
        false,
        '',
      );
      break;
    }
    cur = next;
    emit(
      'MATCH',
      ch,
      `Searching "${search}": child '${ch}' found, so descend into it.`,
      cur,
      cur,
      'search',
      search,
      true,
      '',
    );
  }

  if (ok && nodes[cur].isEnd) {
    emit(
      'FOUND',
      search,
      `Reached an end-of-word node — "${search}" is in the trie.`,
      cur,
      null,
      'search',
      search,
      true,
      'found',
      'good',
    );
  } else {
    const why = ok ? 'the path exists but is not marked end-of-word' : 'the path is missing';
    emit(
      'ABSENT',
      search,
      `"${search}" is not in the trie (${why}).`,
      ok ? cur : null,
      null,
      'search',
      search,
      false,
      'absent',
      'good',
    );
  }

  return frames;
}

function View({ frame }: PluginViewProps<TrieState>) {
  const s = frame.state;
  const done = s.result !== '';
  return (
    <VizStage
      rail={
        <>
          <RailGroup label="scan">
            <RailStat k="phase" v={s.phase} />
            <RailStat k="word" v={s.word ? `"${s.word}"` : '∅'} tone="accent" />
            <RailStat k="nodes" v={s.nodes.length} />
          </RailGroup>
          {done && <RailResult label="result" value={s.result} tone={s.pathOk ? 'good' : 'bad'} />}
        </>
      }
    >
      <NaryTreeBoard
        nodes={s.nodes}
        nodeClass={(i) => (i === s.active ? 'team-1' : s.nodes[i].isEnd ? 'team-2' : 'team-0')}
        activeNode={s.active}
        highlightNode={s.highlight}
      />
    </VizStage>
  );
}

function Inspector({ frame, selectedNode }: InspectorProps<TrieState>) {
  return (
    <GraphInspector
      frame={frame}
      selectedNode={selectedNode}
      rows={(s) => (
        <>
          <InspectorRow k="phase" v={s.phase} />
          <InspectorRow k="word" v={s.word ? `"${s.word}"` : '∅'} />
          <InspectorRow k="nodes" v={s.nodes.length} />
          <InspectorRow k="result" v={s.result || '—'} />
        </>
      )}
    />
  );
}

const goSolution = `package main
type node struct {
	children map[rune]*node
	isEnd    bool
}

func newNode() *node {
	return &node{children: make(map[rune]*node)}
}

type Trie struct{ root *node }

func NewTrie() *Trie { return &Trie{root: newNode()} }

func (t *Trie) Insert(word string) {
	cur := t.root
	for _, ch := range word {
		next, ok := cur.children[ch]
		if !ok {
			next = newNode()
			cur.children[ch] = next
		}
		cur = next
	}
	cur.isEnd = true
}

func (t *Trie) Search(word string) bool {
	cur := t.root
	for _, ch := range word {
		next, ok := cur.children[ch]
		if !ok {
			return false
		}
		cur = next
	}
	return cur.isEnd
}
`;

const inputs: SampleInput<TrieInput>[] = [
  {
    id: 'cat-car',
    label: 'Insert cat/car/can/dog · search car',
    value: { insert: ['cat', 'car', 'can', 'dog'], search: 'car' },
  },
  {
    id: 'to-ten',
    label: 'Insert to/tea/ten/i/in · search ten',
    value: { insert: ['to', 'tea', 'ten', 'i', 'in'], search: 'ten' },
  },
];

const verdict = (frames: Frame<TrieState>[]) => {
  const last = frames[frames.length - 1];
  return { ok: true, label: last?.state.result || 'trie built' };
};

const casesIntro =
  'A trie stores words by their characters: each edge is one character and common prefixes share nodes. Search walks one child per character; the end-of-word flag is what separates a stored word from a mere prefix.';

const teaching = wireTeachingStack({
  record,
  View,
  inputs,
  verdict,
  simulateSide: true,
  practice: {
    quiz,
    codePieces,
    cases: { good: goodCases, bad: badCases, intro: casesIntro, badLabel: 'prefix traps' },
    simulateQuestion: 'Which trie edge or node is visited next?',
  },
});

export const triePlugin = definePlugin<TrieInput, TrieState>({
  meta: {
    id: 'trie',
    title: 'Trie (prefix tree)',
    difficulty: 'Medium',
    tags: ['tree', 'trie', 'string'],
    summary:
      'Insert several words into a prefix tree, then search one — walking and creating child nodes per character.',
    source: 'https://leetcode.com/problems/implement-trie-prefix-tree/',
  },
  inputs,
  record,
  View,
  Inspector,
  verdict,
  code: { text: goSolution, lang: 'go', file: 'solution.go' },
  codePieces,
  quiz,
  tabs: teaching.tabs,
  wires: teaching.wires,
  editable: [{ key: 'search', label: 'Search word', type: 'string' }],
});

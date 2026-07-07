import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { NaryTreeBoard, type NaryNode } from '../../../../components/board/NaryTreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LrsInput {
  str: string;
}

// A node in our suffix trie. `char` is the incoming edge letter ('' for root).
// `depth` = length of the substring spelled from the root to this node.
interface TrieNode {
  char: string;
  depth: number;
  parent: number; // index of parent node, -1 for root
  children: Record<string, number>; // letter -> child node index
  visits: number; // how many suffixes pass through this node
}

interface LrsState {
  str: string;
  nodes: TrieNode[]; // flat trie; node 0 is the root
  active: number | null; // node currently being visited/created
  matchedPath: number[]; // node indices on the path highlighted this frame
  branchNode: number | null; // deepest branching node found so far
  answer: string; // best repeated substring so far
  done: boolean;
}

function pathTo(nodes: TrieNode[], i: number): number[] {
  const out: number[] = [];
  let cur = i;
  while (cur !== -1) {
    out.push(cur);
    cur = nodes[cur].parent;
  }
  return out.reverse();
}

function labelOf(nodes: TrieNode[], i: number): string {
  // Substring spelled from root down to node i.
  return pathTo(nodes, i)
    .map((n) => nodes[n].char)
    .join('');
}

const SENTINEL = '$';

function record({ str }: LrsInput): Frame<LrsState>[] {
  const nodes: TrieNode[] = [{ char: '', depth: 0, parent: -1, children: {}, visits: 0 }];

  // Append a unique terminal sentinel so every suffix ends at a leaf. Then every
  // internal node (2+ children) spells a genuine repeated substring — this is
  // what makes the "deepest fork" rule agree with the suffix-array + LCP scan.
  const text = str + SENTINEL;

  let branchNode: number | null = null;
  let answer = '';

  const snapshot = (): TrieNode[] => nodes.map((n) => ({ ...n, children: { ...n.children } }));

  const { emit, frames } = createRecorder<LrsState>(() => ({
    str,
    nodes: snapshot(),
    active: null,
    matchedPath: [],
    branchNode,
    answer,
    done: false,
  }));

  emit(
    'INIT',
    `s="${str}"`,
    `Longest Repeated Substring: build a trie of every suffix of "${str}" (with a terminal '${SENTINEL}' so each suffix ends at its own leaf). A repeated substring is exactly a path shared by two or more suffixes — a trie node with 2+ children. The deepest such branching node spells the answer.`,
    { active: 0, matchedPath: [0] },
  );

  // Insert every suffix text[i:] into the trie (text = str + sentinel).
  for (let i = 0; i < text.length; i++) {
    const suffix = text.slice(i);
    emit(
      'SUFFIX',
      `insert "${suffix}"`,
      `Insert suffix #${i}: "${suffix}" (str[${i}:]). We walk down the trie from the root, following or creating one edge per letter.`,
      { active: 0, matchedPath: [0] },
    );

    let cur = 0;
    nodes[0].visits += 1;
    for (let k = 0; k < suffix.length; k++) {
      const ch = suffix[k];
      const existing = nodes[cur].children[ch];
      if (existing !== undefined) {
        cur = existing;
        nodes[cur].visits += 1;
        emit(
          'WALK',
          `follow '${ch}'`,
          `Edge '${ch}' already exists — reuse it. Reaching node "${labelOf(nodes, cur)}" a second time means this prefix is shared: it is a repeated substring candidate.`,
          { active: cur, matchedPath: pathTo(nodes, cur) },
        );
      } else {
        const idx = nodes.length;
        nodes.push({
          char: ch,
          depth: nodes[cur].depth + 1,
          parent: cur,
          children: {},
          visits: 1,
        });
        nodes[cur].children[ch] = idx;
        cur = idx;
        emit(
          'ADD',
          `add '${ch}'`,
          `No edge '${ch}' yet — create a new node for "${labelOf(nodes, cur)}". A brand-new branch means this exact prefix has not been seen before.`,
          { active: cur, matchedPath: pathTo(nodes, cur) },
        );
      }
    }
  }

  // Scan the trie: the deepest node with >= 2 children is the longest repeat.
  emit(
    'SCAN',
    'find deepest fork',
    `Trie is built. Now scan for the deepest node that has 2 or more children — a fork means two different suffixes diverge there, so the path to that fork is shared (repeated).`,
    { active: 0, matchedPath: [0] },
  );

  for (let i = 0; i < nodes.length; i++) {
    const kids = Object.keys(nodes[i].children).length;
    if (kids >= 2) {
      const label = labelOf(nodes, i);
      const isBetter = label.length > answer.length;
      emit(
        isBetter ? 'FORK' : 'FORK_SKIP',
        `"${label}" ×${kids}`,
        isBetter
          ? `Node "${label}" has ${kids} children (depth ${nodes[i].depth}) — it is a fork and longer than the current best "${answer || '∅'}". New longest repeat: "${label}".`
          : `Node "${label}" is also a fork (${kids} children) but is not longer than the current best "${answer}", so we keep the current answer.`,
        {
          active: i,
          matchedPath: pathTo(nodes, i),
          branchNode: isBetter ? i : branchNode,
          answer: isBetter ? label : answer,
        },
      );
      if (isBetter) {
        answer = label;
        branchNode = i;
      }
    }
  }

  emit(
    'DONE',
    answer ? `"${answer}"` : 'none',
    answer
      ? `The deepest fork spells "${answer}" — that is the longest substring that appears at least twice in "${str}".`
      : `No node has 2+ children, so no substring repeats in "${str}". The answer is the empty string.`,
    {
      active: branchNode,
      matchedPath: branchNode !== null ? pathTo(nodes, branchNode) : [0],
      done: true,
    },
    answer ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<LrsState>) {
  const s = frame.state;
  const naryNodes: NaryNode[] = s.nodes.map((n) => ({
    label: n.char === '' ? '·' : n.char,
    children: Object.keys(n.children)
      .sort()
      .map((ch) => n.children[ch]),
  }));
  const onPath = new Set(s.matchedPath);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (onPath.has(i)) return 'team-2';
    return 'team-0';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">{s.str}</span>
        {' · '}longest repeat ={' '}
        <span className="font-mono text-ink">{s.answer ? `"${s.answer}"` : '…'}</span>
      </div>
      <NaryTreeBoard
        nodes={naryNodes}
        nodeClass={nodeClass}
        activeNode={s.active}
        highlightNode={s.active}
      />
      <div className={cn(vizText.xs, 'text-ink3')}>
        each root→node path spells a substring; a node with 2+ children is a repeat
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono', s.answer ? 'text-good' : 'text-bad', vizText.base)}>
          → {s.answer ? `"${s.answer}"` : 'no repeat'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LrsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const activeLabel =
    s.active !== null && s.active >= 0 && s.active < s.nodes.length
      ? labelOf(s.nodes, s.active) || 'root'
      : '—';
  const activeKids =
    s.active !== null && s.active >= 0 && s.active < s.nodes.length
      ? Object.keys(s.nodes[s.active].children).length
      : 0;
  return (
    <VarGrid>
      <InspectorRow k="string" v={s.str} />
      <InspectorRow k="trie nodes" v={s.nodes.length} />
      <InspectorRow k="active node" v={activeLabel} />
      <InspectorRow k="children" v={activeKids} />
      <InspectorRow k="longest repeat" v={s.answer ? `"${s.answer}"` : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-tries-longest-repeated-substring';
export const title = 'Longest repeated substring';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Longest repeated substring"?',
    choices: [
      {
        label: 'Suffix array + LCP scan — fits this problem',
        correct: true,
      },
      {
        label: 'Suffix trie + palindrome check — different approach',
      },
      {
        label: 'Trie with 26-way branching — different approach',
      },
    ],
    explain: 'Sort all suffixes; the longest common prefix of an adjacent pair is the repeat',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Longest repeated substring), what strategy is established?',
    choices: [
      {
        label: 'Sort all suffixes; the longest common — described in INIT caption',
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
      'Longest Repeated Substring: build a trie of every suffix of "" (with a terminal \'\' so each suffix ends at its own leaf). A repeated substring is exactly a path shared by two or more suffixes — a trie node with 2+ children. The deepest such branching node spells the answer.',
  },
  {
    id: 'key-step',
    prompt: 'On the "WALK" step (follow \'\'), what happens?',
    choices: [
      {
        label: "Edge '' already exists — reuse — this move caption",
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
    explain:
      'Edge \'\' already exists — reuse it. Reaching node "" a second time means this prefix is shared: it is a repeated substring candidate.',
  },
  {
    id: 'state',
    prompt: 'What does the `nodes` field track in the visualization state?',
    choices: [
      {
        label: 'flat trie; node 0 — updated each frame',
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
    explain: 'The recorder keeps `nodes` in sync: flat trie; node 0 is the root',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Longest repeated substring"?',
    choices: [
      {
        label: 'O(s^2 log s) time, O(s) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(s) insert, O(s) search/prefix time — wrong order of growth',
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(s^2 log s). O(s). sort suffixes; take max lcp over adjacent pairs',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: "No edge '' yet — create — final DONE caption",
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
    explain:
      'No edge \'\' yet — create a new node for "". A brand-new branch means this exact prefix has not been seen before.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'lrs1', label: '"abab" → "ab"', value: { str: 'abab' } },
    { id: 'lrs2', label: '"banana" → "ana"', value: { str: 'banana' } },
  ] satisfies SampleInput<LrsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LrsState | undefined;
    return s?.answer ? { ok: true, label: `"${s.answer}"` } : { ok: false, label: 'no repeat' };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';
import { NaryTreeBoard, type NaryNode } from '../../../../components/NaryTreeBoard';

// A trie op we replay against the freshly built structure. `insert` grows the
// tree; `search`/`startsWith` only walk it, returning a boolean.
interface TrieOp {
  kind: 'insert' | 'search' | 'startsWith';
  word: string;
}

interface TrieInput {
  ops: TrieOp[];
}

// The trie stored as a flat node list so NaryTreeBoard can draw it. Node 0 is
// the root (empty label). `letter[i]` is the char on the incoming edge to node
// i, `isEnd[i]` flags a completed word. children maps a letter to a node index
// per node (Go's `children [26]*TrieNode`, but sparse here).
interface TrieState {
  labels: string[]; // per-node display label (root = "•")
  children: number[][]; // per-node child indices (drawing order)
  isEnd: boolean[]; // per-node end-of-word flag
  active: number | null; // node the cursor sits on right now
  edge: number | null; // node whose incoming edge we just walked / created
  matched: number[]; // node indices on the path the current op has confirmed
  op: string; // human-readable current operation, e.g. `search("app")`
  result: boolean | null; // boolean result of a completed search/startsWith
  done: boolean;
}

function record({ ops }: TrieInput): Frame<TrieState>[] {
  const frames: Frame<TrieState>[] = [];

  // Growing trie. Node 0 is the root. Each node has a 26-way child map keyed by
  // letter; we also keep a drawing-order children list for the board.
  const labels: string[] = ['•'];
  const drawKids: number[][] = [[]];
  const isEnd: boolean[] = [false];
  const childMap: Record<string, number>[] = [{}];

  const snapshot = (over: Partial<TrieState>): TrieState => ({
    labels: labels.slice(),
    children: drawKids.map((cs) => cs.slice()),
    isEnd: isEnd.slice(),
    active: null,
    edge: null,
    matched: [],
    op: '',
    result: null,
    done: false,
    ...over,
  });

  const emit = (
    type: string,
    note: string,
    caption: string,
    over: Partial<TrieState>,
    tone?: 'good' | 'bad',
  ) => frames.push({ move: { type, note, caption, tone }, state: snapshot(over) });

  emit(
    'INIT',
    `${ops.length} ops`,
    `Implement a trie (prefix tree). Every node has up to 26 children, one per lowercase letter; an isEnd flag marks where a full word ends. insert creates missing nodes, search walks then checks isEnd, startsWith only walks.`,
    { active: 0 },
  );

  const insert = (word: string) => {
    let node = 0;
    const path = [0];
    emit(
      'OP',
      `insert("${word}")`,
      `insert("${word}"): start at the root and descend one letter at a time, creating a child node whenever the branch is missing.`,
      { active: 0, matched: [0], op: `insert("${word}")` },
    );
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (childMap[node][ch] === undefined) {
        const created = labels.length;
        labels.push(ch);
        drawKids.push([]);
        isEnd.push(false);
        childMap.push({});
        childMap[node][ch] = created;
        drawKids[node].push(created);
        node = created;
        path.push(node);
        emit(
          'CREATE',
          `+'${ch}'`,
          `No '${ch}' edge existed under this node, so create a new node for '${ch}' and move onto it. This is why insert can add nodes.`,
          { active: node, edge: node, matched: path.slice(), op: `insert("${word}")` },
          'good',
        );
      } else {
        node = childMap[node][ch];
        path.push(node);
        emit(
          'WALK',
          `→'${ch}'`,
          `A '${ch}' edge already exists (shared prefix), so just walk onto the existing node — no new node needed.`,
          { active: node, edge: node, matched: path.slice(), op: `insert("${word}")` },
        );
      }
    }
    isEnd[node] = true;
    emit(
      'END',
      `isEnd("${word}")`,
      `Reached the last letter of "${word}". Mark this node isEnd = true so a later search knows a full word ends here.`,
      { active: node, matched: path.slice(), op: `insert("${word}")` },
      'good',
    );
  };

  const walk = (word: string): { node: number; path: number[]; fell: boolean } => {
    let node = 0;
    const path = [0];
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const next = childMap[node][ch];
      if (next === undefined) {
        return { node, path, fell: true };
      }
      node = next;
      path.push(node);
    }
    return { node, path, fell: false };
  };

  const runQuery = (kind: 'search' | 'startsWith', word: string) => {
    const label = `${kind}("${word}")`;
    let node = 0;
    const path = [0];
    emit(
      'OP',
      label,
      `${label}: walk the trie letter by letter from the root. ${
        kind === 'search'
          ? 'If any edge is missing, or the final node is not isEnd, the word is not present.'
          : 'We only need every letter to exist — isEnd does not matter for a prefix.'
      }`,
      { active: 0, matched: [0], op: label },
    );
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const next = childMap[node][ch];
      if (next === undefined) {
        emit(
          'MISS',
          `no '${ch}'`,
          `There is no '${ch}' edge under the current node, so the walk fails immediately. ${label} returns false.`,
          { active: node, matched: path.slice(), op: label, result: false, done: false },
          'bad',
        );
        return false;
      }
      node = next;
      path.push(node);
      emit(
        'WALK',
        `→'${ch}'`,
        `Matched '${ch}' — step onto its node and keep walking. The confirmed prefix so far is "${word.slice(0, i + 1)}".`,
        { active: node, edge: node, matched: path.slice(), op: label },
      );
    }
    if (kind === 'startsWith') {
      emit(
        'HIT',
        `true`,
        `Every letter of the prefix "${word}" exists in the trie, so startsWith returns true — regardless of whether this node is isEnd.`,
        { active: node, matched: path.slice(), op: label, result: true },
        'good',
      );
      return true;
    }
    const ok = isEnd[node];
    emit(
      ok ? 'HIT' : 'MISS',
      ok ? 'true' : 'not isEnd',
      ok
        ? `All letters matched and this node is isEnd = true, so "${word}" was inserted as a full word. search returns true.`
        : `All letters matched, but this node is isEnd = false — "${word}" is only a prefix of some word, not a full word. search returns false.`,
      { active: node, matched: path.slice(), op: label, result: ok },
      ok ? 'good' : 'bad',
    );
    return ok;
  };

  for (const op of ops) {
    if (op.kind === 'insert') insert(op.word);
    else runQuery(op.kind, op.word);
  }

  // Recompute the final op's result for the verdict/last frame.
  const lastOp = ops[ops.length - 1];
  let finalResult: boolean | null = null;
  let finalLabel = 'trie built';
  if (lastOp && lastOp.kind !== 'insert') {
    const w = walk(lastOp.word);
    finalResult = w.fell ? false : lastOp.kind === 'startsWith' ? true : isEnd[w.node];
    finalLabel = `${lastOp.kind}("${lastOp.word}") = ${finalResult}`;
  }

  emit(
    'DONE',
    finalLabel,
    `All operations complete. insert is O(s) time and space; search and startsWith are O(s) time and O(1) extra space, where s is the length of the word/prefix.`,
    { active: 0, result: finalResult, op: finalLabel, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<TrieState>) {
  const s = frame.state;
  const matchedSet = new Set(s.matched);
  const boardNodes: NaryNode[] = s.labels.map((label, i) => ({
    label: s.isEnd[i] ? `${label}•` : label,
    children: s.children[i],
  }));
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (matchedSet.has(i)) return 'team-2';
    return 'team-0';
  };
  const curLabel = s.active !== null ? (s.active === 0 ? 'root' : s.labels[s.active]) : '—';
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="call" v={s.op || '—'} />
        <RailStat k="nodes" v={s.labels.length} />
        <RailStat k="cursor" v={curLabel} tone="accent" />
        <RailStat k="path" v={s.matched.length ? s.matched.length - 1 : 0} />
      </RailGroup>
      {s.result !== null && (
        <RailResult label="result" value={String(s.result)} tone={s.result ? 'good' : 'bad'} />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <NaryTreeBoard
        nodes={boardNodes}
        nodeClass={nodeClass}
        activeNode={s.active}
        highlightNode={s.edge}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TrieState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.active;
  return (
    <VarGrid>
      <InspectorRow k="operation" v={s.op || '—'} />
      <InspectorRow k="nodes" v={s.labels.length} />
      <InspectorRow k="cursor node" v={cur !== null ? (cur === 0 ? 'root' : s.labels[cur]) : '—'} />
      <InspectorRow k="isEnd(cursor)" v={cur !== null ? String(s.isEnd[cur]) : '—'} />
      <InspectorRow k="path length" v={s.matched.length ? s.matched.length - 1 : 0} />
      <InspectorRow k="result" v={s.result !== null ? String(s.result) : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-tries-implement-trie-methods';
export const title = 'Implement trie methods';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'trie1',
      // Insert "app" and "apple" (shared prefix "app"), then query.
      // search("app") = true (isEnd set), search("ap") = false (prefix only),
      // startsWith("app") = true. Last op is startsWith → verdict true.
      label: 'app, apple · search/prefix',
      value: {
        ops: [
          { kind: 'insert', word: 'app' },
          { kind: 'insert', word: 'apple' },
          { kind: 'search', word: 'app' },
          { kind: 'search', word: 'ap' },
          { kind: 'startsWith', word: 'app' },
        ] satisfies TrieOp[],
      },
    },
    {
      id: 'trie2',
      // Insert "cat", then a failing search on a missing branch.
      // Last op search("car") walks c→a then misses 'r' → false.
      label: 'cat · miss on car',
      value: {
        ops: [
          { kind: 'insert', word: 'cat' },
          { kind: 'startsWith', word: 'ca' },
          { kind: 'search', word: 'car' },
        ] satisfies TrieOp[],
      },
    },
  ] satisfies SampleInput<TrieInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TrieState | undefined;
    if (!s || s.result === null) return { ok: true, label: 'trie built' };
    return { ok: s.result, label: String(s.result) };
  },
};

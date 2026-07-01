import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// Input is the tree itself, given in level-order with null holes (children of i
// are 2i+1, 2i+2). We serialize it with preorder DFS, then deserialize the
// resulting comma string back into the same shape — mirroring the Go Codec.
interface SerializeInput {
  tree: (number | null)[];
}

interface SerializeState {
  tree: (number | null)[];
  phase: 'serialize' | 'deserialize';
  current: number | null; // index in `tree` of the node under focus (null = a nil slot)
  visited: number[]; // indices already emitted / rebuilt
  tokens: string[]; // running serialized tokens ("null" for holes)
  built: number[]; // during deserialize: indices whose node has been constructed
  cursor: number | null; // during deserialize: token index being consumed
  done: boolean;
}

// Preorder DFS over the level-order array: emit token for i, recurse left, right.
function serializeTokens(tree: (number | null)[]): { tokens: string[]; order: (number | null)[] } {
  const tokens: string[] = [];
  const order: (number | null)[] = []; // index visited per token (null for a nil slot)
  const dfs = (i: number) => {
    if (i >= tree.length || tree[i] == null) {
      tokens.push('null');
      order.push(null);
      return;
    }
    tokens.push(String(tree[i]));
    order.push(i);
    dfs(2 * i + 1);
    dfs(2 * i + 2);
  };
  dfs(0);
  return { tokens, order };
}

function record({ tree }: SerializeInput): Frame<SerializeState>[] {
  const frames: Frame<SerializeState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<SerializeState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        phase: 'serialize',
        current: null,
        visited: [],
        tokens: [],
        built: [],
        cursor: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    'preorder DFS',
    `Serialize & Deserialize a binary tree. Serialize with a preorder DFS: write each node's value then a comma, and write "null" for a missing child. Deserialize replays the same preorder with a shared cursor. Both are O(n) time and space.`,
    {},
  );

  // ---- Phase 1: serialize ----
  const { tokens, order } = serializeTokens(tree);
  const soFar: string[] = [];
  const seen: number[] = [];
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    if (i == null) {
      soFar.push('null');
      emit(
        'NIL',
        'write null',
        `Preorder DFS hit an empty child. Write "null," so the shape is recoverable, then backtrack. Tokens: ${soFar.join(',')}`,
        { phase: 'serialize', current: null, visited: seen.slice(), tokens: soFar.slice() },
      );
    } else {
      soFar.push(String(tree[i]));
      seen.push(i);
      emit(
        'VISIT',
        `write ${tree[i]}`,
        `Visit node ${tree[i]} (preorder: node first, then left subtree, then right). Write "${tree[i]}," and recurse. Tokens: ${soFar.join(',')}`,
        { phase: 'serialize', current: i, visited: seen.slice(), tokens: soFar.slice() },
      );
    }
  }

  const serialized = tokens.join(',') + ',';
  emit(
    'SERIALIZED',
    'string ready',
    `Serialize done. The full string is "${serialized}" — every real node followed by its two children (or "null"). Now deserialize it back.`,
    { phase: 'serialize', current: null, visited: seen.slice(), tokens: tokens.slice() },
    'good',
  );

  // ---- Phase 2: deserialize ----
  // Replay preorder with a shared cursor, rebuilding node indices in `tree`.
  const built: number[] = [];
  let cursor = 0;
  const rebuild = (i: number): void => {
    const tok = tokens[cursor];
    if (tok === undefined || tok === 'null') {
      emit(
        'READ_NIL',
        `token "${tok ?? ''}"`,
        `Deserialize reads token "${tok ?? ''}" at cursor ${cursor}. It's null → this slot is empty, return nil and advance the cursor.`,
        { phase: 'deserialize', current: null, visited: built.slice(), built: built.slice(), cursor, tokens: tokens.slice() },
      );
      cursor++;
      return;
    }
    emit(
      'BUILD',
      `node ${tok}`,
      `Deserialize reads token "${tok}" at cursor ${cursor}. Construct node ${tok}, advance the cursor, then rebuild its left child, then its right child.`,
      { phase: 'deserialize', current: i, visited: built.slice(), built: built.slice(), cursor, tokens: tokens.slice() },
    );
    cursor++;
    built.push(i);
    rebuild(2 * i + 1);
    rebuild(2 * i + 2);
  };
  rebuild(0);

  const roundTrips = built.length === tokens.filter((t) => t !== 'null').length;
  emit(
    'DONE',
    roundTrips ? 'round-trip ok' : 'mismatch',
    `Deserialize done. Rebuilt ${built.length} node${built.length === 1 ? '' : 's'} in the same preorder — the reconstructed tree matches the original. Serialize + deserialize round-trip cleanly.`,
    { phase: 'deserialize', current: null, visited: built.slice(), built: built.slice(), cursor: null, tokens: tokens.slice(), done: true },
    roundTrips ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SerializeState>) {
  const s = frame.state;
  const active = s.phase === 'serialize' ? s.visited : s.built;
  const nodeClass = (i: number) =>
    s.current === i ? 'team-1' : active.includes(i) ? 'team-2' : 'team-0';
  const tokenStr = s.tokens.length ? s.tokens.join(',') + ',' : '·';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        phase = <span className="font-mono text-ink">{s.phase}</span>
        {s.cursor !== null && (
          <>
            {' · '}cursor ={' '}
            <span className="font-mono text-ink">{s.cursor}</span>
          </>
        )}
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
      <div className={cn('mt-1 break-all font-mono', vizText.sm, 'text-ink')}>{tokenStr}</div>
      <div className={cn(vizText.xs, 'text-ink3')}>
        {s.phase === 'serialize' ? 'writing tokens (preorder)' : 'reading tokens (preorder)'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SerializeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const active = s.phase === 'serialize' ? s.visited : s.built;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="current node" v={s.current !== null ? (s.tree[s.current] ?? '—') : '—'} />
      <InspectorRow k="nodes done" v={active.length} />
      <InspectorRow k="tokens" v={s.tokens.length} />
      <InspectorRow k="cursor" v={s.cursor ?? '—'} />
      <InspectorRow k="result" v={s.done ? 'round-trip ok' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-serialize-and-deserialize-binary-tree';
export const title = 'Serialize and Deserialize Binary Tree';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'sd1', label: '[1,2,3,null,null,4,5]', value: { tree: [1, 2, 3, null, null, 4, 5] } },
    { id: 'sd2', label: '[5,3,8,1,4]', value: { tree: [5, 3, 8, 1, 4] } },
  ] satisfies SampleInput<SerializeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SerializeState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const realNodes = s.tree.filter((v) => v != null).length;
    const rebuilt = s.built.length;
    return rebuilt === realNodes
      ? { ok: true, label: `round-trip ${rebuilt}/${realNodes} nodes` }
      : { ok: false, label: `mismatch ${rebuilt}/${realNodes}` };
  },
};

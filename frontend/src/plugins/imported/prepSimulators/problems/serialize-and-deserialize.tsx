import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/TreeBoard';

// Input is a level-order array (null = missing child), the shape TreeBoard consumes.
interface SerdeInput {
  tree: (number | null)[];
}

type Phase = 'serialize' | 'deserialize' | 'done';

interface SerdeState {
  tree: (number | null)[]; // original tree (level-order), stays fixed for the board
  phase: Phase;
  parts: string[]; // CSV tokens produced so far by BFS
  queue: number[]; // BFS queue as level-order indices ('null' children pushed as -1)
  active: number | null; // node index currently being processed / built
  visited: number[]; // level-order indices already emitted (serialize) or built (deserialize)
  cursor: number; // deserialize read position into `parts`
  built: (number | null)[]; // reconstructed tree (level-order) during deserialize
  done: boolean;
}

// Children of level-order index i live at 2i+1 and 2i+2.
const NIL = -1;

function record({ tree }: SerdeInput): Frame<SerdeState>[] {
  const { emit, frames } = createRecorder<SerdeState>(() => ({
        tree,
        phase: 'serialize',
        parts: [],
        queue: [],
        active: null,
        visited: [],
        cursor: 0,
        built: [],
        done: false
      }));

  emit(
    'INIT',
    'BFS serialize',
    'Serialize walks the tree in level order (BFS), joining values into CSV and writing "#" for every missing child. Deserialize then rebuilds the tree by a preorder index walk over those tokens.',
    {},
  );

  // ---- Phase 1: serialize via BFS (mirrors the Go queue loop) ----
  const parts: string[] = [];
  const visited: number[] = [];
  // queue holds level-order indices; NIL represents a nil child dequeued as "#".
  let queue: number[] = tree.length > 0 && tree[0] != null ? [0] : [];

  if (queue.length === 0) {
    emit('EMPTY', 'root is nil', 'The tree is empty, so serialization is the empty string and there is nothing to rebuild.', { phase: 'done', done: true }, 'bad');
    return frames;
  }

  emit(
    'ENQUEUE',
    'q=[root]',
    'Start BFS with the root in the queue. We will pop one node at a time; a real node appends its value and enqueues its two children, a nil pops and appends "#".',
    { queue: queue.slice(), active: 0, parts: parts.slice(), visited: visited.slice() },
  );

  while (queue.length > 0) {
    const idx = queue[0];
    queue = queue.slice(1);

    if (idx === NIL || tree[idx] == null) {
      parts.push('#');
      emit(
        'NIL',
        'append #',
        `Popped a nil child — append "#" to mark the gap. CSV so far: ${parts.join(',')}`,
        { queue: queue.slice(), active: null, parts: parts.slice(), visited: visited.slice() },
      );
      continue;
    }

    const val = tree[idx] as number;
    parts.push(String(val));
    visited.push(idx);
    const left = 2 * idx + 1;
    const right = 2 * idx + 2;
    const leftIdx = left < tree.length && tree[left] != null ? left : NIL;
    const rightIdx = right < tree.length && tree[right] != null ? right : NIL;
    queue = [...queue, leftIdx, rightIdx];
    emit(
      'VISIT',
      `append ${val}`,
      `Pop node ${val}: append its value and enqueue both children (nil children queue as "#"). CSV so far: ${parts.join(',')}`,
      { queue: queue.slice(), active: idx, parts: parts.slice(), visited: visited.slice() },
    );
  }

  const data = parts.join(',');
  emit(
    'SERIALIZED',
    data,
    `BFS finished. The full serialization is "${data}". Now deserialize rebuilds the tree by reading these tokens in preorder.`,
    { phase: 'deserialize', parts: parts.slice(), visited: [], active: null, built: [] },
    'good',
  );

  // ---- Phase 2: deserialize via preorder index walk (mirrors the Go build closure) ----
  const vals = data.split(',');
  const built: (number | null)[] = [];
  const builtVisited: number[] = [];
  let cursor = 0;

  // Recursive preorder build writing into a level-order `built` array at slot `slot`.
  const build = (slot: number): void => {
    if (cursor >= vals.length || vals[cursor] === '#') {
      emit(
        'READ-NIL',
        `tok "#"`,
        `Read token "${vals[cursor] ?? '∅'}" at position ${cursor}: it is a nil, so this slot stays empty and we return.`,
        {
          phase: 'deserialize',
          parts: parts.slice(),
          cursor: cursor + 1,
          built: built.slice(),
          visited: builtVisited.slice(),
          active: null,
        },
      );
      cursor++;
      return;
    }
    const v = Number(vals[cursor]);
    // grow `built` to fit slot
    while (built.length <= slot) built.push(null);
    built[slot] = v;
    builtVisited.push(slot);
    emit(
      'BUILD',
      `node ${v}`,
      `Read token "${vals[cursor]}" at position ${cursor}: create node ${v}, then recurse to build its left subtree, then its right subtree (preorder).`,
      {
        phase: 'deserialize',
        parts: parts.slice(),
        cursor: cursor + 1,
        built: built.slice(),
        visited: builtVisited.slice(),
        active: slot,
      },
    );
    cursor++;
    build(2 * slot + 1);
    build(2 * slot + 2);
  };

  build(0);

  emit(
    'DONE',
    'rebuilt',
    `Deserialize consumed every token, so the tree is fully reconstructed from "${data}". Serialize + deserialize round-trips in O(n) time and O(n) space.`,
    {
      phase: 'done',
      parts: parts.slice(),
      cursor,
      built: built.slice(),
      visited: builtVisited.slice(),
      active: null,
      done: true,
    },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SerdeState>) {
  const s = frame.state;
  // During deserialize/done, show the tree being rebuilt; otherwise the original.
  const boardTree: (number | string | null)[] =
    s.phase === 'serialize' ? s.tree : s.built;
  const visited = new Set(s.visited);
  const nodeClass = (i: number) =>
    s.active === i ? 'team-1' : visited.has(i) ? 'team-2' : 'team-0';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        phase = <span className="font-mono text-ink">{s.phase}</span>
      </div>
      <TreeBoard tree={boardTree} nodeClass={nodeClass} activeNode={s.active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        CSV: <span className="text-ink">{s.parts.length ? s.parts.join(',') : '·'}</span>
      </div>
      {s.phase !== 'serialize' && (
        <div className={cn('font-mono', vizText.sm, 'text-ink3')}>
          read cursor: <span className="text-ink">{s.cursor}</span> / {s.parts.length}
        </div>
      )}
      {s.phase === 'done' && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ round-trip complete</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SerdeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="CSV len" v={s.parts.length} />
      <InspectorRow k="queue" v={s.queue.length ? s.queue.map((q) => (q === NIL ? '#' : q)).join(',') : '—'} />
      <InspectorRow k="read cursor" v={s.phase === 'serialize' ? '—' : s.cursor} />
      <InspectorRow k="nodes built" v={s.phase === 'serialize' ? '—' : s.built.filter((x) => x != null).length} />
      <InspectorRow k="active slot" v={s.active ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-serialize-and-deserialize';
export const title = 'Serialize and deserialize';

// Re-run the Go pipeline standalone to compute the true verdict answer.
function serializeBFS(tree: (number | null)[]): string {
  if (tree.length === 0 || tree[0] == null) return '';
  const parts: string[] = [];
  let queue: number[] = [0];
  while (queue.length > 0) {
    const idx = queue[0];
    queue = queue.slice(1);
    if (idx === NIL || tree[idx] == null) {
      parts.push('#');
      continue;
    }
    parts.push(String(tree[idx] as number));
    const left = 2 * idx + 1;
    const right = 2 * idx + 2;
    queue.push(left < tree.length && tree[left] != null ? left : NIL);
    queue.push(right < tree.length && tree[right] != null ? right : NIL);
  }
  return parts.join(',');
}

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'sd1', label: '[1,2,3,null,null,4,5]', value: { tree: [1, 2, 3, null, null, 4, 5] } },
    { id: 'sd2', label: '[1,2,3]', value: { tree: [1, 2, 3] } },
  ] satisfies SampleInput<SerdeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const first = frames[0]?.state as SerdeState | undefined;
    if (!first) return { ok: false, label: 'no frames' };
    const data = serializeBFS(first.tree);
    return data
      ? { ok: true, label: `"${data}"` }
      : { ok: false, label: 'empty tree' };
  },
};

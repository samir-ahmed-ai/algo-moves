import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

/**
 * Each input node is described positionally: its value, the index of its Next
 * node (or null for end of list), and the index of its Random target (or null).
 * The list order in `nodes` is the Next-chain order, so node i links to i+1
 * unless `next` says otherwise — but we keep `next` explicit to stay faithful
 * to the Go pointer model.
 */
interface NodeSpec {
  val: number;
  next: number | null;
  random: number | null;
}

interface DeepCopyInput {
  nodes: NodeSpec[];
}

interface DeepCopyState {
  vals: number[]; // original node values, in chain order — the visible array
  next: (number | null)[]; // next index per node
  random: (number | null)[]; // random index per node
  cur: number | null; // node currently being cloned
  from: number | null; // node whose pointer we are following into `cur`
  link: 'next' | 'random' | null; // which pointer we are following
  cloned: boolean[]; // cloned[i] = original i already has a clone in `seen`
  seen: number[]; // indices currently stored in the clone cache (order of insertion)
  cacheHit: boolean; // this step returned an existing clone instead of building
  done: boolean;
}

function record({ nodes }: DeepCopyInput): Frame<DeepCopyState>[] {
  const frames: Frame<DeepCopyState>[] = [];
  const vals = nodes.map((n) => n.val);
  const next = nodes.map((n) => n.next);
  const random = nodes.map((n) => n.random);
  const cloned = new Array<boolean>(nodes.length).fill(false);
  const seenOrder: number[] = []; // insertion order of cache keys (original indices)
  const seen = new Map<number, number>(); // original index -> 1 (presence only)

  const label = (i: number | null) => (i === null ? 'nil' : `node ${i} (val ${vals[i]})`);

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<DeepCopyState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        vals,
        next,
        random,
        cur: null,
        from: null,
        link: null,
        cloned: cloned.slice(),
        seen: seenOrder.slice(),
        cacheHit: false,
        done: false,
        ...s,
      },
    });

  if (nodes.length === 0) {
    emit('DONE', 'empty', 'The list is empty (head is nil), so the deep copy is also nil. Nothing to clone.', { done: true }, 'good');
    return frames;
  }

  emit(
    'INIT',
    `${nodes.length} nodes`,
    `Deep copy a linked list whose nodes carry an extra Random pointer. We walk the structure recursively and keep a cache seen[original] = clone, so every original node is built exactly once and both its Next and Random links can point at the right clones. Time O(n), space O(n).`,
    {},
  );

  // clone(from, link, n): mirror of the Go recursion. `from`/`link` describe the
  // pointer being resolved so the View can highlight the edge being copied.
  const clone = (from: number | null, link: 'next' | 'random' | null, n: number | null): void => {
    if (n === null) {
      emit(
        'NIL',
        'nil',
        `Following the ${link ?? 'head'} pointer from ${label(from)} leads to nil. A nil pointer copies straight to nil — nothing to build here.`,
        { from, link, cur: null },
      );
      return;
    }

    if (seen.has(n)) {
      emit(
        'CACHE_HIT',
        `seen[${n}]`,
        `The ${link ?? 'head'} pointer from ${label(from)} reaches ${label(n)}, which is already in the cache. Return its existing clone instead of building a duplicate — this is what stops Random cycles from looping forever.`,
        { from, link, cur: n, cacheHit: true },
        'good',
      );
      return;
    }

    // Build the clone and cache it BEFORE recursing, exactly like the Go code.
    cloned[n] = true;
    seen.set(n, 1);
    seenOrder.push(n);
    emit(
      'CLONE',
      `clone ${n}`,
      `First time we reach ${label(n)}. Allocate a fresh clone with the same value (${vals[n]}) and store seen[${n}] = clone right away, before recursing — caching up front is what makes the Random pointers safe.`,
      { from, link, cur: n },
    );

    // c.Next = clone(n.Next)
    const nx = next[n];
    emit(
      'FOLLOW_NEXT',
      nx === null ? 'next nil' : `next → ${nx}`,
      `Now wire the clone's Next pointer: follow ${label(n)}'s Next, which goes to ${label(nx)}.`,
      { from: n, link: 'next', cur: n },
    );
    clone(n, 'next', nx);

    // c.Random = clone(n.Random)
    const rd = random[n];
    emit(
      'FOLLOW_RANDOM',
      rd === null ? 'random nil' : `random → ${rd}`,
      `Next wire the clone's Random pointer: follow ${label(n)}'s Random, which goes to ${label(rd)}.`,
      { from: n, link: 'random', cur: n },
    );
    clone(n, 'random', rd);
  };

  clone(null, null, 0);

  emit(
    'DONE',
    `${seenOrder.length} cloned`,
    `Every reachable node has been cloned once and both its Next and Random links rewired to point at clones — the cache holds ${seenOrder.length} entries. The deep copy is complete and fully independent of the original.`,
    { cur: 0, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DeepCopyState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.cur !== null) {
    pointers.push({ i: s.cur, label: s.cacheHit ? 'cached' : 'clone', tone: s.cacheHit ? 'good' : 'accent', place: 'above' });
  }
  if (s.from !== null && s.from !== s.cur) {
    pointers.push({ i: s.from, label: 'from', tone: 'warn', place: 'below' });
  }
  const tone = (i: number) => (s.cur === i ? 'match' : s.cloned[i] ? 'found' : '');

  const chain = s.vals.map((v, i) => `${v}${s.next[i] === null ? '' : ' →'}`).join(' ');
  const randomLine = s.random
    .map((r, i) => (r === null ? null : `${s.vals[i]}⤳${s.vals[r]}`))
    .filter((x): x is string => x !== null)
    .join('  ');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        cloned <span className="font-mono text-ink">{s.seen.length}</span> / {s.vals.length}
        {s.link && !s.done && (
          <>
            {' · '}following{' '}
            <span className="font-mono text-ink">{s.link}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.vals} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>next: {chain}</div>
      {randomLine && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>random: {randomLine}</div>
      )}
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        seen {'{'}
        {s.seen.map((i) => `${i}`).join(', ')}
        {'}'}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ deep copy of {s.vals.length} node(s)</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DeepCopyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const nodeLabel = (i: number | null) => (i === null ? 'nil' : `${i} (val ${s.vals[i]})`);
  return (
    <VarGrid>
      <InspectorRow k="nodes" v={s.vals.length} />
      <InspectorRow k="cur" v={nodeLabel(s.cur)} />
      <InspectorRow k="following" v={s.link ?? '—'} />
      <InspectorRow k="from" v={nodeLabel(s.from)} />
      <InspectorRow k="cache hit" v={s.cacheHit ? 'yes' : 'no'} />
      <InspectorRow k="seen size" v={s.seen.length} />
      <InspectorRow k="result" v={s.done ? `copy of ${s.vals.length}` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-deep-copy-random-pointers';
export const title = 'Deep copy random pointers';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'dc1',
      // 7 -> 13 -> 11 -> 10 -> 1, with random pointers forming a small web.
      label: '5 nodes w/ random web',
      value: {
        nodes: [
          { val: 7, next: 1, random: null },
          { val: 13, next: 2, random: 0 },
          { val: 11, next: 3, random: 4 },
          { val: 10, next: 4, random: 2 },
          { val: 1, next: null, random: 0 },
        ],
      },
    },
    {
      id: 'dc2',
      // 1 -> 2 -> 3, randoms point backward/self.
      label: '3 nodes, random→prev',
      value: {
        nodes: [
          { val: 1, next: 1, random: 1 },
          { val: 2, next: 2, random: 0 },
          { val: 3, next: null, random: 2 },
        ],
      },
    },
  ] satisfies SampleInput<DeepCopyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DeepCopyState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const total = s.vals.length;
    const clonedCount = s.cloned.filter(Boolean).length;
    const ok = s.done && clonedCount === total;
    return { ok, label: total === 0 ? 'nil' : `copied ${clonedCount}/${total}` };
  },
};

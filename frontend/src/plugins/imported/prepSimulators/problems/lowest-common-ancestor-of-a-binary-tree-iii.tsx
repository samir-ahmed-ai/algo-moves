import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LcaInput {
  // Binary tree in level-order form; null marks an absent slot.
  // Children of index i live at 2i+1 and 2i+2, its parent at (i-1)/2.
  // Each node carries a Parent pointer, so no root is passed to the algorithm.
  tree: (number | null)[];
  p: number; // node index of p
  q: number; // node index of q
}

interface LcaState {
  tree: (number | null)[];
  p: number; // start of pointer a
  q: number; // start of pointer b
  a: number | null; // pointer a position (index), null = walked off the top
  b: number | null; // pointer b position (index), null = walked off the top
  visitedA: number[]; // indices pointer a has stood on
  visitedB: number[]; // indices pointer b has stood on
  answer: number | null; // meeting index once found
  done: boolean;
}

const parentOf = (i: number): number | null => {
  if (i <= 0) return null;
  return (i - 1) >> 1;
};

function record({ tree, p, q }: LcaInput): Frame<LcaState>[] {  const visitedA: number[] = [];
  const visitedB: number[] = [];

  const valAt = (i: number | null) => (i !== null && tree[i] != null ? (tree[i] as number) : '·');

  const { emit, frames } = createRecorder<LcaState>(() => ({
        tree,
        p,
        q,
        a: null,
        b: null,
        visitedA: visitedA.slice(),
        visitedB: visitedB.slice(),
        answer: null,
        done: false
      }));

  let a: number | null = p;
  let b: number | null = q;
  visitedA.push(a);
  visitedB.push(b);

  emit(
    'INIT',
    `p=${valAt(p)} q=${valAt(q)}`,
    `LCA III uses only parent pointers (no root). Same trick as intersecting two linked lists: pointer a starts at p (${valAt(p)}), pointer b starts at q (${valAt(q)}). Each walks up to its parent; when one falls off the top it restarts at the other's start, so both travel the same total distance and meet at the LCA.`,
    { a, b },
  );

  let guard = 0;
  while (a !== b && guard < 64) {
    guard++;
    // Advance a.
    let aNext: number | null;
    if (a === null) {
      aNext = q;
      emit(
        'REDIRECT_A',
        `a → q=${valAt(q)}`,
        `Pointer a walked past the top (null), so redirect it to q's start (${valAt(q)}). This is what equalizes the two path lengths.`,
        { a, b },
      );
    } else {
      aNext = parentOf(a);
      emit(
        'UP_A',
        `a: ${valAt(a)} → ${valAt(aNext)}`,
        `Move pointer a up from ${valAt(a)} to its parent ${valAt(aNext)}.`,
        { a, b },
      );
    }
    a = aNext;
    if (a !== null) visitedA.push(a);

    // Advance b.
    let bNext: number | null;
    if (b === null) {
      bNext = p;
      emit(
        'REDIRECT_B',
        `b → p=${valAt(p)}`,
        `Pointer b walked past the top (null), so redirect it to p's start (${valAt(p)}). Now both pointers have queued up the same remaining distance.`,
        { a, b },
      );
    } else {
      bNext = parentOf(b);
      emit(
        'UP_B',
        `b: ${valAt(b)} → ${valAt(bNext)}`,
        `Move pointer b up from ${valAt(b)} to its parent ${valAt(bNext)}.`,
        { a, b },
      );
    }
    b = bNext;
    if (b !== null) visitedB.push(b);

    if (a === b) {
      if (a === null) {
        emit(
          'DONE',
          'no LCA',
          `Both pointers reached null together — the nodes are in different trees, so there is no common ancestor.`,
          { a, b, done: true },
          'bad',
        );
        return frames;
      }
      emit(
        'MEET',
        `LCA = ${valAt(a)}`,
        `The pointers landed on the same node ${valAt(a)} — that is the lowest common ancestor of ${valAt(p)} and ${valAt(q)}. Return it.`,
        { a, b, answer: a, done: true },
        'good',
      );
      return frames;
    }
  }

  // Already equal before the loop (p === q).
  emit(
    'MEET',
    `LCA = ${valAt(a)}`,
    `p and q are the same node, so the LCA is that node itself (${valAt(a)}).`,
    { a, b, answer: a, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LcaState>) {
  const s = frame.state;
  const setA = new Set(s.visitedA);
  const setB = new Set(s.visitedB);
  const nodeClass = (i: number) => {
    if (s.answer !== null && i === s.answer) return 'team-2';
    if (s.a === i || s.b === i) return 'team-1';
    if (setA.has(i) || setB.has(i)) return 'team-2';
    return 'team-0';
  };
  // Ring the meeting node when found, otherwise pointer a's node.
  const active = s.answer !== null ? s.answer : s.a;
  const valAt = (i: number | null) => (i !== null && s.tree[i] != null ? (s.tree[i] as number) : 'null');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        p = <span className="font-mono text-ink">{valAt(s.p)}</span>
        {' · '}q = <span className="font-mono text-ink">{valAt(s.q)}</span>
      </div>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={active} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        a @ <span className="text-ink">{valAt(s.a)}</span>
        {' · '}b @ <span className="text-ink">{valAt(s.b)}</span>
      </div>
      {s.answer !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ LCA = {valAt(s.answer)}</div>
      )}
      {s.done && s.answer === null && (
        <div className={cn('mt-1 font-mono text-bad', vizText.base)}>→ no common ancestor</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LcaState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const valAt = (i: number | null) => (i !== null && s.tree[i] != null ? (s.tree[i] as number) : 'null');
  return (
    <VarGrid>
      <InspectorRow k="p" v={valAt(s.p)} />
      <InspectorRow k="q" v={valAt(s.q)} />
      <InspectorRow k="a" v={valAt(s.a)} />
      <InspectorRow k="b" v={valAt(s.b)} />
      <InspectorRow k="a steps" v={Math.max(0, s.visitedA.length - 1)} />
      <InspectorRow k="b steps" v={Math.max(0, s.visitedB.length - 1)} />
      <InspectorRow k="LCA" v={s.answer !== null ? valAt(s.answer) : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-lowest-common-ancestor-of-a-binary-tree-iii';
export const title = 'Lowest Common Ancestor of a Binary Tree III';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'lca3-1',
      // Tree: [3,5,1,6,2,0,8,·,·,7,4]. p = node 7 (idx 9), q = node 8 (idx 6). LCA = 3.
      label: 'p=7, q=8 → 3',
      value: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 9, q: 6 },
    },
    {
      id: 'lca3-2',
      // Tree: [3,5,1,6,2,0,8,·,·,7,4]. p = node 6 (idx 3), q = node 4 (idx 10). LCA = 5.
      label: 'p=6, q=4 → 5',
      value: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 3, q: 10 },
    },
  ] satisfies SampleInput<LcaInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LcaState | undefined;
    if (!s || s.answer === null) return { ok: false, label: 'no LCA' };
    const v = s.tree[s.answer];
    return { ok: true, label: `LCA = ${v == null ? '?' : v}` };
  },
};

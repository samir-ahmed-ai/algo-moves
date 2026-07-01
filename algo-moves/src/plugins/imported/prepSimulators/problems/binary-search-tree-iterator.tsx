import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { InspectorRow, RailGroup, RailResult, RailStack, RailStat, VarGrid, VizEmpty, VizStage } from '../../../_shared/vizKit';
import { TreeBoard } from '../../../../components/TreeBoard';

interface BstInput {
  /** Level-order BST; null marks an absent child. Children of i are 2i+1, 2i+2. */
  tree: (number | null)[];
}

interface BstState {
  tree: (number | null)[];
  stack: number[]; // node indices on the controlled stack, bottom→top
  active: number | null; // node index being pushed / popped this step
  done: number[]; // node indices already yielded by Next()
  output: number[]; // yielded values, in call order
  hasNext: boolean;
  finished: boolean; // whole iteration complete
}

const L = (i: number) => 2 * i + 1;
const R = (i: number) => 2 * i + 2;

function record({ tree }: BstInput): Frame<BstState>[] {
  const frames: Frame<BstState>[] = [];
  const stack: number[] = [];
  const done: number[] = [];
  const output: number[] = [];

  const val = (i: number): number => tree[i] as number;
  const exists = (i: number): boolean => i >= 0 && i < tree.length && tree[i] != null;

  const emit = (
    type: string,
    note: string,
    caption: string,
    active: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        stack: stack.slice(),
        active,
        done: done.slice(),
        output: output.slice(),
        hasNext: stack.length > 0,
        finished: type === 'FINISHED',
      },
    });

  // pushLeft(node): push node and every left descendant, emitting a frame per push.
  const pushLeft = (start: number) => {
    let node = start;
    if (!exists(node)) {
      emit(
        'PUSH_NONE',
        'null spine',
        `pushLeft on an empty subtree: nothing to push. The left-spine walk stops immediately.`,
        null,
      );
      return;
    }
    while (exists(node)) {
      stack.push(node);
      emit(
        'PUSH',
        `push ${val(node)}`,
        `pushLeft: push node ${val(node)} onto the stack, then follow its LEFT child. This buries larger ancestors under their smaller left descendants so the smallest sits on top.`,
        node,
      );
      node = L(node);
    }
    emit(
      'SPINE_DONE',
      'left spine done',
      `Reached a null left child, so the left spine is fully on the stack. The stack top is now the next-smallest unvisited value.`,
      stack[stack.length - 1] ?? null,
    );
  };

  emit(
    'INIT',
    'build iterator',
    `BST Iterator: an in-order walk driven by an explicit stack of the left spine. Constructor calls pushLeft(root); each Next() pops the top, then pushLeft(top.Right).`,
    exists(0) ? 0 : null,
  );

  // Constructor: pushLeft(root)
  pushLeft(0);

  // Drive the iterator: HasNext() / Next() until the stack drains.
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    emit(
      'HASNEXT',
      'hasNext = true',
      `HasNext(): the stack is non-empty, so there is another value to yield. The top of the stack, ${val(top)}, is the next smallest.`,
      top,
    );
    // Next(): pop top
    stack.pop();
    done.push(top);
    output.push(val(top));
    emit(
      'NEXT',
      `yield ${val(top)}`,
      `Next(): pop ${val(top)} and emit it — the in-order sequence so far is [${output.join(', ')}]. Now open its RIGHT subtree.`,
      top,
      'good',
    );
    // pushLeft(top.Right)
    pushLeft(R(top));
  }

  emit(
    'FINISHED',
    `[${output.join(', ')}]`,
    `HasNext() is now false and the stack is empty. The iterator produced the full sorted order [${output.join(', ')}] using only O(h) stack space.`,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<BstState>) {
  const s = frame.state;
  const doneSet = new Set(s.done);
  const stackSet = new Set(s.stack);
  const nodeClass = (i: number) => {
    if (s.active === i) return 'team-1';
    if (doneSet.has(i)) return 'team-2';
    if (stackSet.has(i)) return 'team-1';
    return 'team-0';
  };
  const stackLabels = s.stack.map((i) => String(s.tree[i] as number));
  const outputLabels = s.output.map(String);
  const topVal = s.stack.length > 0 ? String(s.tree[s.stack[s.stack.length - 1]] as number) : '—';
  const rail = (
    <>
      <RailStack label="stack" items={stackLabels} topLabel="top" />
      <RailGroup label="state">
        <RailStat k="top" v={topVal} tone="accent" />
        <RailStat k="hasNext" v={s.hasNext ? 'true' : 'false'} />
      </RailGroup>
      <RailStack label="in-order" items={outputLabels} highlightEnd="bottom" />
      {s.finished && <RailResult label="result" value={`[${s.output.join(', ')}]`} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.active} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<BstState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const topVal =
    s.stack.length > 0 ? (s.tree[s.stack[s.stack.length - 1]] as number) : '—';
  return (
    <VarGrid>
      <InspectorRow k="stack depth" v={s.stack.length} />
      <InspectorRow k="stack top" v={topVal} />
      <InspectorRow k="hasNext" v={s.hasNext ? 'true' : 'false'} />
      <InspectorRow k="yielded" v={s.output.length} />
      <InspectorRow k="in-order" v={s.output.length ? `[${s.output.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-binary-search-tree-iterator';
export const title = 'Binary Search Tree Iterator';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'bsti1',
      label: 'BST [7,3,15,_,_,9,20]',
      value: { tree: [7, 3, 15, null, null, 9, 20] },
    },
    {
      id: 'bsti2',
      label: 'BST [4,2,6,1,3,5,7]',
      value: { tree: [4, 2, 6, 1, 3, 5, 7] },
    },
  ] satisfies SampleInput<BstInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BstState | undefined;
    const sorted = s ? [...s.output].sort((a, b) => a - b) : [];
    const ok = !!s && s.output.length > 0 && s.output.every((v, i) => v === sorted[i]);
    return { ok, label: s ? `[${s.output.join(', ')}]` : 'empty' };
  },
};

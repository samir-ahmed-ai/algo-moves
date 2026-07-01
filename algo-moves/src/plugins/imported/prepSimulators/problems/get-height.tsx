import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailStack, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

interface HeightInput {
  // Level-order array of the binary tree; null marks an absent slot.
  // Children of index i live at 2i+1 (left) and 2i+2 (right).
  tree: (number | null)[];
}

interface HeightState {
  tree: (number | null)[];
  current: number | null; // node index we are looking at right now
  visiting: number[]; // indices we have descended into (call stack)
  done: number[]; // indices whose height is fully computed
  heights: (number | null)[]; // heights[i] = computed height, aligned to tree
  answer: number | null; // final height once known
  finished: boolean;
}

function record({ tree }: HeightInput): Frame<HeightState>[] {
  const frames: Frame<HeightState>[] = [];
  const heights: (number | null)[] = tree.map(() => null);
  const visiting: number[] = [];
  const done: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    current: number | null,
    answer: number | null,
    finished: boolean,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        tree,
        current,
        visiting: visiting.slice(),
        done: done.slice(),
        heights: heights.slice(),
        answer,
        finished,
      },
    });

  const label = (i: number) => (tree[i] == null ? '·' : String(tree[i]));

  // Post-order height: nil -> 0; otherwise 1 + max(height(left), height(right)).
  const getHeight = (i: number): number => {
    if (i >= tree.length || tree[i] == null) {
      emit(
        'NIL',
        'nil → 0',
        `Reached an empty (nil) child, which contributes height 0. This is the base case that stops the recursion.`,
        null,
        null,
        false,
      );
      return 0;
    }

    visiting.push(i);
    emit(
      'ENTER',
      `visit ${label(i)}`,
      `Enter node ${label(i)}. Before we can size it we must first recurse into its left subtree, then its right subtree — this is the post-order shape.`,
      i,
      null,
      false,
    );

    const l = getHeight(2 * i + 1);
    emit(
      'LEFT',
      `L(${label(i)})=${l}`,
      `Left subtree of node ${label(i)} has height ${l}. Now measure its right subtree.`,
      i,
      null,
      false,
    );

    const r = getHeight(2 * i + 2);
    emit(
      'RIGHT',
      `R(${label(i)})=${r}`,
      `Right subtree of node ${label(i)} has height ${r}. Node ${label(i)} is 1 plus the taller child.`,
      i,
      null,
      false,
    );

    const h = (l > r ? l : r) + 1;
    heights[i] = h;
    visiting.pop();
    done.push(i);
    emit(
      'HEIGHT',
      `h(${label(i)})=${h}`,
      `height(${label(i)}) = 1 + max(L=${l}, R=${r}) = ${h}. This value bubbles back up to node ${label(i)}'s parent.`,
      i,
      null,
      false,
    );
    return h;
  };

  emit(
    'INIT',
    'get height',
    `Get Height computes how many levels the tree has. We recurse to the deepest leaves first (post-order): every nil returns 0, and each node returns 1 + the height of its taller child.`,
    tree.length > 0 ? 0 : null,
    null,
    false,
  );

  const answer = getHeight(0);

  emit(
    'DONE',
    `height = ${answer}`,
    `Every subtree has been measured. The root returns ${answer}, so the tree's height is ${answer}. Time O(n) — each node is visited once; Space O(h) for the recursion stack.`,
    tree.length > 0 ? 0 : null,
    answer,
    true,
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<HeightState>) {
  const s = frame.state;
  if (s.tree.length === 0) {
    return (
      <VizStage rail={<RailResult label="height" value={0} />}>
        <VizEmpty message="Empty tree — height 0." />
      </VizStage>
    );
  }
  const nodeClass = (i: number) => {
    if (s.done.includes(i)) return 'team-2';
    if (s.current === i || s.visiting.includes(i)) return 'team-1';
    return 'team-0';
  };
  const curLabel =
    s.current !== null && s.tree[s.current] != null ? String(s.tree[s.current]) : '—';
  const curHeight =
    s.current !== null && s.heights[s.current] != null ? String(s.heights[s.current]) : '…';
  const answerVal = s.answer !== null ? s.answer : s.finished ? 0 : '…';
  const callStack = s.visiting.map((i) =>
    s.tree[i] != null ? String(s.tree[i]) : '·',
  );
  const rail = (
    <>
      <RailStack label="call stack" items={callStack} />
      <RailGroup label="node">
        <RailStat k="val" v={curLabel} tone="accent" />
        <RailStat k="h" v={curHeight} />
        <RailStat k="done" v={s.done.length} />
      </RailGroup>
      <RailResult label="height" value={answerVal} tone={s.finished ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <TreeBoard tree={s.tree} nodeClass={nodeClass} activeNode={s.current} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<HeightState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curLabel =
    s.current !== null && s.tree[s.current] != null ? String(s.tree[s.current]) : '—';
  const curHeight =
    s.current !== null && s.heights[s.current] != null ? String(s.heights[s.current]) : '…';
  return (
    <VarGrid>
      <InspectorRow k="current node" v={curLabel} />
      <InspectorRow k="height(current)" v={curHeight} />
      <InspectorRow k="stack depth" v={s.visiting.length} />
      <InspectorRow k="nodes done" v={s.done.length} />
      <InspectorRow k="answer" v={s.answer !== null ? s.answer : s.finished ? 0 : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-get-height';
export const title = 'Get height';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'gh1', label: '[3,9,20,·,·,15,7]', value: { tree: [3, 9, 20, null, null, 15, 7] } },
    { id: 'gh2', label: '[1,2,3,4,·,·,·,8]', value: { tree: [1, 2, 3, 4, null, null, null, 8] } },
  ] satisfies SampleInput<HeightInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as HeightState | undefined;
    const h = s?.answer ?? 0;
    return { ok: true, label: `height ${h}` };
  },
};

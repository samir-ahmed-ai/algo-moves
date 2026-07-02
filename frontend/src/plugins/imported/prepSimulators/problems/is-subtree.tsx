import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { TreeBoard } from '../../../../components/TreeBoard';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// Level-order tree with `null` holes. Children of index i are 2i+1 and 2i+2.
type TreeArr = (number | null)[];

interface SubtreeInput {
  root: TreeArr;
  sub: TreeArr;
}

interface SubtreeState {
  root: TreeArr;
  sub: TreeArr;
  anchor: number | null; // root index we're currently testing sameTree from
  active: number | null; // root index highlighted by the ring this frame
  visited: number[]; // root indices already ruled out (no match anchored there)
  found: number | null; // anchor index where sub was found, or null
  done: boolean;
}

// --- faithful re-implementation of the Go solution over level-order arrays ---
// A "node" is an index into the level-order array that holds a non-null value.
const val = (t: TreeArr, i: number): number | null =>
  i >= 0 && i < t.length ? t[i] : null;
const has = (t: TreeArr, i: number): boolean => val(t, i) !== null;
const L = (i: number) => 2 * i + 1;
const R = (i: number) => 2 * i + 2;

function record({ root, sub }: SubtreeInput): Frame<SubtreeState>[] {  const visited: number[] = [];

  const { emit, frames } = createRecorder<SubtreeState>(() => ({
        root,
        sub,
        anchor: null,
        active: null,
        visited: [...visited],
        found: null,
        done: false
      }));

  // sameTree(a, b): does the root subtree anchored at index `a` equal the
  // pattern subtree anchored at index `b`? Emits a frame per comparison.
  const sameTree = (a: number, b: number, anchor: number): boolean => {
    const av = val(root, a);
    const bv = val(sub, b);
    if (av === null && bv === null) {
      emit(
        'MATCH_NULL',
        'both empty',
        `sameTree: both positions are empty here, so this branch matches. Return true.`,
        { anchor, active: a >= 0 && a < root.length && has(root, a) ? a : anchor },
        'good',
      );
      return true;
    }
    if (av === null || bv === null || av !== bv) {
      const why =
        av === null
          ? 'the root ran out of nodes'
          : bv === null
            ? 'the pattern ran out of nodes'
            : `values differ (${av} ≠ ${bv})`;
      emit(
        'MISMATCH',
        av === null || bv === null ? 'shape differs' : `${av}≠${bv}`,
        `sameTree: ${why}, so the subtree anchored here does NOT equal the pattern. Return false.`,
        { anchor, active: has(root, a) ? a : anchor },
        'bad',
      );
      return false;
    }
    emit(
      'COMPARE',
      `${av}==${bv}`,
      `sameTree: values line up (${av} = ${bv}). Recurse into left and right children to keep comparing.`,
      { anchor, active: a },
    );
    return sameTree(L(a), L(b), anchor) && sameTree(R(a), R(b), anchor);
  };

  // isSubtree(a): is `sub` a subtree of the root subtree anchored at index `a`?
  const isSubtree = (a: number): boolean => {
    if (!has(root, a)) {
      // root == nil  ->  answer is (sub == nil)
      const ok = sub.length === 0 || !has(sub, 0);
      emit(
        'EMPTY',
        ok ? 'both empty' : 'no anchor',
        ok
          ? `Reached an empty root spot and the pattern is also empty, so they trivially match here.`
          : `Reached an empty root spot but the pattern still has nodes, so nothing can match here. Back up.`,
        {},
        ok ? 'good' : undefined,
      );
      return ok;
    }

    emit(
      'ANCHOR',
      `try @${val(root, a)}`,
      `isSubtree: try to match the whole pattern starting at root node ${val(root, a)}. Run sameTree from here.`,
      { anchor: a, active: a },
    );

    if (sameTree(a, 0, a)) {
      emit(
        'FOUND',
        `found @${val(root, a)}`,
        `sameTree returned true — the pattern is rooted exactly at root node ${val(root, a)}. isSubtree is true.`,
        { anchor: a, active: a, found: a },
        'good',
      );
      return true;
    }

    // No match anchored here; mark it explored and recurse left, then right.
    visited.push(a);
    emit(
      'NEXT',
      `descend`,
      `No match anchored at ${val(root, a)}. Recurse into its children (left first, then right) to keep searching.`,
      { anchor: a, active: a },
    );

    if (isSubtree(L(a))) return true;
    return isSubtree(R(a));
  };

  emit(
    'INIT',
    'is subtree?',
    `Is Subtree: does the small pattern tree appear as a full subtree of the big tree? At each root node we run sameTree(node, patternRoot); if any node matches, the answer is yes. Time O(n), Space O(h).`,
    {},
  );

  const answer = isSubtree(0);
  const foundAt = frames.reduce<number | null>(
    (acc, f) => (f.state.found !== null ? f.state.found : acc),
    null,
  );

  emit(
    'DONE',
    answer ? 'yes' : 'no',
    answer
      ? `Done. The pattern is a subtree of the big tree${foundAt !== null ? ` (anchored at node ${val(root, foundAt)})` : ''}. Answer: true.`
      : `Done. No root node produced a full match, so the pattern is not a subtree. Answer: false.`,
    { found: foundAt, done: true },
    answer ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SubtreeState>) {
  const s = frame.state;
  const foundNode = s.found;
  const nodeClass = (i: number) => {
    if (foundNode !== null && i === foundNode) return 'team-2';
    if (s.active === i || s.anchor === i) return 'team-1';
    if (s.visited.includes(i)) return 'team-2';
    return 'team-0';
  };
  const answer = s.done ? (s.found !== null ? 'yes' : 'no') : '…';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        pattern is subtree? <span className="font-mono text-ink">{answer}</span>
        {s.anchor !== null && !s.done && (
          <>
            {' · '}anchor ={' '}
            <span className="font-mono text-ink">{s.root[s.anchor] ?? '—'}</span>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div>
          <div className={cn('mb-1 font-mono', vizText.xs, 'text-ink3')}>big tree</div>
          <TreeBoard tree={s.root} nodeClass={nodeClass} activeNode={s.active} />
        </div>
        <div>
          <div className={cn('mb-1 font-mono', vizText.xs, 'text-ink3')}>pattern</div>
          <TreeBoard tree={s.sub} nodeClass={() => 'team-1'} activeNode={null} />
        </div>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SubtreeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="anchor node" v={s.anchor !== null ? (s.root[s.anchor] ?? '—') : '—'} />
      <InspectorRow k="pattern root" v={s.sub.length ? (s.sub[0] ?? '—') : '—'} />
      <InspectorRow k="ruled out" v={s.visited.length} />
      <InspectorRow
        k="found at"
        v={s.found !== null ? (s.root[s.found] ?? '—') : s.done ? 'none' : '…'}
      />
      <InspectorRow k="answer" v={s.done ? (s.found !== null ? 'true' : 'false') : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-trees-is-subtree';
export const title = 'Is subtree';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'sub-yes',
      label: '[3,4,5,1,2] ⊇ [4,1,2]',
      value: { root: [3, 4, 5, 1, 2], sub: [4, 1, 2] },
    },
    {
      id: 'sub-no',
      label: '[3,4,5,1,2,null,null,0] ⊉ [4,1,2]',
      value: { root: [3, 4, 5, 1, 2, null, null, 0], sub: [4, 1, 2] },
    },
  ] satisfies SampleInput<SubtreeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SubtreeState | undefined;
    const ok = !!s && s.found !== null;
    return { ok, label: ok ? 'is subtree' : 'not a subtree' };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MergeInput {
  l1: number[];
  l2: number[];
}

interface MergeState {
  l1: number[]; // original list 1 values (left→right chain)
  l2: number[]; // original list 2 values (left→right chain)
  i: number | null; // head pointer into l1 (index of l1 node still to attach), null when exhausted
  j: number | null; // head pointer into l2, null when exhausted
  merged: number[]; // values attached to the result chain so far (after the dummy)
  from: 'l1' | 'l2' | null; // which list the most recent attach came from
  done: boolean;
}

function record({ l1, l2 }: MergeInput): Frame<MergeState>[] {
  const frames: Frame<MergeState>[] = [];
  const merged: number[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    i: number | null,
    j: number | null,
    from: 'l1' | 'l2' | null,
    done: boolean,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { l1, l2, i, j, merged: merged.slice(), from, done },
    });

  let i = 0;
  let j = 0;
  const headI = () => (i < l1.length ? i : null);
  const headJ = () => (j < l2.length ? j : null);

  emit(
    'INIT',
    `n=${l1.length + l2.length}`,
    `Merge two sorted lists: zip them into one sorted chain. We keep a dummy head and a cur pointer, then repeatedly attach the smaller of the two current heads. List 1 = [${l1.join(', ')}], list 2 = [${l2.join(', ')}].`,
    headI(),
    headJ(),
    null,
    false,
  );

  while (i < l1.length && j < l2.length) {
    emit(
      'COMPARE',
      `${l1[i]} vs ${l2[j]}`,
      `Both lists still have nodes. Compare the two heads: l1 = ${l1[i]} and l2 = ${l2[j]}. The Go code attaches l1 only when l1.Val < l2.Val, so ties go to l2.`,
      headI(),
      headJ(),
      null,
      false,
    );
    if (l1[i] < l2[j]) {
      merged.push(l1[i]);
      i += 1;
      emit(
        'ATTACH_L1',
        `take ${merged[merged.length - 1]}`,
        `${merged[merged.length - 1]} (from l1) is smaller, so attach it to the result and advance l1's head. cur now sits on the node we just appended.`,
        headI(),
        headJ(),
        'l1',
        false,
      );
    } else {
      merged.push(l2[j]);
      j += 1;
      emit(
        'ATTACH_L2',
        `take ${merged[merged.length - 1]}`,
        `l2's head (${merged[merged.length - 1]}) is smaller or equal, so attach it and advance l2's head. cur moves to the appended node.`,
        headI(),
        headJ(),
        'l2',
        false,
      );
    }
  }

  if (i < l1.length) {
    const rest = l1.slice(i);
    for (; i < l1.length; i += 1) merged.push(l1[i]);
    emit(
      'APPEND_REST',
      `+[${rest.join(',')}] from l1`,
      `l2 is exhausted, so the remaining l1 tail [${rest.join(', ')}] is already sorted and larger than everything attached. Splice it on in one move (O(1)).`,
      null,
      null,
      'l1',
      false,
    );
  } else if (j < l2.length) {
    const rest = l2.slice(j);
    for (; j < l2.length; j += 1) merged.push(l2[j]);
    emit(
      'APPEND_REST',
      `+[${rest.join(',')}] from l2`,
      `l1 is exhausted, so the remaining l2 tail [${rest.join(', ')}] is already sorted and larger than everything attached. Splice it on in one move (O(1)).`,
      null,
      null,
      'l2',
      false,
    );
  }

  emit(
    'DONE',
    `[${merged.join(',')}]`,
    `One list ran out, so the merge is complete. Return dummy.Next — the fully merged sorted chain [${merged.join(', ')}].`,
    null,
    null,
    null,
    true,
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MergeState>) {
  const s = frame.state;

  const l1Pointers: ArrayPointer[] = [];
  if (s.i !== null) l1Pointers.push({ i: s.i, label: 'l1', tone: 'accent', place: 'above' });
  const l2Pointers: ArrayPointer[] = [];
  if (s.j !== null) l2Pointers.push({ i: s.j, label: 'l2', tone: 'warn', place: 'above' });

  const l1Tone = (idx: number) =>
    s.i !== null && idx === s.i ? 'match' : s.i !== null && idx < s.i ? 'dead' : s.i === null ? 'dead' : '';
  const l2Tone = (idx: number) =>
    s.j !== null && idx === s.j ? 'match' : s.j !== null && idx < s.j ? 'dead' : s.j === null ? 'dead' : '';
  const mergedTone = (idx: number) =>
    s.done ? 'found' : idx === s.merged.length - 1 ? 'match' : 'match';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        attach the smaller head each step, then append the leftover tail
      </div>

      <div className={cn(vizText.xs, 'mt-1 text-ink3')}>list 1</div>
      <ArrayRow values={s.l1} cellTone={l1Tone} pointers={l1Pointers} windowRange={null} />

      <div className={cn(vizText.xs, 'mt-1 text-ink3')}>list 2</div>
      <ArrayRow values={s.l2} cellTone={l2Tone} pointers={l2Pointers} windowRange={null} />

      <div className={cn(vizText.xs, 'mt-2 text-ink3')}>
        merged (dummy →{s.merged.length ? '' : ' …'})
      </div>
      {s.merged.length > 0 ? (
        <ArrayRow values={s.merged} cellTone={mergedTone} pointers={[]} windowRange={null} />
      ) : (
        <div className={cn('font-mono', vizText.sm, 'text-ink3')}>dummy → ·</div>
      )}

      <div className={cn('mt-1 font-mono', vizText.sm, s.done ? 'text-good' : 'text-ink3')}>
        → [{s.merged.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MergeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const headVal = (vals: number[], idx: number | null) =>
    idx !== null && idx >= 0 && idx < vals.length ? vals[idx] : 'nil';
  return (
    <VarGrid>
      <InspectorRow k="l1 head" v={headVal(s.l1, s.i)} />
      <InspectorRow k="l2 head" v={headVal(s.l2, s.j)} />
      <InspectorRow k="last attached" v={s.from ?? '—'} />
      <InspectorRow k="merged length" v={s.merged.length} />
      <InspectorRow k="merged" v={s.merged.length ? `[${s.merged.join(', ')}]` : '[]'} />
      <InspectorRow k="status" v={s.done ? 'done' : 'merging'} />
    </VarGrid>
  );
}

function isSorted(a: number[]): boolean {
  for (let k = 1; k < a.length; k += 1) if (a[k] < a[k - 1]) return false;
  return true;
}

export const manifestId = 'prep-linked-lists-merge-two-sorted-lists';
export const title = 'Merge two sorted lists';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'm1', label: '[1,2,4] + [1,3,4]', value: { l1: [1, 2, 4], l2: [1, 3, 4] } },
    { id: 'm2', label: '[1,3,5,7] + [2,4]', value: { l1: [1, 3, 5, 7], l2: [2, 4] } },
  ] satisfies SampleInput<MergeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MergeState | undefined;
    const merged = s?.merged ?? [];
    const ok = merged.length > 0 && isSorted(merged);
    return { ok, label: `[${merged.join(',')}]` };
  },
};

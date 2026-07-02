import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ReverseInput {
  values: number[];
}

interface ReverseState {
  values: number[]; // node values, fixed positions left→right (original order)
  // next[i] = index of the node that node i currently points to, or null for nil.
  next: (number | null)[];
  prev: number | null; // index of the node `prev` points at (null = nil)
  head: number | null; // index of the node `head`/cur points at (null = nil)
  nextSaved: number | null; // index saved in `next := head.Next`
  resultHead: number | null; // index of the reversed list's head, once done
  done: boolean;
}

function record({ values }: ReverseInput): Frame<ReverseState>[] {  const n = values.length;
  // Original forward links: node i → node i+1, last → nil.
  const next: (number | null)[] = values.map((_, i) => (i + 1 < n ? i + 1 : null));

  let prev: number | null = null;
  let head: number | null = n > 0 ? 0 : null;

  const { emit, frames } = createRecorder<ReverseState>(() => ({
        values,
        next: next.slice(),
        prev,
        head,
        nextSaved: null,
        resultHead: null,
        done: false
      }));

  const name = (i: number | null) => (i === null ? 'nil' : `${values[i]}`);

  emit(
    'INIT',
    `prev=nil`,
    `Reverse a singly linked list in place. We walk it once with three pointers: prev starts at nil, head (cur) starts at the first node, and next is a scratch pointer. Each step flips one node's link to point backward.`,
    {},
  );

  while (head !== null) {
    const saved = next[head];
    emit(
      'SAVE',
      `next=${name(saved)}`,
      `Before we cut head's link, remember where it points: next = head.Next = ${name(saved)}. Losing this would orphan the rest of the list.`,
      { nextSaved: saved },
    );

    next[head] = prev;
    emit(
      'FLIP',
      `${name(head)}→${name(prev)}`,
      `Flip the link: head.Next = prev, so node ${name(head)} now points back at ${name(prev)} instead of forward. This is the actual reversal.`,
      { nextSaved: saved },
    );

    prev = head;
    emit(
      'ADVANCE-PREV',
      `prev=${name(prev)}`,
      `Advance prev to head: prev = ${name(prev)}. The reversed portion now ends (its head) at node ${name(prev)}.`,
      { nextSaved: saved },
    );

    head = saved;
    emit(
      'ADVANCE-HEAD',
      `head=${name(head)}`,
      `Advance head to the saved next: head = ${name(head)}. ${head === null ? 'head is nil, so the loop ends.' : `We will process node ${name(head)} next.`}`,
      { nextSaved: null },
    );
  }

  emit(
    'DONE',
    `head=${name(prev)}`,
    `head reached nil, so the walk is complete. prev now points at the old tail, which is the new head of the reversed list. Return prev. Time O(n), Space O(1).`,
    { resultHead: prev, done: true },
    'good',
  );

  return frames;
}

// Build the value sequence following `next` from a head index.
function chainFrom(head: number | null, values: number[], next: (number | null)[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  let cur = head;
  while (cur !== null && !seen.has(cur)) {
    seen.add(cur);
    out.push(values[cur]);
    cur = next[cur];
  }
  return out;
}

function View({ frame }: PluginViewProps<ReverseState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.prev !== null) pointers.push({ i: s.prev, label: 'prev', tone: 'good', place: 'below' });
  if (s.head !== null) pointers.push({ i: s.head, label: 'head', tone: 'accent', place: 'above' });
  if (s.nextSaved !== null) pointers.push({ i: s.nextSaved, label: 'next', tone: 'warn', place: 'above' });

  const tone = (i: number) => {
    if (s.done && s.resultHead !== null) return 'found';
    if (i === s.head) return 'match';
    if (i === s.prev) return 'in-window';
    return '';
  };

  // Live chain following the current `next` links, starting from the reversed
  // head if we are done, else from `prev` (reversed portion already built).
  const startHead = s.done ? s.resultHead : s.prev;
  const reversedSoFar = chainFrom(startHead, s.values, s.next);

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        prev = <span className="font-mono text-ink">{s.prev === null ? 'nil' : s.values[s.prev]}</span>
        {' · '}head = <span className="font-mono text-ink">{s.head === null ? 'nil' : s.values[s.head]}</span>
        {s.nextSaved !== null && (
          <>
            {' · '}next = <span className="font-mono text-ink">{s.values[s.nextSaved]}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.done ? 'reversed:' : 'reversed so far:'}{' '}
        <span className="text-ink">
          {reversedSoFar.length ? reversedSoFar.join(' → ') : 'nil'} → nil
        </span>
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → new head = {s.resultHead === null ? 'nil' : s.values[s.resultHead]}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ReverseState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const valOf = (i: number | null) => (i === null ? 'nil' : `${s.values[i]}`);
  return (
    <VarGrid>
      <InspectorRow k="n (length)" v={s.values.length} />
      <InspectorRow k="prev" v={valOf(s.prev)} />
      <InspectorRow k="head (cur)" v={valOf(s.head)} />
      <InspectorRow k="next (saved)" v={valOf(s.nextSaved)} />
      <InspectorRow k="new head" v={s.done ? valOf(s.resultHead) : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-reverse-linked-list';
export const title = 'Reverse linked list';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'rl1', label: '1 → 2 → 3 → 4 → 5', value: { values: [1, 2, 3, 4, 5] } },
    { id: 'rl2', label: '7 → 8 → 9', value: { values: [7, 8, 9] } },
  ] satisfies SampleInput<ReverseInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ReverseState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const reversed = chainFrom(s.resultHead, s.values, s.next);
    const expected = [...s.values].reverse();
    const ok = reversed.length === expected.length && reversed.every((v, i) => v === expected[i]);
    return { ok, label: reversed.length ? reversed.join(' → ') : 'nil' };
  },
};

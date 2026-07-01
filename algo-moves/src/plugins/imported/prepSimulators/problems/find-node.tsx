import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FindNodeInput {
  list: number[];
  val: number;
}

interface FindNodeState {
  list: number[];
  val: number;
  head: number | null; // index of the node `head` currently points at; null = past the end
  found: number | null; // index where the value matched
  done: boolean;
}

function record({ list, val }: FindNodeInput): Frame<FindNodeState>[] {
  const frames: Frame<FindNodeState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<FindNodeState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { list, val, head: null, found: null, done: false, ...s },
    });

  emit(
    'INIT',
    `val=${val}`,
    `Find node: walk the linked list from the head, one node at a time, and return the first node whose value equals ${val}. A single linear scan — O(n) time, O(1) space.`,
    { head: list.length > 0 ? 0 : null },
  );

  for (let head = 0; head < list.length; head++) {
    const v = list[head];
    emit(
      'VISIT',
      `node[${head}]=${v}`,
      `head points at the node holding ${v}. Compare its value to the target: is ${v} == ${val}?`,
      { head },
    );

    if (v === val) {
      emit(
        'FOUND',
        `match @${head}`,
        `Match — the node at position ${head} holds ${v}, which equals ${val}. Return this node.`,
        { head, found: head, done: true },
        'good',
      );
      return frames;
    }

    emit(
      'ADVANCE',
      `head = head.Next`,
      `${v} != ${val}, so this is not the node. Advance: head = head.Next, moving on to the next link in the chain.`,
      { head },
    );
  }

  emit(
    'DONE',
    'nil',
    `head walked off the end of the list (head == nil) without finding ${val}. No matching node exists, so return nil.`,
    { head: null, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FindNodeState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.head !== null) pointers.push({ i: s.head, label: 'head', tone: 'accent', place: 'above' });
  if (s.found !== null) pointers.push({ i: s.found, label: 'found', tone: 'good', place: 'below' });

  const tone = (i: number) => (s.found === i ? 'found' : s.head === i ? 'match' : '');
  const chain = s.list.map((v) => String(v)).join(' → ');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        target val = <span className="font-mono text-ink">{s.val}</span>
      </div>
      <ArrayRow values={s.list} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {chain || '∅'} → nil
      </div>
      {s.done && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.found !== null ? 'text-good' : 'text-bad',
          )}
        >
          → {s.found !== null ? `node[${s.found}] = ${s.list[s.found]}` : 'nil'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FindNodeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="val (target)" v={s.val} />
      <InspectorRow k="head (index)" v={s.head ?? 'nil'} />
      <InspectorRow k="head.Val" v={s.head !== null ? s.list[s.head] : '—'} />
      <InspectorRow
        k="result"
        v={s.found !== null ? `node[${s.found}]` : s.done ? 'nil' : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-find-node';
export const title = 'Find node';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'fn1', label: '[3,1,4,1,5] find 4', value: { list: [3, 1, 4, 1, 5], val: 4 } },
    { id: 'fn2', label: '[2,7,8] find 9', value: { list: [2, 7, 8], val: 9 } },
  ] satisfies SampleInput<FindNodeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FindNodeState | undefined;
    return s && s.found !== null
      ? { ok: true, label: `node[${s.found}] = ${s.list[s.found]}` }
      : { ok: false, label: 'nil' };
  },
};

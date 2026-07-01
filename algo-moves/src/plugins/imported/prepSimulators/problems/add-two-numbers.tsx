import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface AddTwoInput {
  // Digits are stored least-significant-first, exactly like the linked lists
  // in the Go solution (number 342 -> [2,4,3]).
  l1: number[];
  l2: number[];
}

interface AddTwoState {
  l1: number[];
  l2: number[];
  pos: number | null; // current digit position being added
  carry: number; // carry going INTO this position
  sum: number | null; // carry + d1 + d2 at this position
  digit: number | null; // sum % 10, the digit written to the result
  result: number[]; // result chain built so far (least-significant-first)
  done: boolean;
}

function readDigit(list: number[], pos: number): number | null {
  return pos < list.length ? list[pos] : null;
}

function record({ l1, l2 }: AddTwoInput): Frame<AddTwoState>[] {
  const frames: Frame<AddTwoState>[] = [];
  const result: number[] = [];
  let carry = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<AddTwoState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        l1,
        l2,
        pos: null,
        carry,
        sum: null,
        digit: null,
        result: result.slice(),
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${l1.length} + ${l2.length} digits`,
    `Add Two Numbers: each list stores a number's digits least-significant first, so position 0 is the ones place. Walk both chains together, adding digit by digit and carrying overflow — exactly how you add by hand. Time O(max(n,m)), Space O(1) extra.`,
    {},
  );

  let pos = 0;
  while (pos < l1.length || pos < l2.length || carry > 0) {
    const d1 = readDigit(l1, pos);
    const d2 = readDigit(l2, pos);
    const sum = carry + (d1 ?? 0) + (d2 ?? 0);
    const digit = sum % 10;
    const nextCarry = Math.floor(sum / 10);

    const d1Txt = d1 === null ? '0 (l1 exhausted)' : `${d1}`;
    const d2Txt = d2 === null ? '0 (l2 exhausted)' : `${d2}`;
    emit(
      'ADD',
      `${carry}+${d1 ?? 0}+${d2 ?? 0}=${sum}`,
      `Position ${pos}: sum = carry(${carry}) + l1(${d1Txt}) + l2(${d2Txt}) = ${sum}.`,
      { pos, sum, carry, digit: null },
    );

    result.push(digit);
    carry = nextCarry;
    emit(
      'WRITE',
      `node ${digit}, carry ${carry}`,
      `Write sum % 10 = ${digit} as the new node at position ${pos}, and carry = ${sum} / 10 = ${carry} into the next position.`,
      { pos, sum, digit, carry },
    );

    pos += 1;
  }

  emit(
    'DONE',
    `result ${result.join('')}`,
    `Both chains are exhausted and the carry is 0, so the result is complete. Reading the digits low-to-high gives the chain [${result.join(', ')}].`,
    { done: true, pos: null, sum: null, digit: null },
    'good',
  );

  return frames;
}

// Render a number stored least-significant-first as a human-readable value.
function listToNumber(list: number[]): number {
  let value = 0;
  for (let i = list.length - 1; i >= 0; i--) value = value * 10 + list[i];
  return value;
}

function View({ frame }: PluginViewProps<AddTwoState>) {
  const s = frame.state;

  const ptr = (pos: number | null, label: string, place: 'above' | 'below'): ArrayPointer[] =>
    pos !== null && pos >= 0 ? [{ i: pos, label, tone: 'accent', place }] : [];

  const activeTone = (pos: number | null) => (i: number) => (s.pos === pos && pos === i ? 'match' : '');
  const resultTone = (i: number) => (s.done ? 'found' : i === s.result.length - 1 ? 'match' : '');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        carry = <span className="font-mono text-ink">{s.carry}</span>
        {s.sum !== null && (
          <>
            {' · '}sum = <span className="font-mono text-ink">{s.sum}</span>
          </>
        )}
      </div>

      <div className={cn('mt-2', vizText.xs, 'text-ink3')}>l1 (low → high)</div>
      <ArrayRow
        values={s.l1}
        cellTone={activeTone(s.pos)}
        pointers={ptr(s.pos !== null && s.pos < s.l1.length ? s.pos : null, 'l1', 'above')}
        windowRange={null}
      />

      <div className={cn('mt-2', vizText.xs, 'text-ink3')}>l2 (low → high)</div>
      <ArrayRow
        values={s.l2}
        cellTone={activeTone(s.pos)}
        pointers={ptr(s.pos !== null && s.pos < s.l2.length ? s.pos : null, 'l2', 'above')}
        windowRange={null}
      />

      <div className={cn('mt-2', vizText.xs, 'text-ink3')}>sum chain (low → high)</div>
      {s.result.length > 0 ? (
        <ArrayRow values={s.result} cellTone={resultTone} pointers={[]} windowRange={null} />
      ) : (
        <div className={cn('font-mono', vizText.sm, 'text-ink3')}>·</div>
      )}

      <div className={cn('mt-2 font-mono', s.done ? 'text-good' : 'text-ink3', vizText.base)}>
        {listToNumber(s.l1)} + {listToNumber(s.l2)} ={' '}
        {s.done ? listToNumber(s.result) : '…'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<AddTwoState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="pos" v={s.pos ?? '—'} />
      <InspectorRow k="l1[pos]" v={s.pos !== null && s.pos < s.l1.length ? s.l1[s.pos] : '0/—'} />
      <InspectorRow k="l2[pos]" v={s.pos !== null && s.pos < s.l2.length ? s.l2[s.pos] : '0/—'} />
      <InspectorRow k="carry" v={s.carry} />
      <InspectorRow k="sum" v={s.sum ?? '—'} />
      <InspectorRow k="digit (sum%10)" v={s.digit ?? '—'} />
      <InspectorRow k="result" v={s.result.length ? `[${s.result.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-add-two-numbers';
export const title = 'Add two numbers';

export const simulator: ProblemSimulator = {
  inputs: [
    // 342 + 465 = 807  ->  [2,4,3] + [5,6,4] = [7,0,8]
    { id: 'atn1', label: '342 + 465', value: { l1: [2, 4, 3], l2: [5, 6, 4] } },
    // 99 + 1 = 100  ->  [9,9] + [1] = [0,0,1] (carry chain grows the result)
    { id: 'atn2', label: '99 + 1', value: { l1: [9, 9], l2: [1] } },
  ] satisfies SampleInput<AddTwoInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AddTwoState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const value = listToNumber(s.result);
    return { ok: true, label: `[${s.result.join(',')}] = ${value}` };
  },
};

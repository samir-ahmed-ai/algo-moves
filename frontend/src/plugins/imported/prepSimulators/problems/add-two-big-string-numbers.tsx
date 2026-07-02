import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface AddInput {
  a: string;
  b: string;
}

interface AddState {
  a: string;
  b: string;
  i: number | null; // current digit index into a (from the right)
  j: number | null; // current digit index into b (from the right)
  aDigit: number | null; // digit pulled from a this step (0 if past the end)
  bDigit: number | null; // digit pulled from b this step (0 if past the end)
  carry: number; // carry going INTO the current column
  sum: number | null; // aDigit + bDigit + carry for the current column
  out: string; // digits appended so far, least-significant first
  result: string | null; // final reversed answer, once known
  done: boolean;
}

function record({ a, b }: AddInput): Frame<AddState>[] {  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;
  let out = '';

  const { emit, frames } = createRecorder<AddState>(() => ({
        a,
        b,
        i: null,
        j: null,
        aDigit: null,
        bDigit: null,
        carry,
        sum: null,
        out,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `${a} + ${b}`,
    `Big-integer addition: the numbers are too long for a machine int, so we add them digit by digit as strings. Walk both numbers from the least-significant digit (the right end), keeping a running carry.`,
    { i, j, carry: 0 },
  );

  while (i >= 0 || j >= 0 || carry > 0) {
    let sum = carry;
    const aDigit = i >= 0 ? a.charCodeAt(i) - 48 : 0;
    const bDigit = j >= 0 ? b.charCodeAt(j) - 48 : 0;
    sum += aDigit;
    sum += bDigit;

    const aLabel = i >= 0 ? `a[${i}]=${aDigit}` : `a exhausted →0`;
    const bLabel = j >= 0 ? `b[${j}]=${bDigit}` : `b exhausted →0`;
    emit(
      'ADD',
      `${aDigit}+${bDigit}+${carry}=${sum}`,
      `Add this column: ${aLabel}, ${bLabel}, plus carry-in ${carry}. sum = ${aDigit} + ${bDigit} + ${carry} = ${sum}.`,
      { i: i >= 0 ? i : null, j: j >= 0 ? j : null, aDigit, bDigit, sum },
    );

    const digit = sum % 10;
    const nextCarry = Math.floor(sum / 10);
    out += String(digit);
    emit(
      'WRITE',
      `digit=${digit}, carry=${nextCarry}`,
      `Keep sum % 10 = ${digit} as this column's output digit, and carry sum / 10 = ${nextCarry} into the next column. Digits collected so far (least-significant first): ${out}.`,
      {
        i: i >= 0 ? i : null,
        j: j >= 0 ? j : null,
        aDigit,
        bDigit,
        sum,
        out,
        carry: nextCarry,
      },
    );

    carry = nextCarry;
    if (i >= 0) i--;
    if (j >= 0) j--;
  }

  const result = out.split('').reverse().join('');
  emit(
    'REVERSE',
    `= ${result}`,
    `Every column is processed and the carry is gone. The digits were appended least-significant first, so reverse them to get the answer: ${result}.`,
    { i: null, j: null, out, result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<AddState>) {
  const s = frame.state;

  const aChars = s.a.split('');
  const bChars = s.b.split('');
  const aPointers: ArrayPointer[] = [];
  if (s.i !== null) aPointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const bPointers: ArrayPointer[] = [];
  if (s.j !== null) bPointers.push({ i: s.j, label: 'j', tone: 'accent', place: 'above' });

  const aTone = (idx: number) => (s.i === idx ? 'match' : '');
  const bTone = (idx: number) => (s.j === idx ? 'match' : '');

  const outLeastFirst = s.out || '·';
  const built = s.result ?? (s.out.split('').reverse().join('') || '·');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        a ={' '}
        <span className="font-mono text-ink">{s.a}</span>
        {' + '}b ={' '}
        <span className="font-mono text-ink">{s.b}</span>
      </div>

      <div className={cn(vizText.xs, 'mt-1 text-ink3')}>a</div>
      <ArrayRow values={aChars} cellTone={aTone} pointers={aPointers} windowRange={null} />
      <div className={cn(vizText.xs, 'mt-1 text-ink3')}>b</div>
      <ArrayRow values={bChars} cellTone={bTone} pointers={bPointers} windowRange={null} />

      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
        carry ={' '}
        <span className="text-ink">{s.carry}</span>
        {s.sum !== null && !s.done && (
          <>
            {' · '}sum ={' '}
            <span className="text-ink">{s.sum}</span>
          </>
        )}
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        digits (rev) = <span className="text-ink">{outLeastFirst}</span>
      </div>
      <div
        className={cn(
          'mt-1 font-mono',
          vizText.base,
          s.result ? 'text-good' : 'text-ink2',
        )}
      >
        {s.result ? '→ ' : '= '}
        {built}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<AddState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="a" v={s.a} />
      <InspectorRow k="b" v={s.b} />
      <InspectorRow k="i (into a)" v={s.i ?? '—'} />
      <InspectorRow k="j (into b)" v={s.j ?? '—'} />
      <InspectorRow k="a digit" v={s.aDigit ?? '—'} />
      <InspectorRow k="b digit" v={s.bDigit ?? '—'} />
      <InspectorRow k="carry" v={s.carry} />
      <InspectorRow k="sum" v={s.sum ?? '—'} />
      <InspectorRow k="out (rev)" v={s.out || '·'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? '—' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-add-two-big-string-numbers';
export const title = 'Add two big string numbers';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'add1', label: '"456" + "77"', value: { a: '456', b: '77' } },
    { id: 'add2', label: '"999" + "1"', value: { a: '999', b: '1' } },
  ] satisfies SampleInput<AddInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AddState | undefined;
    return s?.result
      ? { ok: true, label: s.result }
      : { ok: false, label: 'no result' };
  },
};

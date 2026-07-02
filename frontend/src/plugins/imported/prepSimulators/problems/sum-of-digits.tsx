import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SumOfDigitsInput {
  n: number;
}

interface SumOfDigitsState {
  original: number; // the input value, kept for display
  digits: string[]; // decimal digits of |original|, most-significant first (fixed board)
  n: number; // the shrinking value of n as we strip digits
  digit: number | null; // the digit just peeled (n % 10)
  pos: number | null; // index into `digits` of the digit just peeled
  sum: number; // running accumulator
  done: boolean;
}

/** Decimal digits of a non-negative integer, most-significant first. */
function toDigits(v: number): string[] {
  if (v === 0) return ['0'];
  return String(v).split('');
}

function record({ n }: SumOfDigitsInput): Frame<SumOfDigitsState>[] {  const original = n;
  const abs = Math.abs(n);
  const digits = toDigits(abs);

  const { emit, frames } = createRecorder<SumOfDigitsState>(() => ({
        original,
        digits,
        n: abs,
        digit: null,
        pos: null,
        sum: 0,
        done: false
      }));

  emit(
    'INIT',
    `n=${original}`,
    `Sum of digits: add up every decimal digit of ${original}. We strip one digit at a time from the right using n % 10, then drop it with n / 10, until nothing is left. Time O(log n), space O(1).`,
    { n: abs, sum: 0 },
  );

  if (n < 0) {
    emit(
      'ABS',
      `|${original}| = ${abs}`,
      `The value is negative, so we take its absolute value first: |${original}| = ${abs}. The sign does not change which digits we add.`,
      { n: abs, sum: 0 },
    );
  }

  // Faithful re-implementation: sum += n % 10; n /= 10 while n > 0.
  let cur = abs;
  let sum = 0;
  // Peel from the least-significant digit; map it back to its board position.
  let boardPos = digits.length - 1;

  if (cur === 0) {
    // Loop body never runs for 0; sum stays 0.
    emit(
      'ZERO',
      'sum=0',
      `n is already 0, so the while-loop body never runs and the digit sum is 0.`,
      { n: 0, sum: 0, done: true },
      'good',
    );
    return frames;
  }

  while (cur > 0) {
    const d = cur % 10;
    sum += d;
    emit(
      'PEEL',
      `+${d} → sum=${sum}`,
      `Peel the last digit: ${cur} % 10 = ${d}. Add it to the running total → sum = ${sum}.`,
      { n: cur, digit: d, pos: boardPos, sum },
    );
    cur = Math.floor(cur / 10);
    emit(
      'SHIFT',
      `n=${cur}`,
      `Drop that digit with integer division: n / 10 = ${cur}. ${cur > 0 ? 'There are still digits left, so continue.' : 'Now n is 0, so the loop stops.'}`,
      { n: cur, digit: d, pos: boardPos, sum },
    );
    boardPos -= 1;
  }

  emit(
    'DONE',
    `sum=${sum}`,
    `n reached 0 — every digit has been added. The digit sum of ${original} is ${sum}.`,
    { n: 0, sum, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SumOfDigitsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.pos !== null && s.pos >= 0) {
    pointers.push({ i: s.pos, label: 'n%10', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.done) return 'found';
    if (s.pos !== null && i === s.pos) return 'match';
    if (s.pos !== null && i > s.pos) return 'dead'; // already peeled off the right
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.original}</span>
        {' · '}sum ={' '}
        <span className={cn('font-mono', s.done ? 'text-good' : 'text-ink')}>{s.sum}</span>
      </div>
      <ArrayRow values={s.digits} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        remaining n = <span className="text-ink">{s.n}</span>
        {s.digit !== null && !s.done && (
          <>
            {' · '}last digit ={' '}
            <span className="text-ink">{s.digit}</span>
          </>
        )}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.sum}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SumOfDigitsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="input n" v={s.original} />
      <InspectorRow k="n (remaining)" v={s.n} />
      <InspectorRow k="n % 10" v={s.digit ?? '—'} />
      <InspectorRow k="sum" v={s.sum} />
      <InspectorRow k="result" v={s.done ? s.sum : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-sum-of-digits';
export const title = 'Sum of digits';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'sod1', label: 'n = 12345', value: { n: 12345 } },
    { id: 'sod2', label: 'n = -908', value: { n: -908 } },
  ] satisfies SampleInput<SumOfDigitsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SumOfDigitsState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: true, label: `sum = ${s.sum}` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MultiplyInput {
  num1: string;
  num2: string;
}

interface MultiplyState {
  num1: string;
  num2: string;
  result: number[]; // digits of the running product, most-significant first
  i: number | null; // index into num1 (multiplicand digit)
  j: number | null; // index into num2 (multiplier digit)
  lo: number | null; // result slot i+j+1 (units place of this product)
  hi: number | null; // result slot i+j (carry lands here)
  mul: number | null; // digit product num1[i] * num2[j]
  sum: number | null; // mul + result[i+j+1]
  answer: string | null; // final stripped answer, once known
  done: boolean;
}

function digitProduct(num1: string, i: number, num2: string, j: number): number {
  return (num1.charCodeAt(i) - 48) * (num2.charCodeAt(j) - 48);
}

function record({ num1, num2 }: MultiplyInput): Frame<MultiplyState>[] {  const m = num1.length;
  const n = num2.length;
  const result = new Array<number>(m + n).fill(0);

  const { emit, frames } = createRecorder<MultiplyState>(() => ({
        num1,
        num2,
        result: result.slice(),
        i: null,
        j: null,
        lo: null,
        hi: null,
        mul: null,
        sum: null,
        answer: null,
        done: false
      }));

  emit(
    'INIT',
    `${num1} × ${num2}`,
    `Grade-school multiplication of "${num1}" × "${num2}". We keep a result array of ${m + n} digit slots. The product of num1[i] and num2[j] always lands at slot i+j+1, with any carry spilling into slot i+j.`,
    {},
  );

  if (num1 === '0' || num2 === '0') {
    result.fill(0);
    emit(
      'ZERO',
      'factor is 0',
      `One factor is "0", so the product is 0 by definition — short-circuit and return "0" without touching the grid.`,
      { answer: '0', done: true },
      'good',
    );
    return frames;
  }

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const lo = i + j + 1;
      const hi = i + j;
      const mul = digitProduct(num1, i, num2, j);
      const sum = mul + result[lo];
      emit(
        'MUL',
        `${num1[i]}·${num2[j]}=${mul}`,
        `Multiply num1[${i}]=${num1[i]} by num2[${j}]=${num2[j]} to get ${mul}. Add the digit already sitting in slot i+j+1=${lo} (=${result[lo]}): sum = ${mul} + ${result[lo]} = ${sum}.`,
        { i, j, lo, hi, mul, sum },
      );
      result[lo] = sum % 10;
      result[hi] += Math.floor(sum / 10);
      emit(
        'CARRY',
        `[${lo}]=${result[lo]} +[${hi}]${Math.floor(sum / 10)}`,
        `Write the units digit sum%10 = ${result[lo]} into slot ${lo}, and carry sum/10 = ${Math.floor(sum / 10)} up into slot i+j=${hi} (now ${result[hi]}).`,
        { i, j, lo, hi, mul, sum },
      );
    }
  }

  let start = 0;
  while (start < result.length - 1 && result[start] === 0) {
    emit(
      'STRIP',
      `skip [${start}]=0`,
      `Strip leading zeros: slot ${start} is 0 and there are more digits to its right, so advance the start pointer past it.`,
      { lo: start },
    );
    start++;
  }

  const answer = result.slice(start).join('');
  emit(
    'DONE',
    `= ${answer}`,
    `The grid is complete. Reading result from slot ${start} onward gives "${answer}". So ${num1} × ${num2} = ${answer}.`,
    { lo: start, answer, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MultiplyState>) {
  const s = frame.state;

  const p1: ArrayPointer[] = [];
  if (s.i !== null) p1.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone1 = (i: number) => (s.i === i ? 'match' : '');

  const p2: ArrayPointer[] = [];
  if (s.j !== null) p2.push({ i: s.j, label: 'j', tone: 'warn', place: 'above' });
  const tone2 = (i: number) => (s.j === i ? 'match' : '');

  const cells = s.result.map((d) => String(d));
  const pr: ArrayPointer[] = [];
  if (s.lo !== null) pr.push({ i: s.lo, label: 'i+j+1', tone: 'accent', place: 'below' });
  if (s.hi !== null && s.hi !== s.lo) pr.push({ i: s.hi, label: 'i+j', tone: 'good', place: 'below' });
  const toneR = (i: number) => {
    if (s.done && s.answer !== null) {
      const first = s.result.length - s.answer.length;
      return i >= first ? 'found' : 'dead';
    }
    if (s.lo === i) return 'match';
    if (s.hi === i) return 'in-window';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        <span className="font-mono text-ink">{s.num1}</span> ×{' '}
        <span className="font-mono text-ink">{s.num2}</span>
        {s.mul !== null && !s.done && (
          <>
            {' · '}mul = <span className="font-mono text-ink">{s.mul}</span>
            {s.sum !== null && (
              <>
                {' · '}sum = <span className="font-mono text-ink">{s.sum}</span>
              </>
            )}
          </>
        )}
      </div>

      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>num1</div>
      <ArrayRow values={s.num1.split('')} cellTone={tone1} pointers={p1} windowRange={null} />

      <div className={cn('mt-2', vizText.xs, 'text-ink3')}>num2</div>
      <ArrayRow values={s.num2.split('')} cellTone={tone2} pointers={p2} windowRange={null} />

      <div className={cn('mt-2', vizText.xs, 'text-ink3')}>result (i+j+1 = units, i+j = carry)</div>
      <ArrayRow values={cells} cellTone={toneR} pointers={pr} windowRange={null} />

      {s.answer !== null && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>→ {s.answer}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MultiplyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const d1 = s.i !== null ? s.num1[s.i] : '—';
  const d2 = s.j !== null ? s.num2[s.j] : '—';
  return (
    <VarGrid>
      <InspectorRow k="num1 × num2" v={`${s.num1} × ${s.num2}`} />
      <InspectorRow k="i / num1[i]" v={s.i !== null ? `${s.i} / ${d1}` : '—'} />
      <InspectorRow k="j / num2[j]" v={s.j !== null ? `${s.j} / ${d2}` : '—'} />
      <InspectorRow k="mul (d1·d2)" v={s.mul ?? '—'} />
      <InspectorRow k="sum (mul+slot)" v={s.sum ?? '—'} />
      <InspectorRow k="slot i+j+1 / i+j" v={s.lo !== null ? `${s.lo} / ${s.hi ?? '—'}` : '—'} />
      <InspectorRow k="result" v={s.result.join('')} />
      <InspectorRow k="answer" v={s.answer ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-multiply-string-numbers';
export const title = 'Multiply string numbers';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ms1', label: '"12" × "34"', value: { num1: '12', num2: '34' } },
    { id: 'ms2', label: '"123" × "45"', value: { num1: '123', num2: '45' } },
  ] satisfies SampleInput<MultiplyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MultiplyState | undefined;
    return s?.answer !== undefined && s?.answer !== null
      ? { ok: true, label: s.answer }
      : { ok: false, label: 'no result' };
  },
};

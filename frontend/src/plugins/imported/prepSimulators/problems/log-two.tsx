import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LogTwoInput {
  n: number;
}

interface LogTwoState {
  original: number; // the starting n (never mutated)
  bits: number[]; // fixed-width binary of `current`, MSB first
  current: number; // the working value after shifts
  count: number; // number of right-shifts performed = floor(log2 original)
  msb: number | null; // index (in bits[]) of the highest set bit, the "survivor"
  done: boolean;
  invalid: boolean; // n <= 0 → answer -1
}

const WIDTH = 6; // bit-width for the board; inputs kept < 2^6 = 64

function toBits(v: number): number[] {
  const out: number[] = [];
  for (let b = WIDTH - 1; b >= 0; b--) out.push((v >> b) & 1);
  return out;
}

// index of the highest set bit in the fixed-width bits[] (MSB first), or null.
function highestSetIndex(bits: number[]): number | null {
  for (let i = 0; i < bits.length; i++) if (bits[i] === 1) return i;
  return null;
}

function record({ n }: LogTwoInput): Frame<LogTwoState>[] {
  const { emit, frames } = createRecorder<LogTwoState>(() => ({
        original: n,
        bits: toBits(Math.max(n, 0)),
        current: n,
        count: 0,
        msb: null,
        done: false,
        invalid: false
      }));

  if (n <= 0) {
    emit(
      'INVALID',
      'n<=0 → -1',
      `Log base 2 is only defined for positive integers, and n = ${n} is not positive, so the function returns -1.`,
      { done: true, invalid: true },
      'bad',
    );
    return frames;
  }

  let current = n;
  let count = 0;
  let bits = toBits(current);

  emit(
    'INIT',
    `n=${n}`,
    `We want floor(log2(${n})): how many times can we halve ${n} (integer division) before we hit 1? Each halving is one right-shift n >>= 1, and we count the shifts. Start with bits = 0.`,
    { current, count, bits, msb: highestSetIndex(bits) },
  );

  while (current > 1) {
    const before = current;
    const shifted = current >> 1;
    emit(
      'SHIFT',
      `${before}>>1=${shifted}`,
      `current = ${before} > 1, so shift right by one: ${before} >> 1 = ${shifted} (drops the lowest bit, i.e. halve and floor). Every bit slides one place toward the least-significant end.`,
      { current: before, count, bits: toBits(before), msb: highestSetIndex(toBits(before)) },
    );

    current = shifted;
    count += 1;
    bits = toBits(current);
    emit(
      'COUNT',
      `bits=${count}`,
      `After the shift current = ${current} and we increment the shift count to bits = ${count}. The highest set bit has moved down one position.`,
      { current, count, bits, msb: highestSetIndex(bits) },
    );
  }

  emit(
    'DONE',
    `log2=${count}`,
    `current = ${current} is no longer greater than 1, so the loop stops. We performed ${count} right-shift${count === 1 ? '' : 's'} to reduce ${n} down to 1, so floor(log2(${n})) = ${count}.`,
    { current, count, bits: toBits(current), msb: highestSetIndex(toBits(current)), done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LogTwoState>) {
  const s = frame.state;
  const cells = s.bits.map((b) => String(b));
  const pointers: ArrayPointer[] = [];
  if (s.msb !== null) {
    pointers.push({ i: s.msb, label: 'msb', tone: s.done ? 'good' : 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.msb !== null && i === s.msb) return s.done ? 'found' : 'match';
    return s.bits[i] === 1 ? 'in-window' : '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.original}</span>
        {' · '}current ={' '}
        <span className="font-mono text-ink">{s.invalid ? '—' : s.current}</span>
      </div>
      {s.invalid ? (
        <div className={cn('mt-2 font-mono text-bad', vizText.base)}>n ≤ 0 → return -1</div>
      ) : (
        <>
          <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
          <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
            binary of current (MSB left) · shift count bits ={' '}
            <span className="text-ink">{s.count}</span>
          </div>
          {s.done && (
            <div className={cn('mt-1 font-mono text-good', vizText.base)}>
              → floor(log2({s.original})) = {s.count}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LogTwoState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const bitsStr = s.invalid ? '—' : s.bits.join('');
  return (
    <VarGrid>
      <InspectorRow k="n (input)" v={s.original} />
      <InspectorRow k="current" v={s.invalid ? '—' : s.current} />
      <InspectorRow k="current (binary)" v={bitsStr} />
      <InspectorRow k="bits (shifts)" v={s.invalid ? '—' : s.count} />
      <InspectorRow k="answer" v={s.done ? (s.invalid ? -1 : s.count) : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-log-two';
export const title = 'Log two';

function computeLogTwo(n: number): number {
  if (n <= 0) return -1;
  let bits = 0;
  let cur = n;
  while (cur > 1) {
    cur >>= 1;
    bits++;
  }
  return bits;
}

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'lt1', label: 'n = 37', value: { n: 37 } },
    { id: 'lt2', label: 'n = 16', value: { n: 16 } },
  ] satisfies SampleInput<LogTwoInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LogTwoState | undefined;
    if (!s) return { ok: false, label: '—' };
    const answer = s.invalid ? -1 : s.count;
    const expected = computeLogTwo(s.original);
    return { ok: answer === expected, label: `log2 = ${answer}` };
  },
};

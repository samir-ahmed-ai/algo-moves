import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface IsOddInput {
  n: number;
}

interface IsOddState {
  n: number;
  bits: string[]; // binary digits, most-significant first
  low: number; // index of the lowest bit (bit 0), always last cell
  reading: boolean; // are we currently reading the lowest bit?
  masked: number | null; // result of n & 1
  result: boolean | null; // true = odd, false = even
  done: boolean;
}

/** Binary digits of a non-negative int, most-significant first (min 1 char). */
function toBits(n: number): string[] {
  const v = Math.abs(n);
  if (v === 0) return ['0'];
  return v.toString(2).split('');
}

function record({ n }: IsOddInput): Frame<IsOddState>[] {  const bits = toBits(n);
  const low = bits.length - 1;

  const { emit, frames } = createRecorder<IsOddState>(() => ({
        n,
        bits,
        low,
        reading: false,
        masked: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `n=${n}`,
    `Is Odd Number: decide if ${n} is odd. A number's parity is decided entirely by its lowest binary bit — the 1s place. We never need to divide; the mask n & 1 reads that single bit in O(1) time and O(1) space.`,
    {},
  );

  emit(
    'SHOW_BITS',
    `bits=${bits.join('')}`,
    `Write ${n} in binary as ${bits.join('')}. Each place is a power of two; every place from the 2s upward is even, so only the rightmost bit (the 1s place) can make the total odd.`,
    {},
  );

  emit(
    'READ_LOW',
    `bit0=${bits[low]}`,
    `Look only at the lowest bit (index ${low}, the 1s place): it is ${bits[low]}. This is exactly what n & 1 isolates — it zeroes out every higher bit and keeps just this one.`,
    { reading: true },
  );

  const masked = n & 1;
  emit(
    'MASK',
    `n&1=${masked}`,
    `Compute the mask: ${n} & 1 = ${masked}. AND-ing with 1 (binary …0001) discards all higher bits and returns the value of the lowest bit.`,
    { reading: true, masked },
  );

  const result = masked === 1;
  emit(
    'DECIDE',
    result ? 'odd' : 'even',
    result
      ? `The lowest bit is 1, so n & 1 == 1 is true — ${n} is ODD.`
      : `The lowest bit is 0, so n & 1 == 1 is false — ${n} is EVEN.`,
    { reading: true, masked, result, done: true },
    result ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<IsOddState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.reading) {
    pointers.push({ i: s.low, label: '1s bit', tone: s.result === false ? 'bad' : 'accent', place: 'above' });
  }
  const tone = (i: number) =>
    i === s.low ? (s.result === true ? 'found' : s.reading ? 'match' : '') : '';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>
        {' · '}binary = <span className="font-mono text-ink">{s.bits.join('')}</span>
      </div>
      <ArrayRow values={s.bits} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        n &amp; 1 = <span className="text-ink">{s.masked === null ? '?' : s.masked}</span>
      </div>
      {s.result !== null && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.result ? 'text-good' : 'text-bad',
          )}
        >
          → {s.result ? 'ODD' : 'EVEN'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<IsOddState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="binary" v={s.bits.join('')} />
      <InspectorRow k="lowest bit" v={s.bits[s.low]} />
      <InspectorRow k="n & 1" v={s.masked === null ? '—' : s.masked} />
      <InspectorRow k="result" v={s.result === null ? '…' : s.result ? 'odd' : 'even'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-is-odd-number';
export const title = 'Is odd number';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'io1', label: 'n = 7', value: { n: 7 } },
    { id: 'io2', label: 'n = 12', value: { n: 12 } },
  ] satisfies SampleInput<IsOddInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IsOddState | undefined;
    const odd = s ? (s.n & 1) === 1 : false;
    return { ok: true, label: odd ? 'odd' : 'even' };
  },
};

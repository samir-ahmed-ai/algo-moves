import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';
import { toBitStrings } from '../../../_shared/bitUtils';

interface CountBitsInput {
  n: number;
  /** Number of bit columns to render (most-significant first). */
  width: number;
}

interface CountBitsState {
  width: number;
  original: number; // the number we started with (for the header)
  bits: string[]; // current value's bits, MSB-first, as '0' / '1'
  cur: number; // current value of n during the loop
  lowIndex: number | null; // array index (MSB-first) of the lowest set bit being cleared
  count: number; // set bits counted so far
  done: boolean;
}

/** MSB-first bit array of length `width` for a non-negative integer. */

/** Array index (MSB-first) of the lowest set bit, or null if value is 0. */
function lowestSetIndex(value: number, width: number): number | null {
  if (value === 0) return null;
  let b = 0;
  while (((value >> b) & 1) === 0) b++;
  return width - 1 - b;
}

function record({ n, width }: CountBitsInput): Frame<CountBitsState>[] {
  const { emit, frames } = createRecorder<CountBitsState>(() => ({
        width: width,
        original: n,
        bits: toBitStrings(n, width),
        cur: n,
        lowIndex: null,
        count: 0,
        done: false
      }));

  let cur = n;
  let count = 0;

  emit('INIT', `n=${n}`, `Count the set (1) bits in ${n} using Brian Kernighan's trick: n & (n − 1) clears the lowest set bit. Each time we do that, we've removed exactly one 1, so we count one loop per set bit.`, { bits: toBitStrings(cur, width), lowIndex: lowestSetIndex(cur, width), count: count, done: false });

  // for n != 0 { n &= n - 1; count++ }
  while (cur !== 0) {
    const low = lowestSetIndex(cur, width);
    emit('SELECT', `low bit @2^${width - 1 - (low ?? 0)}`, `n = ${cur} is not 0, so at least one bit is set. Its lowest 1 is the highlighted bit. Applying n &= n − 1 will flip exactly that bit to 0.`, { bits: toBitStrings(cur, width), lowIndex: low, count: count, done: false });

    const next = cur & (cur - 1);
    count++;
    emit('CLEAR', `n=${next}, count=${count}`, `n & (n − 1) = ${cur} & ${cur - 1} = ${next}: the lowest 1 is gone. Increment count to ${count}. Continue while n is still non-zero.`, { bits: toBitStrings(next, width), lowIndex: lowestSetIndex(next, width), count: count, done: false }, 'good');
    cur = next;
  }

  emit('DONE', `${count} set bits`, `n has reached 0, so every 1 bit has been cleared and counted. ${n} has ${count} set bit${count === 1 ? '' : 's'}. Time O(bits set), Space O(1).`, { bits: toBitStrings(0, width), lowIndex: null, count: count, done: true }, 'good');

  return frames;
}

function View({ frame }: PluginViewProps<CountBitsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.lowIndex !== null) {
    pointers.push({ i: s.lowIndex, label: 'low', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.lowIndex === i) return 'match';
    return s.bits[i] === '1' ? 'in-window' : '';
  };
  // Show the power-of-two exponent under each column instead of the raw index.
  const powerLabel = (i: number) => 2 ** (s.width - 1 - i);
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="n" v={s.cur} tone={s.cur === 0 ? 'bad' : 'accent'} />
        <RailStat k="count" v={s.count} tone={s.count > 0 ? 'good' : undefined} />
      </RailGroup>
      {s.done && (
        <RailResult label="set bits" value={s.count} tone="good" />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.bits} cellTone={tone} pointers={pointers} windowRange={null} label={powerLabel} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CountBitsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="original n" v={s.original} />
      <InspectorRow k="n (current)" v={s.cur} />
      <InspectorRow k="n binary" v={s.bits.join('')} />
      <InspectorRow k="lowest set bit" v={s.lowIndex !== null ? 2 ** (s.width - 1 - s.lowIndex) : '—'} />
      <InspectorRow k="count" v={s.count} />
      <InspectorRow k="status" v={s.done ? 'done' : s.cur === 0 ? 'zero' : 'looping'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-count-set-bits-in-number';
export const title = 'Count set bits in number';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'csb1', label: 'n = 13 (1101)', value: { n: 13, width: 8 } },
    { id: 'csb2', label: 'n = 23 (10111)', value: { n: 23, width: 8 } },
  ] satisfies SampleInput<CountBitsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CountBitsState | undefined;
    const count = s?.count ?? 0;
    return { ok: true, label: `${count} set bit${count === 1 ? '' : 's'}` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
function toBits(value: number, width: number): string[] {
  const out: string[] = [];
  for (let b = width - 1; b >= 0; b--) {
    out.push(((value >> b) & 1) === 1 ? '1' : '0');
  }
  return out;
}

/** Array index (MSB-first) of the lowest set bit, or null if value is 0. */
function lowestSetIndex(value: number, width: number): number | null {
  if (value === 0) return null;
  let b = 0;
  while (((value >> b) & 1) === 0) b++;
  return width - 1 - b;
}

function record({ n, width }: CountBitsInput): Frame<CountBitsState>[] {
  const frames: Frame<CountBitsState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    cur: number,
    lowIndex: number | null,
    count: number,
    done: boolean,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        width,
        original: n,
        bits: toBits(cur, width),
        cur,
        lowIndex,
        count,
        done,
      },
    });

  let cur = n;
  let count = 0;

  emit(
    'INIT',
    `n=${n}`,
    `Count the set (1) bits in ${n} using Brian Kernighan's trick: n & (n − 1) clears the lowest set bit. Each time we do that, we've removed exactly one 1, so we count one loop per set bit.`,
    cur,
    lowestSetIndex(cur, width),
    count,
    false,
  );

  // for n != 0 { n &= n - 1; count++ }
  while (cur !== 0) {
    const low = lowestSetIndex(cur, width);
    emit(
      'SELECT',
      `low bit @2^${width - 1 - (low ?? 0)}`,
      `n = ${cur} is not 0, so at least one bit is set. Its lowest 1 is the highlighted bit. Applying n &= n − 1 will flip exactly that bit to 0.`,
      cur,
      low,
      count,
      false,
    );

    const next = cur & (cur - 1);
    count++;
    emit(
      'CLEAR',
      `n=${next}, count=${count}`,
      `n & (n − 1) = ${cur} & ${cur - 1} = ${next}: the lowest 1 is gone. Increment count to ${count}. Continue while n is still non-zero.`,
      next,
      lowestSetIndex(next, width),
      count,
      false,
      'good',
    );
    cur = next;
  }

  emit(
    'DONE',
    `${count} set bits`,
    `n has reached 0, so every 1 bit has been cleared and counted. ${n} has ${count} set bit${count === 1 ? '' : 's'}. Time O(bits set), Space O(1).`,
    0,
    null,
    count,
    true,
    'good',
  );

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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.cur}</span>
        {' · '}count = <span className="font-mono text-ink">{s.count}</span>
        <span className="ml-2 text-ink3">(started from {s.original})</span>
      </div>
      <ArrayRow values={s.bits} cellTone={tone} pointers={pointers} windowRange={null} label={powerLabel} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.done
          ? `→ ${s.count} set bit${s.count === 1 ? '' : 's'}`
          : `n & (n − 1) drops the lowest 1 each step`}
      </div>
    </div>
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

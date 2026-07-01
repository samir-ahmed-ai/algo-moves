import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface IsBinaryInput {
  n: number;
}

const BITS = 8; // 8-bit window is plenty for tiny illustrative inputs

/** Least-significant-bit-first bit array of an 8-bit number (index 0 = bit 0). */
function bitsOf(x: number): number[] {
  const out: number[] = [];
  for (let b = 0; b < BITS; b++) out.push((x >> b) & 1);
  return out;
}

interface IsBinaryState {
  n: number;
  sign: number; // -1 = not yet checked, 0 = fails n>0, 1 = passes n>0
  nBits: number[]; // bits of n (LSB first)
  mBits: number[]; // bits of n-1 (LSB first), all -1 until computed
  andBits: number[]; // bits of n & (n-1) computed so far; -1 = not computed yet
  i: number | null; // current bit index being ANDed
  result: boolean | null; // final verdict
  done: boolean;
}

function record({ n }: IsBinaryInput): Frame<IsBinaryState>[] {  const nBits = bitsOf(n < 0 ? 0 : n);

  const { emit, frames } = createRecorder<IsBinaryState>(() => ({
        n,
        sign: -1,
        nBits,
        mBits: new Array<number>(BITS).fill(-1),
        andBits: new Array<number>(BITS).fill(-1),
        i: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `n=${n}`,
    `Is Binary asks whether n is a power of two — a number with exactly one bit set. The trick is a single-bit check: n > 0 && (n & (n-1)) == 0. Time O(1), space O(1).`,
    {},
  );

  // Guard: n must be positive.
  if (!(n > 0)) {
    emit(
      'SIGN',
      `${n} ≤ 0`,
      `First guard: n must be positive. ${n} is not greater than 0, so it cannot be a power of two — the answer is false immediately.`,
      { sign: 0, result: false, done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'SIGN',
    `${n} > 0`,
    `First guard passes: ${n} > 0, so the sign check is satisfied. Now test the single-bit condition (n & (n-1)) == 0.`,
    { sign: 1 },
  );

  // Compute n-1 and reveal its bits.
  const mBits = bitsOf(n - 1);
  emit(
    'MINUS',
    `n-1=${n - 1}`,
    `Subtracting one flips the lowest set bit of ${n} to 0 and turns every bit below it into 1. So n-1 = ${n - 1}. If ${n} had a single set bit, that bit is now gone and all lower bits are 1 — the two numbers share no bits.`,
    { sign: 1, mBits },
  );

  // AND bit by bit.
  const andBits = new Array<number>(BITS).fill(-1);
  let anySet = 0;
  for (let b = 0; b < BITS; b++) {
    andBits[b] = nBits[b] & mBits[b];
    if (andBits[b] === 1) anySet = 1;
    emit(
      'AND',
      `bit ${b}: ${nBits[b]}&${mBits[b]}=${andBits[b]}`,
      `Bit ${b}: n has ${nBits[b]} and n-1 has ${mBits[b]}, so their AND is ${andBits[b]}.${
        andBits[b] === 1
          ? ' A 1 here means the two numbers share a set bit — n had more than one bit set.'
          : ' Still zero, meaning no shared bit at this position yet.'
      }`,
      { sign: 1, mBits, andBits: andBits.slice(), i: b },
      andBits[b] === 1 ? 'bad' : undefined,
    );
  }

  const result = anySet === 0;
  emit(
    'DONE',
    result ? 'true' : 'false',
    result
      ? `Every AND bit is 0, so (n & (n-1)) == 0. ${n} has exactly one set bit — it is a power of two. Answer: true.`
      : `At least one AND bit is 1, so (n & (n-1)) != 0. ${n} has more than one set bit — it is not a power of two. Answer: false.`,
    { sign: 1, mBits, andBits, result, done: true },
    result ? 'good' : 'bad',
  );
  return frames;
}

function bitCells(bits: number[]): (number | string)[] {
  return bits.map((b) => (b === -1 ? '·' : b));
}

function View({ frame }: PluginViewProps<IsBinaryState>) {
  const s = frame.state;
  // Show bits most-significant first so the row reads like a written binary number.
  const nCells = bitCells(s.nBits).slice().reverse();
  const mCells = bitCells(s.mBits).slice().reverse();
  const andCells = bitCells(s.andBits).slice().reverse();
  const disp = (b: number | null) => (b === null ? null : BITS - 1 - b); // map bit index → reversed column

  const nPtr: ArrayPointer[] = [];
  const iCol = disp(s.i);
  if (iCol !== null) nPtr.push({ i: iCol, label: 'bit', tone: 'accent', place: 'above' });

  const andPtr: ArrayPointer[] = [];
  if (iCol !== null) andPtr.push({ i: iCol, label: '&', tone: 'accent', place: 'below' });

  const andTone = (col: number) => {
    const v = andCells[col];
    if (v === '·') return '';
    return v === 1 ? 'match' : s.done && s.result ? 'found' : '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>
        {s.sign === 0 && <span className="font-mono text-bad"> · n ≤ 0</span>}
        {s.sign === 1 && <span className="font-mono text-good"> · n &gt; 0 ✓</span>}
      </div>

      <div className={cn('mt-1 font-mono', vizText.xs, 'text-ink3')}>n (binary)</div>
      <ArrayRow values={nCells} pointers={nPtr} windowRange={null} label={() => ''} />

      {s.sign === 1 && (
        <>
          <div className={cn('mt-2 font-mono', vizText.xs, 'text-ink3')}>n − 1</div>
          <ArrayRow values={mCells} windowRange={null} label={() => ''} />

          <div className={cn('mt-2 font-mono', vizText.xs, 'text-ink3')}>n &amp; (n − 1)</div>
          <ArrayRow values={andCells} cellTone={andTone} pointers={andPtr} windowRange={null} label={() => ''} />
        </>
      )}

      {s.result !== null && (
        <div className={cn('mt-2 font-mono', vizText.base, s.result ? 'text-good' : 'text-bad')}>
          → {s.result ? 'true (power of two)' : 'false'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<IsBinaryState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const bin = (bits: number[]) =>
    bits.some((b) => b === -1) ? '—' : bits.slice().reverse().join('');
  const andVal =
    s.andBits.some((b) => b === -1)
      ? '…'
      : s.andBits.reduce((acc, b, i) => acc + (b === 1 ? 1 << i : 0), 0);
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="n > 0" v={s.sign === -1 ? '…' : s.sign === 1 ? 'yes' : 'no'} />
      <InspectorRow k="n (bin)" v={bin(s.nBits)} />
      <InspectorRow k="n−1 (bin)" v={bin(s.mBits)} />
      <InspectorRow k="n & (n−1)" v={andVal} />
      <InspectorRow k="result" v={s.result === null ? (s.done ? 'false' : '…') : String(s.result)} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-is-binary';
export const title = 'Is binary';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ib1', label: 'n = 8', value: { n: 8 } },
    { id: 'ib2', label: 'n = 6', value: { n: 6 } },
  ] satisfies SampleInput<IsBinaryInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as IsBinaryState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'true' : 'false' };
  },
};

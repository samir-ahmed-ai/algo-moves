import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PowerTwoInput {
  n: number;
}

type Row = { label: string; bits: string[] };

interface PowerTwoState {
  n: number;
  width: number; // number of bit columns rendered
  rows: Row[]; // mono bit-rows accumulated so far (n, n-1, n&(n-1))
  focusCol: number | null; // bit column the caption is about (right-aligned index)
  lowestSet: number | null; // column of n's lowest set bit
  result: boolean | null;
  done: boolean;
}

const WIDTH = 6; // 6 bits is enough for our tiny sample inputs (max value 63)

function toBits(value: number, width: number): string[] {
  const bits: string[] = [];
  for (let b = width - 1; b >= 0; b--) bits.push(((value >> b) & 1).toString());
  return bits;
}

// Column index (0 = leftmost/high bit) of the lowest set bit, or null if none.
function lowestSetColumn(value: number, width: number): number | null {
  if (value <= 0) return null;
  for (let b = 0; b < width; b++) {
    if ((value >> b) & 1) return width - 1 - b;
  }
  return null;
}

function record({ n }: PowerTwoInput): Frame<PowerTwoState>[] {
  const frames: Frame<PowerTwoState>[] = [];
  const width = WIDTH;
  const rows: Row[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<PowerTwoState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        n,
        width,
        rows: rows.map((r) => ({ label: r.label, bits: r.bits.slice() })),
        focusCol: null,
        lowestSet: null,
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Power of Two: a number is a power of two when its binary form has exactly one set bit (like 1, 10, 100…). The trick n > 0 && (n & (n-1)) == 0 tests that in O(1). Start with n = ${n}.`,
    {},
  );

  // Guard: n must be positive.
  if (n <= 0) {
    rows.push({ label: `n = ${n}`, bits: toBits(n & ((1 << width) - 1), width) });
    emit(
      'GUARD',
      'n <= 0',
      `First half of the test: n > 0. Here n = ${n} is not positive, so it cannot be a power of two — return false immediately without touching any bits.`,
      { result: false, done: true },
      'bad',
    );
    return frames;
  }

  // Show n in binary.
  rows.push({ label: `n     = ${n}`, bits: toBits(n, width) });
  const lo = lowestSetColumn(n, width);
  emit(
    'SHOW_N',
    `n=${n}`,
    `n = ${n} passes n > 0. Write it in binary and find its lowest set bit (the rightmost 1). Subtracting 1 will flip that bit and every 0 below it.`,
    { lowestSet: lo, focusCol: lo },
  );

  // Show n-1 in binary.
  const m = n - 1;
  rows.push({ label: `n-1   = ${m}`, bits: toBits(m, width) });
  emit(
    'SHOW_M',
    `n-1=${m}`,
    `n - 1 = ${m}. Compared to n, the lowest set bit turned to 0 and all the zeros to its right turned to 1. So n and n-1 differ exactly at and below that lowest bit.`,
    { lowestSet: lo, focusCol: lo },
  );

  // Compute AND.
  const and = n & m;
  rows.push({ label: `n&(n-1)= ${and}`, bits: toBits(and, width) });
  emit(
    'AND',
    `n&(n-1)=${and}`,
    `Bitwise AND keeps a 1 only where BOTH numbers have a 1. Since n and n-1 disagree on every bit from the lowest set bit down, the AND clears that whole tail. Result = ${and}.`,
    { lowestSet: lo, focusCol: lo },
  );

  const result = and === 0;
  emit(
    'VERDICT',
    result ? 'power of two' : 'not power of two',
    result
      ? `n & (n-1) = 0, meaning n had only one set bit — clearing it left nothing. So ${n} IS a power of two → true.`
      : `n & (n-1) = ${and} ≠ 0, so other set bits survived: ${n} had more than one 1-bit. So ${n} is NOT a power of two → false.`,
    { result, done: true },
    result ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PowerTwoState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span> · test{' '}
        <span className="font-mono text-ink">n &gt; 0 &amp;&amp; (n &amp; (n-1)) == 0</span>
      </div>

      {s.rows.length === 0 ? (
        <div className={cn('mt-2 font-mono text-ink3', vizText.sm)}>…preparing bits</div>
      ) : (
        <div className="mt-2 space-y-2">
          {s.rows.map((r, ri) => {
            const isAnd = ri === 2;
            const tone = (col: number) =>
              isAnd
                ? r.bits[col] === '1'
                  ? 'match'
                  : ''
                : s.lowestSet === col && r.bits[col] === '1'
                  ? 'match'
                  : '';
            const pointers: ArrayPointer[] =
              !isAnd && s.lowestSet !== null && ri === 0
                ? [{ i: s.lowestSet, label: 'lowest 1', tone: 'accent', place: 'above' }]
                : [];
            return (
              <div key={ri}>
                <div className={cn('font-mono text-ink3', vizText.xs)}>{r.label}</div>
                <ArrayRow
                  values={r.bits}
                  cellTone={tone}
                  pointers={pointers}
                  windowRange={null}
                  label={(i) => 2 ** (s.width - 1 - i)}
                />
              </div>
            );
          })}
        </div>
      )}

      {s.result !== null && (
        <div className={cn('mt-2 font-mono', vizText.base, s.result ? 'text-good' : 'text-bad')}>
          → {String(s.result)}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PowerTwoState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const bitStr = (label: string) => s.rows.find((r) => r.label.startsWith(label))?.bits.join('') ?? '—';
  const setBits = s.n > 0 ? s.n.toString(2).split('').filter((c) => c === '1').length : 0;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="n (binary)" v={s.n > 0 ? s.n.toString(2) : '—'} />
      <InspectorRow k="set bits in n" v={s.n > 0 ? setBits : '—'} />
      <InspectorRow k="n-1 (bits)" v={bitStr('n-1')} />
      <InspectorRow k="n&(n-1) (bits)" v={bitStr('n&(n-1)')} />
      <InspectorRow k="result" v={s.result !== null ? String(s.result) : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-power-two';
export const title = 'Power two';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'pt16', label: 'n = 16 (power of two)', value: { n: 16 } },
    { id: 'pt6', label: 'n = 6 (not power of two)', value: { n: 6 } },
  ] satisfies SampleInput<PowerTwoInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PowerTwoState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? `${s?.n} is a power of two` : `${s?.n ?? '?'} is not a power of two` };
  },
};

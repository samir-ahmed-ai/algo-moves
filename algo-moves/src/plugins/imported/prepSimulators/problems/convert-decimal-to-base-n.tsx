import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

const DIGITS = '0123456789ABCDEF';

interface ConvertInput {
  n: number;
  base: number;
}

interface ConvertState {
  n: number; // original decimal input
  base: number;
  neg: boolean; // was the input negative
  cur: number; // current working value (n after divisions)
  rem: number | null; // most recent remainder n % base
  digit: string | null; // symbol for the most recent remainder
  collected: string[]; // remainders in collection order (reversed vs final)
  reversing: boolean; // true once we start the reversal phase
  swap: [number, number] | null; // indices being swapped in the reversal
  result: string | null; // final answer once done
  done: boolean;
}

function record({ n, base }: ConvertInput): Frame<ConvertState>[] {
  const frames: Frame<ConvertState>[] = [];
  const collected: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<ConvertState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        n,
        base,
        neg: n < 0,
        cur: 0,
        rem: null,
        digit: null,
        collected: collected.slice(),
        reversing: false,
        swap: null,
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${n} → base ${base}`,
    `Convert ${n} to base ${base} by repeated divmod: at each step take n % ${base} as the next digit (least-significant first), then divide n by ${base}. The digits come out reversed, so we flip them at the end.`,
    { cur: n },
  );

  // Special case: zero.
  if (n === 0) {
    emit(
      'ZERO',
      '0',
      `The input is 0, which is "0" in every base. Return "0" directly.`,
      { cur: 0, result: '0', collected: ['0'], done: true },
      'good',
    );
    return frames;
  }

  const neg = n < 0;
  let cur = neg ? -n : n;
  if (neg) {
    emit(
      'ABS',
      `|n| = ${cur}`,
      `${n} is negative, so we remember the sign and work with the absolute value ${cur}. The '-' is prepended after conversion.`,
      { cur },
    );
  }

  // Repeated divmod: collect remainders least-significant first.
  while (cur > 0) {
    const rem = cur % base;
    const digit = DIGITS[rem];
    const next = Math.floor(cur / base);
    collected.push(digit);
    emit(
      'DIVMOD',
      `${cur} % ${base} = ${rem}`,
      `${cur} % ${base} = ${rem}, which maps to digit '${digit}'. Append it, then set n = ⌊${cur} / ${base}⌋ = ${next}. These digits are in reverse (least-significant) order for now.`,
      { cur, rem, digit, collected: collected.slice() },
    );
    cur = next;
  }

  emit(
    'COLLECTED',
    `${collected.length} digits`,
    `n has been divided down to 0. The collected digits [${collected.join(', ')}] are least-significant first, so the number reads correctly only once reversed.`,
    { cur: 0, collected: collected.slice() },
  );

  // Reverse the collected digits in place (mirrors the Go two-pointer swap).
  const out = collected.slice();
  let l = 0;
  let r = out.length - 1;
  while (l < r) {
    const tmp = out[l];
    out[l] = out[r];
    out[r] = tmp;
    emit(
      'SWAP',
      `swap ${l} ↔ ${r}`,
      `Reverse in place: swap positions ${l} and ${r} so the most-significant digit moves to the front. Now [${out.join(', ')}].`,
      { cur: 0, collected: out.slice(), reversing: true, swap: [l, r] },
    );
    l++;
    r--;
  }

  const result = (neg ? '-' : '') + out.join('');
  emit(
    'DONE',
    result,
    `Reversal complete. Joining the digits${neg ? " with a leading '-'" : ''} gives "${result}" — that is ${n} written in base ${base}.`,
    { cur: 0, collected: out.slice(), reversing: true, result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ConvertState>) {
  const s = frame.state;
  const cells = s.collected.length > 0 ? s.collected : ['·'];
  const pointers: ArrayPointer[] = [];
  if (s.swap) {
    pointers.push({ i: s.swap[0], label: 'l', tone: 'accent', place: 'above' });
    pointers.push({ i: s.swap[1], label: 'r', tone: 'warn', place: 'below' });
  } else if (!s.reversing && s.collected.length > 0) {
    pointers.push({ i: s.collected.length - 1, label: 'last', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.done) return 'found';
    if (s.swap && (i === s.swap[0] || i === s.swap[1])) return 'match';
    if (!s.reversing && i === s.collected.length - 1) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>
        {' · base '}
        <span className="font-mono text-ink">{s.base}</span>
        {!s.done && (
          <>
            {' · working n = '}
            <span className="font-mono text-ink">{s.cur}</span>
          </>
        )}
      </div>
      {s.rem !== null && s.digit !== null && !s.reversing && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          {s.cur} % {s.base} = <span className="text-ink">{s.rem}</span> → '
          <span className="text-ink">{s.digit}</span>'
        </div>
      )}
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.reversing ? 'digits reversed → most-significant first' : 'remainders collected least-significant first'}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ "{s.result}"</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ConvertState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (input)" v={s.n} />
      <InspectorRow k="base" v={s.base} />
      <InspectorRow k="working n" v={s.cur} />
      <InspectorRow k="n % base" v={s.rem ?? '—'} />
      <InspectorRow k="digit" v={s.digit ?? '—'} />
      <InspectorRow k="collected" v={s.collected.length > 0 ? s.collected.join('') : '—'} />
      <InspectorRow k="phase" v={s.done ? 'done' : s.reversing ? 'reversing' : 'divmod'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

function compute(n: number, base: number): string {
  if (n === 0) return '0';
  const neg = n < 0;
  let cur = neg ? -n : n;
  let out = '';
  while (cur > 0) {
    out = DIGITS[cur % base] + out;
    cur = Math.floor(cur / base);
  }
  return (neg ? '-' : '') + out;
}

export const manifestId = 'prep-math-convert-decimal-to-base-n';
export const title = 'Convert decimal to base N';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'cb1', label: '45 → base 16', value: { n: 45, base: 16 } },
    { id: 'cb2', label: '13 → base 2', value: { n: 13, base: 2 } },
  ] satisfies SampleInput<ConvertInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ConvertState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const expected = compute(s.n, s.base);
    const ok = s.result === expected;
    return { ok, label: s.result ?? expected };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';

interface AtoiInput {
  s: string;
}

interface AtoiState {
  chars: string[]; // each character of s, rendered as an ArrayRow cell
  i: number | null; // scan cursor
  sign: 1 | -1; // parsed sign
  result: number; // accumulator so far
  digit: number | null; // digit just consumed
  clamped: boolean; // hit the overflow guard
  answer: number | null; // final returned value
  done: boolean;
}

// 32-bit signed clamp bounds, matching the Go int overflow guard's behaviour.
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;

function record({ s }: AtoiInput): Frame<AtoiState>[] {
  const chars = [...s];
  const n = chars.length;
  let sign: 1 | -1 = 1;
  let result = 0;

  const { emit, frames } = createRecorder<AtoiState>(() => ({
        chars,
        i: null,
        sign,
        result,
        digit: null,
        clamped: false,
        answer: null,
        done: false
      }));

  emit(
    'INIT',
    `s="${s}"`,
    `Parse the string "${s}" into an integer, mimicking atoi: skip leading spaces, read an optional sign, then consume digits left to right building result = result*10 + digit, clamping on overflow.`,
    { i: 0 },
  );

  let i = 0;
  // 1) Skip leading spaces.
  while (i < n && chars[i] === ' ') {
    emit('SKIP', `space @${i}`, `Character at index ${i} is a space, so skip it and advance the cursor.`, {
      i,
    });
    i++;
  }

  if (i === n) {
    emit(
      'EMPTY',
      'return 0',
      `Reached the end without any sign or digit — nothing to parse, so the result is 0.`,
      { i: n, answer: 0, done: true },
      'bad',
    );
    return frames;
  }

  // 2) Read an optional sign.
  if (chars[i] === '-') {
    sign = -1;
    emit('SIGN', `sign=-1 @${i}`, `Character at index ${i} is '-', so the number is negative. Advance past the sign.`, {
      i,
      sign,
    });
    i++;
  } else if (chars[i] === '+') {
    emit('SIGN', `sign=+1 @${i}`, `Character at index ${i} is '+', so the number stays positive. Advance past the sign.`, {
      i,
    });
    i++;
  } else {
    emit('SIGN', `sign=+1`, `No explicit sign at index ${i}, so the number defaults to positive.`, { i });
  }

  // 3) Consume digits with an overflow guard.
  while (i < n && chars[i] >= '0' && chars[i] <= '9') {
    const digit = chars[i].charCodeAt(0) - 48;

    if (sign === 1 && result > Math.floor((INT_MAX - digit) / 10)) {
      emit(
        'CLAMP',
        `overflow → ${INT_MAX}`,
        `Adding digit ${digit} would push result past INT_MAX (${INT_MAX}) because result ${result} > (${INT_MAX} − ${digit}) / 10. Clamp to INT_MAX and stop.`,
        { i, digit, clamped: true, answer: INT_MAX, done: true },
        'bad',
      );
      return frames;
    }
    if (sign === -1 && result * -1 < Math.ceil((INT_MIN + digit) / 10)) {
      emit(
        'CLAMP',
        `underflow → ${INT_MIN}`,
        `Adding digit ${digit} would push result below INT_MIN (${INT_MIN}). Clamp to INT_MIN and stop.`,
        { i, digit, clamped: true, answer: INT_MIN, done: true },
        'bad',
      );
      return frames;
    }

    result = result * 10 + digit;
    emit(
      'DIGIT',
      `result=${sign * result}`,
      `Character at index ${i} is '${chars[i]}' (digit ${digit}). result = result*10 + ${digit} = ${result}. With the sign applied that is ${sign * result}.`,
      { i, digit },
    );
    i++;
  }

  const answer = sign * result;
  emit(
    'DONE',
    `return ${answer}`,
    `Cursor reached a non-digit or the end of the string. Apply the sign to get the final answer ${answer}.`,
    { i, answer, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<AtoiState>) {
  const s = frame.state;
  const cells = s.chars.map((c) => (c === ' ' ? '␣' : c));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i >= 0 && s.i < s.chars.length) {
    pointers.push({ i: s.i, label: 'i', tone: s.clamped ? 'bad' : 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.i === i && s.done) return s.clamped ? 'dead' : 'found';
    if (s.i === i) return 'match';
    if (s.i !== null && i < s.i) return 'dead';
    return '';
  };
  const signStr = s.sign === -1 ? '−' : '+';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        sign = <span className="font-mono text-ink">{signStr}</span>
        {' · '}result ={' '}
        <span className="font-mono text-ink">{s.result}</span>
        {s.digit !== null && !s.done && (
          <>
            {' · '}digit ={' '}
            <span className="font-mono text-ink">{s.digit}</span>
          </>
        )}
      </div>
      {cells.length > 0 ? (
        <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('font-mono text-ink3', vizText.sm)}>(empty string)</div>
      )}
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        acc = {s.sign === -1 ? '−' : ''}
        {s.result}
      </div>
      {s.answer !== null && (
        <div
          className={cn('mt-1 font-mono', s.clamped ? 'text-bad' : 'text-good', vizText.base)}
        >
          → {s.answer}
          {s.clamped ? ' (clamped)' : ''}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<AtoiState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const ch = s.i !== null && s.i >= 0 && s.i < s.chars.length ? s.chars[s.i] : null;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="s[i]" v={ch === null ? '—' : ch === ' ' ? '␣' : ch} />
      <InspectorRow k="sign" v={s.sign === -1 ? '−1' : '+1'} />
      <InspectorRow k="digit" v={s.digit ?? '—'} />
      <InspectorRow k="result (unsigned)" v={s.result} />
      <InspectorRow k="answer" v={s.answer === null ? '…' : s.answer} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-convert-string-to-integer';
export const title = 'Convert string to integer';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'atoi1', label: '"   -042"', value: { s: '   -042' } },
    { id: 'atoi2', label: '"91283472332" (overflow)', value: { s: '91283472332' } },
  ] satisfies SampleInput<AtoiInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AtoiState | undefined;
    if (!s || s.answer === null) return { ok: false, label: 'no result' };
    return { ok: true, label: `${s.answer}` };
  },
};

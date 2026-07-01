import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ValidNumberInput {
  s: string;
}

interface ValidNumberState {
  chars: string[];
  i: number | null; // char currently under inspection
  seenDigit: boolean;
  seenDot: boolean;
  seenExp: boolean;
  result: boolean | null; // final verdict, null while scanning
  done: boolean;
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function record({ s }: ValidNumberInput): Frame<ValidNumberState>[] {
  const chars = s.split('');
  const frames: Frame<ValidNumberState>[] = [];

  let seenDigit = false;
  let seenDot = false;
  let seenExp = false;

  const emit = (
    type: string,
    note: string,
    caption: string,
    over: {
      i?: number | null;
      result?: boolean | null;
      done?: boolean;
    },
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        chars,
        i: over.i ?? null,
        seenDigit,
        seenDot,
        seenExp,
        result: over.result ?? null,
        done: over.done ?? false,
      },
    });

  emit(
    'INIT',
    `"${s}"`,
    `Valid Number: scan "${s}" once, tracking three flags — seenDigit, seenDot, seenExp. Every character must be legal in its position; at the end the string is valid only if at least one digit was seen.`,
    {},
  );

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];

    if (isDigit(c)) {
      seenDigit = true;
      emit(
        'DIGIT',
        `'${c}' digit`,
        `'${c}' is a digit — always allowed. Set seenDigit = true.`,
        { i },
        'good',
      );
      continue;
    }

    if (c === '+' || c === '-') {
      // A sign is only valid at the start or immediately after an exponent.
      if (i > 0 && chars[i - 1] !== 'e' && chars[i - 1] !== 'E') {
        emit(
          'REJECT',
          `'${c}' sign`,
          `'${c}' is a sign but it is at index ${i}, not the start and not right after 'e'/'E' (previous char is '${chars[i - 1]}'). A sign is only legal leading the number or the exponent. Reject.`,
          { i, result: false, done: true },
          'bad',
        );
        return frames;
      }
      emit(
        'SIGN',
        `'${c}' sign ok`,
        `'${c}' is a sign in a valid spot — ${i === 0 ? 'it leads the number' : "it follows 'e'/'E'"}. No flag changes; a sign carries no digit on its own.`,
        { i },
      );
      continue;
    }

    if (c === 'e' || c === 'E') {
      if (seenExp || !seenDigit) {
        emit(
          'REJECT',
          `'${c}' exp`,
          `'${c}' starts an exponent, but ${seenExp ? 'we already saw one exponent' : 'no digit has appeared before it'}. An exponent needs a preceding digit and may appear only once. Reject.`,
          { i, result: false, done: true },
          'bad',
        );
        return frames;
      }
      seenExp = true;
      seenDigit = false; // the exponent must be followed by its own digits
      emit(
        'EXP',
        `'${c}' exp ok`,
        `'${c}' begins the exponent. Set seenExp = true and reset seenDigit = false, because the part after 'e'/'E' must contain its own digit.`,
        { i },
      );
      continue;
    }

    if (c === '.') {
      if (seenDot || seenExp) {
        emit(
          'REJECT',
          `'${c}' dot`,
          `'${c}' is a decimal point, but ${seenDot ? 'we already saw a dot' : 'we are past an exponent, where dots are not allowed'}. A dot may appear at most once and only before any exponent. Reject.`,
          { i, result: false, done: true },
          'bad',
        );
        return frames;
      }
      seenDot = true;
      emit(
        'DOT',
        `'${c}' dot ok`,
        `'${c}' is the first decimal point and comes before any exponent. Set seenDot = true.`,
        { i },
      );
      continue;
    }

    // Any other character is illegal.
    emit(
      'REJECT',
      `'${c}' bad`,
      `'${c}' is not a digit, sign, 'e'/'E', or '.', so it can never appear in a valid number. Reject.`,
      { i, result: false, done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'DONE',
    seenDigit ? 'valid' : 'no digit',
    `Reached the end of the string. The answer is seenDigit = ${seenDigit}${seenDigit ? ' — at least one digit was seen, so the string is a valid number.' : ' — no digit ever appeared, so this is not a valid number.'}`,
    { result: seenDigit, done: true },
    seenDigit ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ValidNumberState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    pointers.push({
      i: s.i,
      label: 'i',
      tone: s.result === false ? 'bad' : 'accent',
      place: 'above',
    });
  }
  const tone = (i: number) => {
    if (s.i !== i) return '';
    if (s.result === false) return 'dead';
    return 'match';
  };
  const flag = (on: boolean) => (
    <span className={cn('font-mono', on ? 'text-good' : 'text-ink3')}>{on ? 'true' : 'false'}</span>
  );
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        seenDigit = {flag(s.seenDigit)}
        {' · '}seenDot = {flag(s.seenDot)}
        {' · '}seenExp = {flag(s.seenExp)}
      </div>
      {s.chars.length > 0 ? (
        <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <div className={cn('font-mono text-ink3', vizText.base)}>(empty string)</div>
      )}
      {s.result !== null && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.result ? 'text-good' : 'text-bad',
          )}
        >
          → {s.result ? 'valid number' : 'not a number'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ValidNumberState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char" v={s.i !== null ? `'${s.chars[s.i]}'` : '—'} />
      <InspectorRow k="seenDigit" v={String(s.seenDigit)} />
      <InspectorRow k="seenDot" v={String(s.seenDot)} />
      <InspectorRow k="seenExp" v={String(s.seenExp)} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'valid' : 'invalid'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-valid-number';
export const title = 'Valid Number';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'vn1', label: '"2e-3" → valid', value: { s: '2e-3' } },
    { id: 'vn2', label: '"1a" → invalid', value: { s: '1a' } },
  ] satisfies SampleInput<ValidNumberInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ValidNumberState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'valid number' : 'not a number' };
  },
};

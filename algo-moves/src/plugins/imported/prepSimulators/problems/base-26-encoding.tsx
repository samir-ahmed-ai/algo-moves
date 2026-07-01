import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Base26Input {
  n: number;
}

interface Base26State {
  n0: number; // the original number being encoded
  n: number; // current working value of n as we chip off digits
  digits: string[]; // letters produced so far, in the order emitted (least-significant first)
  rem: number | null; // most recent n % 26 remainder
  letter: string | null; // most recent letter emitted
  reversed: boolean; // whether digits now hold the final left-to-right order
  result: string | null; // final encoded string once done
  done: boolean;
}

function record({ n }: Base26Input): Frame<Base26State>[] {  const digits: string[] = [];
  let cur = n;

  const { emit, frames } = createRecorder<Base26State>(() => ({
        n0: n,
        n: cur,
        digits: digits.slice(),
        rem: null,
        letter: null,
        reversed: false,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `n=${n}`,
    `Base-26 (Excel-column) encoding of n = ${n}. This is a bijective base 26 where A=1..Z=26 and there is no zero digit, so each step decrements n by 1 before taking n % 26. We peel off one letter per step, least-significant first, then reverse.`,
    {},
  );

  if (n <= 0) {
    emit(
      'DONE',
      'empty',
      `n = ${n} is not a positive column number, so the encoding is the empty string.`,
      { result: '', reversed: true, done: true },
      'bad',
    );
    return frames;
  }

  while (cur > 0) {
    const before = cur;
    cur -= 1;
    emit(
      'DECR',
      `n=${before}→${cur}`,
      `Decrement first: n = ${before} − 1 = ${cur}. The −1 shifts the range so remainder 0 maps to 'A' (making the encoding bijective, with no zero digit).`,
      { n: cur },
    );

    const rem = cur % 26;
    const letter = String.fromCharCode('A'.charCodeAt(0) + rem);
    digits.push(letter);
    emit(
      'DIGIT',
      `${rem}→${letter}`,
      `Take the least-significant base-26 digit: ${cur} % 26 = ${rem}, which is the letter '${letter}' ('A' + ${rem}). Append it to the output buffer.`,
      { n: cur, rem, letter },
    );

    const next = Math.floor(cur / 26);
    emit(
      'DIV',
      `n=${cur}/26=${next}`,
      `Divide down to move to the next-higher digit: n = ⌊${cur} / 26⌋ = ${next}. ${next > 0 ? 'Still positive, so keep peeling letters.' : 'Now zero, so the loop stops.'}`,
      { n: next },
    );
    cur = next;
  }

  digits.reverse();
  const result = digits.join('');
  emit(
    'REVERSE',
    result,
    `Letters were produced least-significant first, so reverse the buffer to read the number left-to-right. The result is "${result}".`,
    { reversed: true, result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<Base26State>) {
  const s = frame.state;
  const cells = s.digits.length > 0 ? s.digits : [' '];
  const pointers: ArrayPointer[] = [];
  if (!s.reversed && s.digits.length > 0) {
    pointers.push({ i: s.digits.length - 1, label: 'new', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.digits.length === 0) return '';
    if (s.reversed) return 'found';
    return i === s.digits.length - 1 ? 'match' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n0}</span>
        {' · '}remaining ={' '}
        <span className="font-mono text-ink">{s.n}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.reversed ? 'order = left → right (final)' : 'order = least-significant first'}
      </div>
      {s.rem !== null && s.letter !== null && !s.reversed && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink2')}>
          {s.n} % 26 = {s.rem} → '{s.letter}'
        </div>
      )}
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ "{s.result}"</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<Base26State>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (input)" v={s.n0} />
      <InspectorRow k="n (working)" v={s.n} />
      <InspectorRow k="n % 26" v={s.rem ?? '—'} />
      <InspectorRow k="letter" v={s.letter ? `'${s.letter}'` : '—'} />
      <InspectorRow k="buffer" v={s.digits.length > 0 ? s.digits.join('') : '—'} />
      <InspectorRow k="result" v={s.result !== null ? `"${s.result}"` : s.done ? '""' : '…'} />
    </VarGrid>
  );
}

function encode(n: number): string {
  if (n <= 0) return '';
  const out: string[] = [];
  let cur = n;
  while (cur > 0) {
    cur -= 1;
    out.push(String.fromCharCode('A'.charCodeAt(0) + (cur % 26)));
    cur = Math.floor(cur / 26);
  }
  out.reverse();
  return out.join('');
}

export const manifestId = 'prep-math-base-26-encoding';
export const title = 'Base 26 encoding';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'b26a', label: 'n = 28 → AB', value: { n: 28 } },
    { id: 'b26b', label: 'n = 701 → ZY', value: { n: 701 } },
  ] satisfies SampleInput<Base26Input>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as Base26State | undefined;
    const answer = s ? encode(s.n0) : '';
    return answer ? { ok: true, label: `"${answer}"` } : { ok: false, label: 'empty' };
  },
};

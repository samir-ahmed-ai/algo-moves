import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PalinInput {
  n: number;
}

interface PalinState {
  original: number; // the untouched input, for the digit strip
  n: number; // shrinking front half
  rev: number; // growing reversed back half
  digits: string[]; // digit cells of `original`, left→right
  frontCount: number; // how many leading digits still belong to `n`
  result: boolean | null; // final verdict once known
  done: boolean;
}

function record({ n: input }: PalinInput): Frame<PalinState>[] {  const digits = Math.abs(input).toString().split('');
  if (input < 0) digits.unshift('-');

  let n = input;
  let rev = 0;

  const { emit, frames } = createRecorder<PalinState>(() => ({
        original: input,
        n,
        rev,
        digits,
        frontCount: n < 0 ? digits.length : n.toString().length,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `n=${input}`,
    `Is ${input} a palindrome? We reverse only the back half of the number: build rev by peeling the last digit of n each step, and stop once rev catches up to n. That is O(log n) time and O(1) space — no string conversion.`,
    { frontCount: input < 0 ? digits.length : Math.abs(input).toString().length },
  );

  // Guard: negatives, and any number divisible by 10 (trailing zero) except 0 itself.
  if (input < 0 || (input % 10 === 0 && input !== 0)) {
    const reason =
      input < 0
        ? `${input} is negative — the leading minus sign can never match a trailing digit`
        : `${input} ends in 0, so a mirror would need a leading 0, which numbers do not have`;
    emit(
      'GUARD',
      'reject',
      `Early reject: ${reason}. Answer: not a palindrome.`,
      { result: false, done: true },
      'bad',
    );
    return frames;
  }

  // Reverse the back half while n > rev.
  while (n > rev) {
    const last = n % 10;
    rev = rev * 10 + last;
    n = Math.trunc(n / 10);
    emit(
      'PEEL',
      `rev=${rev}`,
      `Peel the last digit ${last} off n and push it onto rev: rev = rev·10 + ${last} = ${rev}, then drop it from n so n = ${n}. Loop continues while n (${n}) > rev (${rev}).`,
      {},
    );
  }

  // Meet in the middle: even length → n == rev; odd length → n == rev/10 (drop the shared middle digit).
  const revNoMid = Math.trunc(rev / 10);
  const isPalin = n === rev || n === revNoMid;
  const branch =
    n === rev
      ? `Even digit count: n (${n}) equals rev (${rev}) exactly`
      : n === revNoMid
        ? `Odd digit count: drop rev's shared middle digit → rev/10 = ${revNoMid}, which equals n (${n})`
        : `Neither n (${n}) == rev (${rev}) nor n (${n}) == rev/10 (${revNoMid})`;
  emit(
    'COMPARE',
    isPalin ? 'match' : 'mismatch',
    `The halves met. ${branch}. So ${input} is ${isPalin ? '' : 'not '}a palindrome.`,
    { result: isPalin, done: true },
    isPalin ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PalinState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  // A divider marker: the front pointer sits over the last digit still in `n`.
  if (!s.done || s.result !== null) {
    if (s.frontCount > 0 && s.frontCount <= s.digits.length) {
      pointers.push({ i: s.frontCount - 1, label: 'front (n)', tone: 'accent', place: 'above' });
    }
    if (s.frontCount < s.digits.length) {
      pointers.push({ i: s.frontCount, label: 'back (rev)', tone: 'good', place: 'below' });
    }
  }
  const tone = (i: number) => {
    if (s.result === true) return 'found';
    if (s.result === false) return 'dead';
    return i < s.frontCount ? 'lo' : 'hi';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        original = <span className="font-mono text-ink">{s.original}</span>
      </div>
      <ArrayRow values={s.digits} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        n = <span className="text-ink">{s.n}</span>
        {'   '}rev = <span className="text-ink">{s.rev}</span>
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono', vizText.base, s.result ? 'text-good' : 'text-bad')}>
          → {s.result ? 'palindrome' : 'not a palindrome'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PalinState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="original" v={s.original} />
      <InspectorRow k="n (front half)" v={s.n} />
      <InspectorRow k="rev (reversed back)" v={s.rev} />
      <InspectorRow k="rev / 10" v={Math.trunc(s.rev / 10)} />
      <InspectorRow k="loop while" v={s.done ? 'ended' : `${s.n} > ${s.rev}`} />
      <InspectorRow
        k="result"
        v={s.result === null ? '…' : s.result ? 'palindrome' : 'not palindrome'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-is-palindromic-number';
export const title = 'Is palindromic number';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'pn121', label: 'n = 121', value: { n: 121 } },
    { id: 'pn1234', label: 'n = 1234', value: { n: 1234 } },
  ] satisfies SampleInput<PalinInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PalinState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'palindrome' : 'not a palindrome' };
  },
};

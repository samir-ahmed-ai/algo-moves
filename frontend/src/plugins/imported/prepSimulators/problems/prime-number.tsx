import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PrimeInput {
  n: number;
}

interface PrimeState {
  n: number;
  divisors: number[]; // candidate odd divisors 3, 5, 7 … up to sqrt(n)
  i: number | null; // index into divisors currently being tested
  divisor: number | null; // divisors[i]
  remainder: number | null; // n % divisor for the current test
  result: boolean | null; // final verdict once decided
  done: boolean;
}

// Faithful port of primeNumber(n int) bool:
//   n<2 -> false; n even -> n==2; test odd i from 3 while i*i<=n; n%i==0 -> false; else true.
function record({ n }: PrimeInput): Frame<PrimeState>[] {
  // Precompute the odd divisor candidates 3,5,7… while i*i<=n so the board can show them all.
  const divisors: number[] = [];
  for (let i = 3; i * i <= n; i += 2) divisors.push(i);

  const { emit, frames } = createRecorder<PrimeState>(() => ({
        n,
        divisors,
        i: null,
        divisor: null,
        remainder: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `n=${n}`,
    `Primality test by trial division: is ${n} prime? We only need to test divisors up to √${n}, because any factor larger than √${n} pairs with a smaller one we'd already have found. Time O(√n), space O(1).`,
    {},
  );

  // Guard 1: n < 2 is never prime (0 and 1, and negatives).
  if (n < 2) {
    emit(
      'GUARD',
      'n<2',
      `${n} is less than 2, and primes are defined to be ≥ 2. So ${n} is not prime.`,
      { result: false, done: true },
      'bad',
    );
    return frames;
  }

  // Guard 2: even numbers. Only 2 is an even prime.
  if (n % 2 === 0) {
    const isTwo = n === 2;
    emit(
      'EVEN',
      isTwo ? 'n==2' : 'even',
      isTwo
        ? `${n} is even, but 2 is the one and only even prime. So ${n} is prime.`
        : `${n} is even and larger than 2, so it is divisible by 2. So ${n} is not prime.`,
      { result: isTwo, done: true },
      isTwo ? 'good' : 'bad',
    );
    return frames;
  }

  emit(
    'ODD',
    'test odds',
    `${n} is odd and ≥ 3, so 2 is not a factor. Now test only the odd divisors 3, 5, 7 … while divisor² ≤ ${n}. If none divides ${n} evenly, ${n} is prime.`,
    {},
  );

  // Trial-divide by each odd candidate.
  for (let idx = 0; idx < divisors.length; idx++) {
    const d = divisors[idx];
    const rem = n % d;
    emit(
      'TEST',
      `${n}%${d}=${rem}`,
      `Try divisor ${d}: ${d}² = ${d * d} ≤ ${n}, so it is still in range. ${n} % ${d} = ${rem}. ${
        rem === 0 ? `That's 0, so ${d} divides ${n}.` : `Not 0, so ${d} is not a factor — keep going.`
      }`,
      { i: idx, divisor: d, remainder: rem },
      rem === 0 ? 'bad' : undefined,
    );
    if (rem === 0) {
      emit(
        'COMPOSITE',
        `${d} | ${n}`,
        `${n} = ${d} × ${n / d}, so ${n} has a divisor other than 1 and itself. ${n} is not prime.`,
        { i: idx, divisor: d, remainder: 0, result: false, done: true },
        'bad',
      );
      return frames;
    }
  }

  emit(
    'PRIME',
    'no factor',
    `No odd divisor up to √${n} divides ${n} evenly, so ${n} has no factors besides 1 and itself. ${n} is prime.`,
    { result: true, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PrimeState>) {
  const s = frame.state;
  const hasDivisors = s.divisors.length > 0;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null)
    pointers.push({ i: s.i, label: 'i', tone: s.result === false ? 'bad' : 'accent', place: 'above' });

  const tone = (i: number) => {
    if (s.i === i) return s.remainder === 0 ? 'dead' : 'match';
    return '';
  };

  const verdict =
    s.result === null ? '…testing' : s.result ? `${s.n} is PRIME` : `${s.n} is NOT prime`;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span>
        {s.divisor !== null && !s.done && (
          <>
            {' · '}test <span className="font-mono text-ink">{s.n} % {s.divisor}</span> ={' '}
            <span className="font-mono text-ink">{s.remainder}</span>
          </>
        )}
      </div>

      {hasDivisors ? (
        <>
          <div className={cn('mt-1', vizText.xs, 'text-ink3')}>odd divisor candidates (while d² ≤ n)</div>
          <ArrayRow values={s.divisors} cellTone={tone} pointers={pointers} windowRange={null} />
        </>
      ) : (
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
          no odd divisors to test (√{s.n} &lt; 3)
        </div>
      )}

      <div
        className={cn(
          'mt-2 font-mono',
          vizText.base,
          s.result === true ? 'text-good' : s.result === false ? 'text-bad' : 'text-ink3',
        )}
      >
        → {verdict}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PrimeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="divisor (i)" v={s.divisor ?? '—'} />
      <InspectorRow k="divisor²" v={s.divisor !== null ? s.divisor * s.divisor : '—'} />
      <InspectorRow k="n % divisor" v={s.remainder ?? '—'} />
      <InspectorRow k="candidates" v={s.divisors.length} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'prime' : 'not prime'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-prime-number';
export const title = 'Prime number';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'pn29', label: 'n = 29', value: { n: 29 } },
    { id: 'pn91', label: 'n = 91', value: { n: 91 } },
  ] satisfies SampleInput<PrimeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PrimeState | undefined;
    if (!s || s.result === null) return { ok: false, label: 'undecided' };
    return { ok: s.result, label: s.result ? `${s.n} is prime` : `${s.n} is not prime` };
  },
};

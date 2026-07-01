import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface FizzBuzzInput {
  n: number;
}

interface FizzBuzzState {
  n: number;
  out: string[]; // filled results so far; '' = not filled yet
  i: number | null; // current number being classified (1-based)
  by15: boolean | null; // did i % 15 == 0 (the check we make first)?
  by3: boolean | null; // did i % 3 == 0?
  by5: boolean | null; // did i % 5 == 0?
  picked: string | null; // the word placed for i this step
  done: boolean;
}

function record({ n }: FizzBuzzInput): Frame<FizzBuzzState>[] {  const out = new Array<string>(n).fill('');

  const { emit, frames } = createRecorder<FizzBuzzState>(() => ({
        n,
        out: out.slice(),
        i: null,
        by15: null,
        by3: null,
        by5: null,
        picked: null,
        done: false
      }));

  emit(
    'INIT',
    `n=${n}`,
    `FizzBuzz: for every number 1..${n} we print "FizzBuzz" if it is divisible by 15, else "Fizz" if divisible by 3, else "Buzz" if divisible by 5, otherwise the number itself. Order matters — the 15 check must come first.`,
    {},
  );

  for (let i = 1; i <= n; i++) {
    const by15 = i % 15 === 0;
    const by3 = i % 3 === 0;
    const by5 = i % 5 === 0;
    let picked: string;
    let caption: string;
    let tone: 'good' | 'bad' | undefined;

    if (by15) {
      picked = 'FizzBuzz';
      caption = `${i} % 15 = 0, so ${i} is divisible by both 3 and 5 — print "FizzBuzz". Checking 15 first is what stops us from wrongly printing just "Fizz" or "Buzz" here.`;
      tone = 'good';
    } else if (by3) {
      picked = 'Fizz';
      caption = `${i} % 15 ≠ 0 but ${i} % 3 = 0, so ${i} is a multiple of 3 (not 5) — print "Fizz".`;
    } else if (by5) {
      picked = 'Buzz';
      caption = `${i} % 15 ≠ 0 and ${i} % 3 ≠ 0, but ${i} % 5 = 0 — so ${i} is a multiple of 5 (not 3) — print "Buzz".`;
    } else {
      picked = String(i);
      caption = `${i} is not divisible by 3, 5, or 15, so none of the conditions fire — print the number itself, "${i}".`;
    }

    out[i - 1] = picked;
    emit(
      picked === String(i) ? 'NUM' : picked.toUpperCase(),
      `${i} → ${picked}`,
      caption,
      { i, by15, by3, by5, picked },
      tone,
    );
  }

  emit(
    'DONE',
    `${n} printed`,
    `Every number from 1 to ${n} has been classified and placed. The output array holds ${n} strings — that is the complete FizzBuzz sequence.`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FizzBuzzState>) {
  const s = frame.state;
  const display: (string | number)[] = s.out.map((v) => (v === '' ? '·' : v));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i - 1, label: 'i', tone: 'accent', place: 'above' });
  const tone = (idx: number) => {
    if (s.i !== null && idx === s.i - 1) return 'found';
    return s.out[idx] !== '' ? 'match' : '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        n = <span className="font-mono text-ink">{s.n}</span> · index i shown as its 1-based number
      </div>
      <ArrayRow
        values={display}
        cellTone={tone}
        pointers={pointers}
        windowRange={null}
        label={(idx) => idx + 1}
      />
      {s.i !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          i = <span className="text-ink">{s.i}</span>
          {'  '}·{'  '}%15={s.by15 ? '0' : '≠0'}
          {'  '}%3={s.by3 ? '0' : '≠0'}
          {'  '}%5={s.by5 ? '0' : '≠0'}
          {s.picked !== null && (
            <>
              {'  '}→ <span className="text-ink">{s.picked}</span>
            </>
          )}
        </div>
      )}
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          [{s.out.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<FizzBuzzState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const filled = s.out.filter((v) => v !== '').length;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="i % 15 == 0" v={s.by15 === null ? '—' : s.by15 ? 'true' : 'false'} />
      <InspectorRow k="i % 3 == 0" v={s.by3 === null ? '—' : s.by3 ? 'true' : 'false'} />
      <InspectorRow k="i % 5 == 0" v={s.by5 === null ? '—' : s.by5 ? 'true' : 'false'} />
      <InspectorRow k="printed" v={s.picked ?? '—'} />
      <InspectorRow k="filled / n" v={`${filled} / ${s.n}`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-fizzbuzz';
export const title = 'Fizzbuzz';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'fb5', label: 'n = 5', value: { n: 5 } },
    { id: 'fb8', label: 'n = 8', value: { n: 8 } },
  ] satisfies SampleInput<FizzBuzzInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FizzBuzzState | undefined;
    if (!s) return { ok: false, label: 'no output' };
    return { ok: true, label: `[${s.out.join(', ')}]` };
  },
};

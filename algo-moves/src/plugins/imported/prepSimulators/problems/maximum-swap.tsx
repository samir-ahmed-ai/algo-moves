import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MaxSwapInput {
  num: number;
}

interface MaxSwapState {
  digits: string[]; // current digit chars (mutated after the swap)
  num: number; // original number
  last: number[]; // last[d] = last index where digit d appears (-1 = absent)
  i: number | null; // current scan position
  d: number | null; // candidate larger digit we are testing (9..cur+1)
  swapWith: number | null; // index we swapped i with (the winning last[d])
  result: number | null; // final value once resolved
  done: boolean;
}

function record({ num }: MaxSwapInput): Frame<MaxSwapState>[] {  const s = String(num).split('');
  const last: number[] = new Array<number>(10).fill(-1);
  for (let i = 0; i < s.length; i++) last[s[i].charCodeAt(0) - 48] = i;

  const { emit, frames } = createRecorder<MaxSwapState>(() => ({
        digits: s.slice(),
        num,
        last: last.slice(),
        i: null,
        d: null,
        swapWith: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `num=${num}`,
    `Maximum Swap: swap at most two digits of ${num} to make the largest possible number. Greedy idea — for each position from the left, try to bring in a bigger digit that appears later. Time O(n), Space O(1).`,
    {},
  );

  emit(
    'LAST',
    'last[] built',
    `First record last[d] = the rightmost index where digit d appears. Swapping with the LAST occurrence of a bigger digit maximizes the gain (it moves the most significant possible position).`,
    {},
  );

  for (let i = 0; i < s.length; i++) {
    const cur = s[i].charCodeAt(0) - 48;
    emit(
      'SCAN',
      `pos ${i} = ${cur}`,
      `Position ${i} holds digit ${cur}. Look for the largest digit greater than ${cur} that appears somewhere to the right — putting a bigger digit this far left is the best improvement.`,
      { i },
    );
    for (let d = 9; d > cur; d--) {
      const hasLater = last[d] > i;
      emit(
        'TRY',
        `try ${d}`,
        `Is digit ${d} available at an index past ${i}? last[${d}] = ${last[d] === -1 ? 'none' : last[d]}${
          hasLater ? ` > ${i}, yes — this is the biggest digit we can pull left here.` : `, not to the right, skip.`
        }`,
        { i, d },
        hasLater ? 'good' : undefined,
      );
      if (hasLater) {
        const j = last[d];
        const tmp = s[i];
        s[i] = s[j];
        s[j] = tmp;
        const result = Number(s.join(''));
        emit(
          'SWAP',
          `${i}↔${j}`,
          `Swap position ${i} (${cur}) with position ${j} (${d}). The number becomes ${s.join('')} = ${result}. Because we scan left-to-right and pick the largest later digit, the very first swap we make is optimal — return immediately.`,
          { i, d, swapWith: j, result, done: true },
          'good',
        );
        return frames;
      }
    }
  }

  emit(
    'DONE',
    'already max',
    `No position had a larger digit later on, so ${num} is already the maximum — no swap helps. Answer: ${num}.`,
    { result: num, done: true },
  );
  return frames;
}

function View({ frame }: PluginViewProps<MaxSwapState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.swapWith !== null) pointers.push({ i: s.swapWith, label: 'swap', tone: 'good', place: 'below' });
  const tone = (idx: number) => {
    if (s.result !== null && (idx === s.i || idx === s.swapWith)) return 'found';
    if (idx === s.i) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        num = <span className="font-mono text-ink">{s.num}</span>
        {s.d !== null && !s.done && (
          <>
            {' · '}looking for digit ≥ <span className="font-mono text-ink">{s.d}</span> to the right
          </>
        )}
      </div>
      <ArrayRow values={s.digits} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.xs, 'text-ink3')}>
        last[d]:{' '}
        {s.last
          .map((v, d) => (v === -1 ? null : `${d}→${v}`))
          .filter(Boolean)
          .join('  ')}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MaxSwapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="num" v={s.num} />
      <InspectorRow k="i (pos)" v={s.i ?? '—'} />
      <InspectorRow k="digit at i" v={s.i !== null ? s.digits[s.i] : '—'} />
      <InspectorRow k="d (target)" v={s.d ?? '—'} />
      <InspectorRow k="last[d]" v={s.d !== null ? (s.last[s.d] === -1 ? 'none' : s.last[s.d]) : '—'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-maximum-swap';
export const title = 'Maximum Swap';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ms1', label: '2736', value: { num: 2736 } },
    { id: 'ms2', label: '9973', value: { num: 9973 } },
  ] satisfies SampleInput<MaxSwapInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MaxSwapState | undefined;
    const v = s?.result ?? null;
    return v !== null ? { ok: true, label: String(v) } : { ok: false, label: 'unresolved' };
  },
};

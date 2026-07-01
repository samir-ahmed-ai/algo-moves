import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SplitInput {
  finalSum: number;
}

interface SplitState {
  finalSum: number;
  res: number[]; // chosen even integers so far
  cur: number | null; // next candidate even integer 2,4,6,...
  sum: number; // running total of chosen integers
  lastAdjusted: boolean; // did we just dump the remainder onto the last element
  parity: 'odd' | 'ok' | null; // parity check outcome for the header
  done: boolean;
}

function record({ finalSum }: SplitInput): Frame<SplitState>[] {  const res: number[] = [];
  let sum = 0;

  const { emit, frames } = createRecorder<SplitState>(() => ({
        finalSum,
        res: res.slice(),
        cur: null,
        sum,
        lastAdjusted: false,
        parity: null,
        done: false
      }));

  emit(
    'INIT',
    `finalSum=${finalSum}`,
    `Maximum Split of Positive Even Integers: pick as many DISTINCT positive even integers as possible that add up to ${finalSum}. Greedily take the smallest unused evens 2, 4, 6, … while they still fit, then patch the remainder onto the last one.`,
    {},
  );

  if (finalSum % 2 !== 0) {
    emit(
      'PARITY',
      'odd → []',
      `${finalSum} is odd. Every even integer is even, and any sum of evens is even, so an odd target can never be reached. Return an empty list.`,
      { parity: 'odd', done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'PARITY',
    'even ✓',
    `${finalSum} is even, so a split is possible. Start the candidate at cur = 2 and a running sum of 0.`,
    { parity: 'ok', cur: 2 },
  );

  let cur = 2;
  // Greedy phase: keep taking the next even integer while it still fits.
  while (sum + cur <= finalSum) {
    emit(
      'TAKE',
      `+${cur}`,
      `sum (=${sum}) + cur (=${cur}) = ${sum + cur} ≤ ${finalSum}, so ${cur} still fits. Add it to the list and advance the running sum to ${sum + cur}.`,
      { cur },
      'good',
    );
    res.push(cur);
    sum += cur;
    cur += 2;
    emit(
      'ADVANCE',
      `cur=${cur}`,
      `Move to the next unused even integer: cur = ${cur}. Current sum = ${sum}, remaining = ${finalSum - sum}.`,
      { cur },
    );
  }

  emit(
    'STOP',
    `${sum}+${cur}>${finalSum}`,
    `Stop the greedy loop: sum (=${sum}) + cur (=${cur}) = ${sum + cur} would exceed ${finalSum}. We can't add a fresh even number, but there may be leftover ${finalSum - sum} to absorb.`,
    { cur },
  );

  const remainder = finalSum - sum;
  res[res.length - 1] += remainder;
  sum += remainder;
  emit(
    'PATCH',
    `last+=${remainder}`,
    `Dump the remaining ${remainder} onto the LAST element so the total hits ${finalSum} exactly. It stays even (even + even) and still larger than every earlier element, so all values remain distinct. Final list: [${res.join(', ')}].`,
    { lastAdjusted: true, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SplitState>) {
  const s = frame.state;
  const empty = s.parity === 'odd';
  const values = empty ? ['[]'] : s.res.length ? s.res : ['·'];
  const lastIdx = s.res.length - 1;
  const pointers: ArrayPointer[] = [];
  if (!empty && s.lastAdjusted && lastIdx >= 0) {
    pointers.push({ i: lastIdx, label: 'patched', tone: 'good', place: 'below' });
  }
  const tone = (i: number) => {
    if (empty) return 'dead';
    if (s.done && s.lastAdjusted) return i === lastIdx ? 'found' : 'match';
    if (s.done) return '';
    return i === lastIdx ? 'match' : '';
  };
  const remaining = s.finalSum - s.sum;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        finalSum = <span className="font-mono text-ink">{s.finalSum}</span>
        {' · '}sum = <span className="font-mono text-ink">{s.sum}</span>
        {!s.done && s.cur !== null && (
          <>
            {' · '}cur = <span className="font-mono text-ink">{s.cur}</span>
          </>
        )}
        {!empty && (
          <>
            {' · '}remaining ={' '}
            <span className={cn('font-mono', remaining === 0 ? 'text-good' : 'text-ink')}>{remaining}</span>
          </>
        )}
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        {empty ? 'no even split exists' : 'chosen distinct even integers (must sum to finalSum)'}
      </div>
      {s.done && !empty && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ [{s.res.join(', ')}]</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SplitState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const empty = s.parity === 'odd';
  return (
    <VarGrid>
      <InspectorRow k="finalSum" v={s.finalSum} />
      <InspectorRow k="cur (next even)" v={s.cur ?? '—'} />
      <InspectorRow k="sum" v={s.sum} />
      <InspectorRow k="remaining" v={empty ? '—' : s.finalSum - s.sum} />
      <InspectorRow k="count" v={empty ? 0 : s.res.length} />
      <InspectorRow k="result" v={empty ? '[]' : s.done ? `[${s.res.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-maximum-split-of-positive-even-integers';
export const title = 'Maximum Split of Positive Even Integers';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'mse12', label: 'finalSum = 12', value: { finalSum: 12 } },
    { id: 'mse7', label: 'finalSum = 7 (odd)', value: { finalSum: 7 } },
  ] satisfies SampleInput<SplitInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SplitState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    if (s.parity === 'odd') return { ok: true, label: '[] (odd)' };
    return { ok: true, label: `[${s.res.join(',')}]` };
  },
};

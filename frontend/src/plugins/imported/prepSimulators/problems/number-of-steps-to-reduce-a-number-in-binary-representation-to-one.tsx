import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface StepsInput {
  s: string;
}

interface StepsState {
  chars: string[];
  i: number | null; // current bit being processed (right-to-left, stops before index 0)
  bit: number | null; // raw digit at i (0/1)
  carry: number; // carry coming into this bit
  val: number | null; // bit + carry for this position
  steps: number; // steps accumulated so far
  done: boolean;
}

function record({ s }: StepsInput): Frame<StepsState>[] {
  const chars = s.split('');  let steps = 0;
  let carry = 0;

  const { emit, frames } = createRecorder<StepsState>(() => ({
        chars,
        i: null,
        bit: null,
        carry,
        val: null,
        steps,
        done: false
      }));

  emit(
    'INIT',
    `s=${s}`,
    `Reduce the binary number ${s} to 1. Rule: if the number is even, halve it (drop the last bit — 1 step); if odd, add 1 (2 steps to also halve). We simulate this bit-by-bit from the right, carrying a +1 when needed. Time O(n), Space O(1).`,
    { i: chars.length - 1 },
  );

  for (let i = chars.length - 1; i > 0; i--) {
    const bit = Number(chars[i]);
    const val = bit + carry;
    if (val % 2 === 1) {
      steps += 2;
      carry = 1;
      emit(
        'ODD',
        `+2 (carry=1)`,
        `Bit at index ${i} is ${bit}; with incoming carry ${val - bit} the value is ${val}, which is odd. Adding 1 makes it even, then halving — 2 steps. The +1 propagates left, so carry becomes 1.`,
        { i, bit, val, carry, steps },
      );
    } else {
      steps += 1;
      emit(
        'EVEN',
        `+1`,
        `Bit at index ${i} is ${bit}; with incoming carry ${val - bit} the value is ${val}, which is even. Just halve it — 1 step. No carry produced.`,
        { i, bit, val, carry, steps },
      );
    }
  }

  steps += carry;
  emit(
    'DONE',
    `${steps} steps`,
    `Reached the leading bit (index 0). Any leftover carry (${carry}) is one final +1 step to turn the top bits into a single 1. Total steps = ${steps}.`,
    { i: 0, done: true, steps },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<StepsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && !s.done) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number): string => {
    if (s.done && i === 0) return 'found';
    if (s.i === i && !s.done) return 'match';
    if (s.i !== null && i > s.i) return 'dead';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        carry = <span className="font-mono text-ink">{s.carry}</span>
        {s.val !== null && !s.done && (
          <>
            {' · '}bit + carry ={' '}
            <span className="font-mono text-ink">{s.val}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink3', vizText.base)}>
        steps = {s.steps}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<StepsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="bit s[i]" v={s.bit ?? '—'} />
      <InspectorRow k="carry" v={s.carry} />
      <InspectorRow k="bit + carry" v={s.val ?? '—'} />
      <InspectorRow k="parity" v={s.val === null ? '—' : s.val % 2 === 1 ? 'odd (+2)' : 'even (+1)'} />
      <InspectorRow k="steps" v={s.steps} />
    </VarGrid>
  );
}

function numSteps(s: string): number {
  let steps = 0;
  let carry = 0;
  for (let i = s.length - 1; i > 0; i--) {
    const val = Number(s[i]) + carry;
    if (val % 2 === 1) {
      steps += 2;
      carry = 1;
    } else {
      steps += 1;
    }
  }
  return steps + carry;
}

export const manifestId = 'prep-strings-number-of-steps-to-reduce-a-number-in-binary-representation-';
export const title = 'Number of Steps to Reduce a Number in Binary to One';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ns1', label: '"1101" → 6', value: { s: '1101' } },
    { id: 'ns2', label: '"10" → 1', value: { s: '10' } },
  ] satisfies SampleInput<StepsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as StepsState | undefined;
    const expected = s ? numSteps(s.chars.join('')) : 0;
    const ok = s ? s.steps === expected : false;
    return { ok, label: `${s?.steps ?? 0} steps` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface HammingInput {
  x: number;
  y: number;
}

interface HammingState {
  x: number;
  y: number;
  width: number; // number of bit columns rendered (MSB first)
  xBits: string[]; // binary digits of x, MSB first
  yBits: string[]; // binary digits of y, MSB first
  xorBits: string[]; // binary digits of xor, MSB first ('·' before it exists)
  scanned: number | null; // rightmost bit position (in MSB-first index) confirmed as differing so far
  clearAt: number | null; // MSB-first index of the bit cleared by xor &= xor-1 this step
  count: number;
  done: boolean;
}

/** Width wide enough to show every set bit of both numbers (min 4 columns). */
function bitWidth(x: number, y: number): number {
  const hi = Math.max(x, y, 1);
  return Math.max(4, Math.floor(Math.log2(hi)) + 1);
}

/** MSB-first binary digit array of `n` padded to `width` columns. */
function toBits(n: number, width: number): string[] {
  const out: string[] = [];
  for (let b = width - 1; b >= 0; b--) out.push(((n >> b) & 1).toString());
  return out;
}

/** MSB-first column index of bit position `b` (0 = LSB) within `width`. */
function colOf(b: number, width: number): number {
  return width - 1 - b;
}

function record({ x, y }: HammingInput): Frame<HammingState>[] {  const width = bitWidth(x, y);
  const xBits = toBits(x, width);
  const yBits = toBits(y, width);

  let xor = x ^ y;
  let count = 0;
  const noXor: string[] = new Array<string>(width).fill('·');

  const { emit, frames } = createRecorder<HammingState>(() => ({
        x,
        y,
        width,
        xBits,
        yBits,
        xorBits: noXor,
        scanned: null,
        clearAt: null,
        count,
        done: false
      }));

  emit(
    'INIT',
    `x=${x}, y=${y}`,
    `Hamming distance counts the bit positions where x and y differ. x = ${x} = ${xBits.join('')}₂ and y = ${y} = ${yBits.join('')}₂ (shown MSB first). We compare them one bit at a time using XOR.`,
    {},
  );

  const xorBits = toBits(xor, width);
  emit(
    'XOR',
    `x^y=${xor}`,
    `Compute xor = x ^ y = ${xor} = ${xorBits.join('')}₂. XOR puts a 1 exactly where the two numbers disagree, so every 1 in xor is one unit of Hamming distance.`,
    { xorBits },
  );

  // Illustrative left-to-right scan of the XOR row so each differing bit reads.
  for (let b = width - 1; b >= 0; b--) {
    const col = colOf(b, width);
    const differs = ((xor >> b) & 1) === 1;
    emit(
      differs ? 'DIFF' : 'SAME',
      differs ? `bit ${b}: 1` : `bit ${b}: 0`,
      differs
        ? `Bit position ${b}: x has ${xBits[col]}, y has ${yBits[col]} — they differ, so xor's bit is 1. This position adds to the distance.`
        : `Bit position ${b}: x and y both have ${xBits[col]} — they match, so xor's bit is 0 and this position adds nothing.`,
      { xorBits, scanned: col },
      differs ? 'good' : undefined,
    );
  }

  // Brian Kernighan popcount: each xor &= xor-1 clears the lowest set bit.
  while (xor !== 0) {
    const lowest = xor & -xor; // isolates lowest set bit
    const b = Math.round(Math.log2(lowest));
    const col = colOf(b, width);
    xor &= xor - 1;
    count++;
    const after = toBits(xor, width);
    emit(
      'POP',
      `count=${count}`,
      `Brian Kernighan trick: xor &= xor − 1 clears the lowest set 1-bit (position ${b}). Each clear is one differing bit, so bump count to ${count}. xor is now ${after.join('')}₂.`,
      { xorBits: after, clearAt: col, count },
      'good',
    );
  }

  emit(
    'DONE',
    `distance=${count}`,
    `xor reached 0, so every differing bit has been counted. The Hamming distance between ${x} and ${y} is ${count}. Runs in O(1) time and O(1) space for fixed-width ints.`,
    { xorBits: new Array<string>(width).fill('0'), count, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<HammingState>) {
  const s = frame.state;
  const bitLabel = (i: number) => String(s.width - 1 - i); // bit position under each column

  const xTone = () => '';
  const yTone = () => '';
  const xorTone = (i: number) => {
    if (s.clearAt === i) return 'match';
    if (s.xorBits[i] === '1') return s.scanned !== null && i > s.scanned ? '' : 'found';
    return '';
  };

  const scanPtr: ArrayPointer[] =
    s.scanned !== null ? [{ i: s.scanned, label: 'scan', tone: 'accent', place: 'above' }] : [];
  const clearPtr: ArrayPointer[] =
    s.clearAt !== null ? [{ i: s.clearAt, label: 'clear', tone: 'good', place: 'above' }] : [];

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        x = <span className="font-mono text-ink">{s.x}</span> · y ={' '}
        <span className="font-mono text-ink">{s.y}</span> · count ={' '}
        <span className="font-mono text-ink">{s.count}</span>
      </div>

      <div className={cn('mt-1 font-mono', vizText.xs, 'text-ink3')}>x</div>
      <ArrayRow values={s.xBits} cellTone={xTone} pointers={[]} windowRange={null} label={bitLabel} />

      <div className={cn('mt-1 font-mono', vizText.xs, 'text-ink3')}>y</div>
      <ArrayRow values={s.yBits} cellTone={yTone} pointers={[]} windowRange={null} label={bitLabel} />

      <div className={cn('mt-1 font-mono', vizText.xs, 'text-ink3')}>xor = x ^ y</div>
      <ArrayRow
        values={s.xorBits}
        cellTone={xorTone}
        pointers={[...scanPtr, ...clearPtr]}
        windowRange={null}
        label={bitLabel}
      />

      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ distance = {s.count}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<HammingState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const xorStr = s.xorBits.every((d) => d === '·') ? '—' : s.xorBits.join('');
  return (
    <VarGrid>
      <InspectorRow k="x" v={`${s.x} = ${s.xBits.join('')}`} />
      <InspectorRow k="y" v={`${s.y} = ${s.yBits.join('')}`} />
      <InspectorRow k="xor (x^y)" v={xorStr} />
      <InspectorRow k="count" v={s.count} />
      <InspectorRow k="distance" v={s.done ? s.count : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-hamming-distance';
export const title = 'Hamming distance';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Hamming distance\"?",
    choices: [
      {
        label: "XOR + popcount — fits this problem",
        correct: true
      },
      {
        label: "Greedy roman numeral — different approach"
      },
      {
        label: "Sort + Sliding Window (atan2) — different approach"
      },
      {
        label: "Binary string addition — different approach"
      }
    ],
    explain: "x^y highlights the differing bits; count them"
  },
  {
    id: "init",
    prompt: "At the start of a run (Hamming distance), what strategy is established?",
    choices: [
      {
        label: "x^y highlights the differing bits; count — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "Hamming distance counts the bit positions where x and y differ. x =  = ₂ and y =  = ₂ (shown MSB first). We compare them one bit at a time using XOR."
  },
  {
    id: "key-step",
    prompt: "On the \"POP\" step (count=), what happens?",
    choices: [
      {
        label: "Brian Kernighan trick: xor &= xor — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "Brian Kernighan trick: xor &= xor − 1 clears the lowest set 1-bit (position ). Each clear is one differing bit, so bump count to . xor is now ₂."
  },
  {
    id: "state",
    prompt: "What does the `width` field track in the visualization state?",
    choices: [
      {
        label: "number of bit columns rendered — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder keeps `width` in sync: number of bit columns rendered (MSB first)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Hamming distance\"?",
    choices: [
      {
        label: "O(1) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(log n) time, O(log n) space — wrong order of growth"
      },
      {
        label: "O(sqrt(n)) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(log n) time, O(1) space — wrong order of growth"
      }
    ],
    explain: "O(1). O(1). xor=x^y; popcount via xor&=xor-1"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "xor reached 0, so every differing — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "xor reached 0, so every differing bit has been counted. The Hamming distance between  and  is . Runs in O(1) time and O(1) space for fixed-width ints."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'hd1', label: 'x=1, y=4', value: { x: 1, y: 4 } },
    { id: 'hd2', label: 'x=3, y=1', value: { x: 3, y: 1 } },
  ] satisfies SampleInput<HammingInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as HammingState | undefined;
    const answer = s ? s.count : 0;
    return { ok: true, label: `distance = ${answer}` };
  },
};

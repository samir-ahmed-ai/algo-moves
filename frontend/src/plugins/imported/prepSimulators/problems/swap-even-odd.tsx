import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface SwapInput {
  s: string;
}

interface SwapState {
  chars: string[]; // working char array (mutated as we swap)
  i: number | null; // left index of the current pair
  j: number | null; // right index (i + 1)
  swapped: boolean[]; // per-index: true once its pair has been swapped
  done: boolean;
}

function record({ s }: SwapInput): Frame<SwapState>[] {
  const chars = s.split('');
  const n = chars.length;
  const swapped = new Array<boolean>(n).fill(false);
  const { emit, frames } = createPrepRecorder<SwapState>(() => ({
    chars: chars.slice(),
    i: null,
    j: null,
    swapped: swapped.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `"${s}"`,
    `Swap Even Odd: walk the string two characters at a time and swap each adjacent pair (index i with i+1). We step i += 2 so every neighbouring couple is swapped exactly once.`,
    {},
  );

  for (let i = 0; i + 1 < n; i += 2) {
    const j = i + 1;
    emit(
      'PAIR',
      `i=${i}, j=${j}`,
      `Look at the pair at indices ${i} and ${j}: '${chars[i]!}' and '${chars[j]!}'. These two neighbours will trade places.`,
      { i, j },
    );

    const tmp = chars[i]!;
    chars[i]! = chars[j]!;
    chars[j]! = tmp;
    swapped[i]! = true;
    swapped[j]! = true;

    emit(
      'SWAP',
      `${chars[i]!}${chars[j]!}`,
      `Swap them: index ${i} and ${j} become '${chars[i]!}' and '${chars[j]!}'. Now advance i += 2 to the next pair.`,
      { i, j },
      'good',
    );
  }

  const leftover = n % 2 === 1;
  emit(
    'DONE',
    `"${chars.join('')}"`,
    leftover
      ? `No more full pairs — the odd-length string leaves the last character '${chars[n - 1]!}' untouched. Result: "${chars.join('')}".`
      : `All adjacent pairs have been swapped. Result: "${chars.join('')}".`,
    { i: leftover ? n - 1 : null, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<SwapState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && !s.done)
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null && !s.done)
    pointers.push({ i: s.j, label: 'i+1', tone: 'warn', place: 'below' });

  const inActivePair = (idx: number) => !s.done && (idx === s.i || idx === s.j);
  const tone = (idx: number) => {
    if (inActivePair(idx)) return 'match';
    if (s.swapped[idx]!) return 'found';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        input ={' '}
        <span className="font-mono text-ink">"{s.chars.length === 0 ? '' : s.chars.join('')}"</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink3')}>
        {s.done ? '→ ' : 'result so far: '}
        {s.chars.join('')}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SwapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const swappedCount = s.swapped.filter(Boolean).length;
  return (
    <VarGrid>
      <InspectorRow k="length" v={s.chars.length} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="j (i+1)" v={s.j ?? '—'} />
      <InspectorRow k="chars[i]!" v={s.i !== null ? `'${s.chars[s.i]!}'` : '—'} />
      <InspectorRow k="chars[j]!" v={s.j !== null ? `'${s.chars[s.j]!}'` : '—'} />
      <InspectorRow k="indices swapped" v={swappedCount} />
      <InspectorRow k="current" v={`"${s.chars.join('')}"`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-swap-even-odd';
export const title = 'Swap even odd';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Swap even odd"?',
    choices: [
      {
        label: 'Adjacent swap — fits this problem',
        correct: true,
      },
      {
        label: 'Run-length — different approach',
      },
      {
        label: 'Hash set substrings — different approach',
      },
      {
        label: 'Sort + Wrap-around — different approach',
      },
    ],
    explain: 'Swap neighbors two at a time',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Swap even odd), what strategy is established?',
    choices: [
      {
        label: 'Swap neighbors two at a time — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Swap Even Odd: walk the string two characters at a time and swap each adjacent pair (index i with i+1). We step i += 2 so every neighbouring couple is swapped exactly once.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SWAP" step (), what happens?',
    choices: [
      {
        label: "Swap them: index and become '' — this move caption",
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain: "Swap them: index  and  become '' and ''. Now advance i += 2 to the next pair.",
  },
  {
    id: 'state',
    prompt: 'What does the `chars` field track in the visualization state?',
    choices: [
      {
        label: 'working char array (mutated — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain: 'The recorder keeps `chars` in sync: working char array (mutated as we swap)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Swap even odd"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n*m) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). i+=2: swap b[i]!,b[i+1]!',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: "Swap them: index and become '' — final DONE caption",
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain: "Swap them: index  and  become '' and ''. Now advance i += 2 to the next pair.",
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'se1', label: '"abcdef"', value: { s: 'abcdef' } },
    { id: 'se2', label: '"algorithm"', value: { s: 'algorithm' } },
  ] satisfies SampleInput<SwapInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SwapState | undefined;
    const result = s ? s.chars.join('') : '';
    return { ok: true, label: `"${result}"` };
  },
};

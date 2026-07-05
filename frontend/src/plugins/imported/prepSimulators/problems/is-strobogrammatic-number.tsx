import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface StroboInput {
  s: string;
}

interface StroboState {
  digits: string[];
  lo: number | null; // outer-left pointer
  hi: number | null; // outer-right pointer
  a: string | null; // rotation of digits[lo]
  b: string | null; // digits[hi]
  bad: number[]; // indices that failed the check
  done: boolean;
  answer: boolean | null;
}

// A digit rotated 180° must land on this map, else it never maps.
const PAIRS: Record<string, string> = { '0': '0', '1': '1', '6': '9', '8': '8', '9': '6' };

function record({ s }: StroboInput): Frame<StroboState>[] {
  const digits = s.split('');
  const { emit, frames } = createRecorder<StroboState>(() => ({
        digits,
        lo: null,
        hi: null,
        a: null,
        b: null,
        bad: [],
        done: false,
        answer: null
      }));

  emit(
    'INIT',
    `"${s}"`,
    `Is Strobogrammatic: the number must read the same after rotating the whole string 180°. Walk two pointers inward — each outer digit d[lo] must rotate to exactly d[hi] using the map 0→0, 1→1, 8→8, 6→9, 9→6.`,
    {},
  );

  let lo = 0;
  let hi = digits.length - 1;
  while (lo <= hi) {
    const a = PAIRS[digits[lo]];
    const okA = a !== undefined;
    const b = digits[hi];
    const okB = PAIRS[b] !== undefined;
    emit(
      'CHECK',
      `${digits[lo]}?${digits[hi]}`,
      `Compare the outer pair. Rotating d[${lo}]="${digits[lo]}" should give d[${hi}]="${digits[hi]}". ${
        okA ? `"${digits[lo]}" rotates to "${a}".` : `"${digits[lo]}" is not a rotatable digit.`
      }`,
      { lo, hi, a: okA ? a : null, b },
    );

    if (!okA || !okB || a !== b) {
      const reason = !okA
        ? `d[${lo}]="${digits[lo]}" cannot be rotated at all`
        : !okB
          ? `d[${hi}]="${digits[hi]}" cannot be rotated at all`
          : `rotation "${a}" ≠ d[${hi}]="${b}"`;
      emit(
        'FAIL',
        'not strobo',
        `Mismatch: ${reason}. The rotated number would differ here, so the string is NOT strobogrammatic. Return false.`,
        { lo, hi, a: okA ? a : null, b, bad: lo === hi ? [lo] : [lo, hi], done: true, answer: false },
        'bad',
      );
      return frames;
    }

    emit(
      'MATCH',
      `${a}=${b} ✓`,
      `Match: rotating "${digits[lo]}" gives "${a}", which equals d[${hi}]="${b}". This pair is symmetric. Step both pointers inward.`,
      { lo, hi, a, b },
      'good',
    );
    lo++;
    hi--;
  }

  emit(
    'DONE',
    'strobogrammatic',
    `The pointers crossed with every outer pair mapping correctly, so the number looks identical after a 180° rotation. It IS strobogrammatic — return true. Two-pointer sweep is O(log n) time (n = numeric magnitude) and O(1) space.`,
    { lo, hi, done: true, answer: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<StroboState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.lo !== null && s.lo <= (s.digits.length - 1)) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'above' });
  }
  if (s.hi !== null && s.hi >= 0) {
    pointers.push({ i: s.hi, label: 'hi', tone: 'warn', place: 'below' });
  }
  const badSet = new Set(s.bad);
  const tone = (i: number) => {
    if (badSet.has(i)) return 'dead';
    if (s.answer === true && s.done) return 'found';
    if ((s.lo !== null && i === s.lo) || (s.hi !== null && i === s.hi)) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        rotate 180° · map <span className="font-mono text-ink">0→0 1→1 8→8 6→9 9→6</span>
      </div>
      <ArrayRow values={s.digits} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.a !== null && s.b !== null ? (
          <>
            rotate("{s.digits[s.lo ?? 0]}") = <span className="text-ink">{s.a}</span> vs d[hi] ={' '}
            <span className="text-ink">{s.b}</span>
          </>
        ) : (
          'two pointers collapse inward'
        )}
      </div>
      {s.done && (
        <div
          className={cn('mt-1 font-mono', vizText.base, s.answer ? 'text-good' : 'text-bad')}
        >
          → {s.answer ? 'true (strobogrammatic)' : 'false'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<StroboState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="length" v={s.digits.length} />
      <InspectorRow k="lo" v={s.lo ?? '—'} />
      <InspectorRow k="hi" v={s.hi ?? '—'} />
      <InspectorRow k="d[lo]" v={s.lo !== null && s.lo < s.digits.length ? s.digits[s.lo] : '—'} />
      <InspectorRow k="d[hi]" v={s.hi !== null && s.hi >= 0 ? s.digits[s.hi] : '—'} />
      <InspectorRow k="rotate(d[lo])" v={s.a ?? '—'} />
      <InspectorRow
        k="result"
        v={s.answer === null ? '…' : s.answer ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-is-strobogrammatic-number';
export const title = 'Is strobogrammatic number';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Is strobogrammatic number\"?",
    choices: [
      {
        label: "Strobogrammatic map — fits this problem",
        correct: true
      },
      {
        label: "Uniform random in range — different approach"
      },
      {
        label: "Gauss sum XOR trick — different approach"
      },
      {
        label: "Enumerate 2 candidates — different approach"
      }
    ],
    explain: "Two pointers; each outer pair must map via 0/1/8/6/9"
  },
  {
    id: "init",
    prompt: "At the start of a run (Is strobogrammatic number), what strategy is established?",
    choices: [
      {
        label: "Two pointers; each outer pair must — described in INIT caption",
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
    explain: "Is Strobogrammatic: the number must read the same after rotating the whole string 180°. Walk two pointers inward — each outer digit d[lo] must rotate to exactly d[hi] using the map 0→0, 1→1, 8→8, 6→9, 9→6."
  },
  {
    id: "key-step",
    prompt: "On the \"MATCH\" step (= ✓), what happens?",
    choices: [
      {
        label: "Match: rotating \"\" gives \"\", which — this move caption",
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
    explain: "Match: rotating \"\" gives \"\", which equals d[]=\"\". This pair is symmetric. Step both pointers inward."
  },
  {
    id: "state",
    prompt: "What does the `lo` field track in the visualization state?",
    choices: [
      {
        label: "outer-left pointer — updated each frame",
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
    explain: "The recorder keeps `lo` in sync: outer-left pointer"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Is strobogrammatic number\"?",
    choices: [
      {
        label: "O(log n) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(1) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(√n) time, O(√n) space — wrong order of growth"
      }
    ],
    explain: "O(log n). O(1). pairs map; outer chars must map to each other or fail"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Match: rotating \"\" gives \"\", which — final DONE caption",
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
    explain: "Match: rotating \"\" gives \"\", which equals d[]=\"\". This pair is symmetric. Step both pointers inward."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'st1', label: '"69" → true', value: { s: '69' } },
    { id: 'st2', label: '"962" → false', value: { s: '962' } },
  ] satisfies SampleInput<StroboInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as StroboState | undefined;
    const ok = s?.answer === true;
    return { ok, label: ok ? 'true' : 'false' };
  },
};

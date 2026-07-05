import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RandInput {
  maxVal: number;
  blocked: number[];
  /** Fixed illustrative draw so the replay is deterministic (stands in for rng.Intn). */
  k: number;
}

interface RandState {
  maxVal: number;
  blocked: number[]; // original blocked list (for display)
  blockedSet: number[]; // unique blocked values
  available: number | null; // max+1 - |blockedSet|
  k0: number | null; // the drawn kth slot (fixed)
  v: number | null; // value being scanned in 0..max
  kLeft: number | null; // remaining free slots to skip
  answer: number | null; // returned value
  done: boolean;
}

function record({ maxVal, blocked, k }: RandInput): Frame<RandState>[] {  const blockedSet = new Set<number>(blocked);
  const uniq = [...blockedSet].sort((a, b) => a - b);
  const isBlocked = (x: number) => blockedSet.has(x);

  const { emit, frames } = createRecorder<RandState>(() => ({
        maxVal,
        blocked,
        blockedSet: uniq,
        available: null,
        k0: null,
        v: null,
        kLeft: null,
        answer: null,
        done: false
      }));

  emit(
    'INIT',
    `max=${maxVal}`,
    `Random number not in array: pick a uniformly-random value in [0, ${maxVal}] that is NOT one of the blocked values {${uniq.join(', ')}}. We use rejection-free "gap" sampling — never re-rolling.`,
    {},
  );

  const available = maxVal + 1 - blockedSet.size;
  emit(
    'COUNT',
    `available=${available}`,
    `There are ${maxVal + 1} total values (0..${maxVal}) and ${blockedSet.size} distinct blocked ones, so available = ${maxVal} + 1 − ${blockedSet.size} = ${available} free slots. We only need to draw one index into those free slots.`,
    { available },
  );

  if (available <= 0) {
    emit(
      'EMPTY',
      'no free value',
      `available = ${available} ≤ 0 — every value in [0, ${maxVal}] is blocked, so there is nothing to return. Answer −1.`,
      { available, answer: -1, done: true },
      'bad',
    );
    return frames;
  }

  // Deterministic stand-in for rng.Intn(available). Clamp the provided k into range.
  const k0 = ((k % available) + available) % available;
  emit(
    'DRAW',
    `k=${k0}`,
    `Draw k = ${k0} uniformly in [0, ${available}) (a fixed value here so the animation replays the same way). We now want the k-th (0-indexed) free value — walk 0..${maxVal}, skip blocked ones, and count down k.`,
    { available, k0, kLeft: k0 },
  );

  let kLeft = k0;
  for (let v = 0; v <= maxVal; v++) {
    if (isBlocked(v)) {
      emit(
        'SKIP',
        `${v} blocked`,
        `Value ${v} is blocked, so it is not a free slot — skip it without touching k (still ${kLeft} to go).`,
        { available, k0, v, kLeft },
      );
      continue;
    }
    if (kLeft === 0) {
      emit(
        'HIT',
        `→ ${v}`,
        `Value ${v} is free and k has reached 0 — this is exactly the k-th free slot. Return ${v}.`,
        { available, k0, v, kLeft, answer: v, done: true },
        'good',
      );
      return frames;
    }
    emit(
      'STEP',
      `pass ${v}`,
      `Value ${v} is free but k = ${kLeft} > 0, so this is not yet our slot. Consume one free slot: k becomes ${kLeft - 1}.`,
      { available, k0, v, kLeft },
    );
    kLeft--;
  }

  // Unreachable for valid input; guard mirrors the Go `return -1`.
  emit(
    'DONE',
    'not found',
    `Walked past ${maxVal} without landing on the k-th free slot — should not happen for valid input. Answer −1.`,
    { available, k0, answer: -1, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RandState>) {
  const s = frame.state;
  const values = Array.from({ length: s.maxVal + 1 }, (_, i) => i);
  const blockedSet = new Set(s.blockedSet);

  const pointers: ArrayPointer[] = [];
  if (s.v !== null && !s.done) pointers.push({ i: s.v, label: 'v', tone: 'accent', place: 'above' });
  if (s.answer !== null && s.answer >= 0) pointers.push({ i: s.answer, label: 'pick', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (s.answer !== null && s.answer >= 0 && i === s.answer) return 'found';
    if (blockedSet.has(i)) return 'dead';
    if (s.v === i && !s.done) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        range = <span className="font-mono text-ink">[0, {s.maxVal}]</span>
        {s.available !== null && (
          <>
            {' · '}available ={' '}
            <span className="font-mono text-ink">{s.available}</span>
          </>
        )}
        {s.k0 !== null && (
          <>
            {' · '}k ={' '}
            <span className="font-mono text-ink">{s.done ? s.k0 : s.kLeft}</span>
            <span className="text-ink3">{s.done ? '' : ` of ${s.k0}`}</span>
          </>
        )}
      </div>
      <ArrayRow values={values} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        blocked {'{'}
        {s.blockedSet.join(', ')}
        {'}'} — dead cells are skipped, not counted
      </div>
      {s.answer !== null && (
        <div className={cn('mt-1 font-mono', vizText.base, s.answer >= 0 ? 'text-good' : 'text-bad')}>
          → {s.answer}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RandState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="max" v={s.maxVal} />
      <InspectorRow k="blocked" v={`{${s.blockedSet.join(', ')}}`} />
      <InspectorRow k="available" v={s.available ?? '—'} />
      <InspectorRow k="k drawn" v={s.k0 ?? '—'} />
      <InspectorRow k="v (scan)" v={s.v ?? '—'} />
      <InspectorRow k="k left" v={s.kLeft ?? '—'} />
      <InspectorRow k="answer" v={s.answer !== null ? s.answer : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-random-number-not-in-array';
export const title = 'Random number not in array';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Random number not in array\"?",
    choices: [
      {
        label: "Rejection sampling / gap random — fits this problem",
        correct: true
      },
      {
        label: "Sort — different approach"
      },
      {
        label: "Uniform random in range — different approach"
      },
      {
        label: "Singleton XOR — different approach"
      }
    ],
    explain: "Pick the kth slot among the values that aren't blocked"
  },
  {
    id: "init",
    prompt: "At the start of a run (Random number not in array), what strategy is established?",
    choices: [
      {
        label: "Pick the kth slot among — described in INIT caption",
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
    explain: "Random number not in array: pick a uniformly-random value in [0, ] that is NOT one of the blocked values {}. We use rejection-free \"gap\" sampling — never re-rolling."
  },
  {
    id: "key-step",
    prompt: "On the \"SKIP\" step ( blocked), what happens?",
    choices: [
      {
        label: "Value is blocked — this move caption",
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
    explain: "Value  is blocked, so it is not a free slot — skip it without touching k (still  to go)."
  },
  {
    id: "state",
    prompt: "What does the `blocked` field track in the visualization state?",
    choices: [
      {
        label: "original blocked list (for display) — updated each frame",
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
    explain: "The recorder keeps `blocked` in sync: original blocked list (for display)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Random number not in array\"?",
    choices: [
      {
        label: "O(n) worst case time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(d) time, O(d) space — wrong order of growth"
      },
      {
        label: "O(bits set) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(log n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n) worst case. O(n). available=max+1-len(blocked); walk free slots to the kth"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Value is free but k = — final DONE caption",
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
    explain: "Value  is free but k =  > 0, so this is not yet our slot. Consume one free slot: k becomes ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'rn1', label: 'max=6, blocked=[1,3,5], k=2', value: { maxVal: 6, blocked: [1, 3, 5], k: 2 } },
    { id: 'rn2', label: 'max=4, blocked=[0,2], k=1', value: { maxVal: 4, blocked: [0, 2], k: 1 } },
  ] satisfies SampleInput<RandInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RandState | undefined;
    if (!s || s.answer === null || s.answer < 0) return { ok: false, label: 'no free value' };
    return { ok: true, label: `${s.answer}` };
  },
};

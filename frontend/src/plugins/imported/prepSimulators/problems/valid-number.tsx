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
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface ValidNumberInput {
  s: string;
}

interface ValidNumberState {
  chars: string[];
  i: number | null; // char currently under inspection
  seenDigit: boolean;
  seenDot: boolean;
  seenExp: boolean;
  result: boolean | null; // final verdict, null while scanning
  done: boolean;
}

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function record({ s }: ValidNumberInput): Frame<ValidNumberState>[] {
  const chars = s.split('');
  let seenDigit = false;
  let seenDot = false;
  let seenExp = false;

  const { emit, frames } = createPrepRecorder<ValidNumberState>(() => ({
    chars,
    i: null,
    seenDigit,
    seenDot,
    seenExp,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `"${s}"`,
    `Valid Number: scan "${s}" once, tracking three flags — seenDigit, seenDot, seenExp. Every character must be legal in its position; at the end the string is valid only if at least one digit was seen.`,
    {},
  );

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;

    if (isDigit(c!)) {
      seenDigit = true;
      emit(
        'DIGIT',
        `'${c}' digit`,
        `'${c}' is a digit — always allowed. Set seenDigit = true.`,
        { i },
        'good',
      );
      continue;
    }

    if (c === '+' || c === '-') {
      // A sign is only valid at the start or immediately after an exponent.
      if (i > 0 && chars[i - 1]! !== 'e' && chars[i - 1]! !== 'E') {
        emit(
          'REJECT',
          `'${c}' sign`,
          `'${c}' is a sign but it is at index ${i}, not the start and not right after 'e'/'E' (previous char is '${chars[i - 1]!}'). A sign is only legal leading the number or the exponent. Reject.`,
          { i, result: false, done: true },
          'bad',
        );
        return frames;
      }
      emit(
        'SIGN',
        `'${c}' sign ok`,
        `'${c}' is a sign in a valid spot — ${i === 0 ? 'it leads the number' : "it follows 'e'/'E'"}. No flag changes; a sign carries no digit on its own.`,
        { i },
      );
      continue;
    }

    if (c === 'e' || c === 'E') {
      if (seenExp || !seenDigit) {
        emit(
          'REJECT',
          `'${c}' exp`,
          `'${c}' starts an exponent, but ${seenExp ? 'we already saw one exponent' : 'no digit has appeared before it'}. An exponent needs a preceding digit and may appear only once. Reject.`,
          { i, result: false, done: true },
          'bad',
        );
        return frames;
      }
      seenExp = true;
      seenDigit = false; // the exponent must be followed by its own digits
      emit(
        'EXP',
        `'${c}' exp ok`,
        `'${c}' begins the exponent. Set seenExp = true and reset seenDigit = false, because the part after 'e'/'E' must contain its own digit.`,
        { i },
      );
      continue;
    }

    if (c === '.') {
      if (seenDot || seenExp) {
        emit(
          'REJECT',
          `'${c}' dot`,
          `'${c}' is a decimal point, but ${seenDot ? 'we already saw a dot' : 'we are past an exponent, where dots are not allowed'}. A dot may appear at most once and only before any exponent. Reject.`,
          { i, result: false, done: true },
          'bad',
        );
        return frames;
      }
      seenDot = true;
      emit(
        'DOT',
        `'${c}' dot ok`,
        `'${c}' is the first decimal point and comes before any exponent. Set seenDot = true.`,
        { i },
      );
      continue;
    }

    // Any other character is illegal.
    emit(
      'REJECT',
      `'${c}' bad`,
      `'${c}' is not a digit, sign, 'e'/'E', or '.', so it can never appear in a valid number. Reject.`,
      { i, result: false, done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'DONE',
    seenDigit ? 'valid' : 'no digit',
    `Reached the end of the string. The answer is seenDigit = ${seenDigit}${seenDigit ? ' — at least one digit was seen, so the string is a valid number.' : ' — no digit ever appeared, so this is not a valid number.'}`,
    { result: seenDigit, done: true },
    seenDigit ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ValidNumberState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    pointers.push({
      i: s.i,
      label: 'i',
      tone: s.result === false ? 'bad' : 'accent',
      place: 'above',
    });
  }
  const tone = (i: number) => {
    if (s.i !== i) return '';
    if (s.result === false) return 'dead';
    return 'match';
  };
  const rail = (
    <>
      <RailGroup label="flags">
        <RailStat k="seenDigit" v={String(s.seenDigit)} tone={s.seenDigit ? 'good' : undefined} />
        <RailStat k="seenDot" v={String(s.seenDot)} tone={s.seenDot ? 'accent' : undefined} />
        <RailStat k="seenExp" v={String(s.seenExp)} tone={s.seenExp ? 'accent' : undefined} />
      </RailGroup>
      <RailGroup label="scan">
        <RailStat k="i" v={s.i ?? '—'} />
        <RailStat k="char" v={s.i !== null ? `'${s.chars[s.i]!}'` : '—'} tone="accent" />
      </RailGroup>
      {s.result !== null && (
        <RailResult
          label="answer"
          value={s.result ? 'valid' : 'invalid'}
          tone={s.result ? 'good' : 'bad'}
        />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      {s.chars.length > 0 ? (
        <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      ) : (
        <span className="font-mono text-ink3">(empty string)</span>
      )}
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ValidNumberState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char" v={s.i !== null ? `'${s.chars[s.i]!}'` : '—'} />
      <InspectorRow k="seenDigit" v={String(s.seenDigit)} />
      <InspectorRow k="seenDot" v={String(s.seenDot)} />
      <InspectorRow k="seenExp" v={String(s.seenExp)} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'valid' : 'invalid'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-valid-number';
export const title = 'Valid Number';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Valid Number"?',
    choices: [
      {
        label: 'Single Pass Flags — fits this problem',
        correct: true,
      },
      {
        label: 'Multiset match — different approach',
      },
      {
        label: 'Sliding window — different approach',
      },
      {
        label: 'Two Pointers Greedy — different approach',
      },
    ],
    explain: 'See Valid Number pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Valid Number), what strategy is established?',
    choices: [
      {
        label: 'See Valid Number pattern — described in INIT caption',
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
      'Valid Number: scan "" once, tracking three flags — seenDigit, seenDot, seenExp. Every character must be legal in its position; at the end the string is valid only if at least one digit was seen.',
  },
  {
    id: 'key-step',
    prompt: 'On the "EXP" step (\'\' exp ok), what happens?',
    choices: [
      {
        label: "'' begins the exponent. Set seenExp — this move caption",
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
    explain:
      "'' begins the exponent. Set seenExp = true and reset seenDigit = false, because the part after 'e'/'E' must contain its own digit.",
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'char currently under inspection — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: char currently under inspection',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Valid Number"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n·26) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). Valid Number',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: "'' is not a digit, sign — final DONE caption",
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
    explain:
      "'' is not a digit, sign, 'e'/'E', or '.', so it can never appear in a valid number. Reject.",
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'vn1', label: '"2e-3" → valid', value: { s: '2e-3' } },
    { id: 'vn2', label: '"1a" → invalid', value: { s: '1a' } },
  ] satisfies SampleInput<ValidNumberInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ValidNumberState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'valid number' : 'not a number' };
  },
};

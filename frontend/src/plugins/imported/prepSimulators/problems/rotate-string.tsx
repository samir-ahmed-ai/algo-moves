import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RotateInput {
  s: string;
  goal: string;
}

interface RotateState {
  double: string[]; // s + s, split into chars — the track we slide the window along
  goal: string[]; // the target chars we are hunting for
  n: number; // len(s) == len(goal), the window width
  lenOk: boolean; // did the length pre-check pass?
  start: number | null; // window start index inside `double`
  cmp: number | null; // index inside `double` currently being compared
  cmpOk: boolean | null; // did the char at `cmp` match its counterpart in goal?
  found: boolean; // has a full match been located?
  done: boolean;
}

function record({ s, goal }: RotateInput): Frame<RotateState>[] {  const doubleStr = s + s;
  const double = doubleStr.split('');
  const goalArr = goal.split('');
  const n = goal.length;

  const { emit, frames } = createRecorder<RotateState>(() => ({
        double,
        goal: goalArr,
        n,
        lenOk: s.length === goal.length,
        start: null,
        cmp: null,
        cmpOk: null,
        found: false,
        done: false
      }));

  emit(
    'INIT',
    `s="${s}" goal="${goal}"`,
    `Rotate String: goal is a rotation of s iff both have equal length AND goal appears somewhere inside s + s. Every rotation of s is a length-${n} window hiding in the doubled string.`,
    {},
  );

  if (s.length !== goal.length) {
    emit(
      'LEN',
      'length mismatch',
      `Lengths differ (|s| = ${s.length}, |goal| = ${goal.length}), so goal cannot be a rotation of s. Return false immediately.`,
      { lenOk: false, done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'DOUBLE',
    `double="${doubleStr}"`,
    `Lengths match. Build double = s + s = "${doubleStr}". Now slide a length-${n} window across it, looking for "${goal}".`,
    { lenOk: true },
  );

  // Slide the window: for each start where start + n fits inside double.
  for (let start = 0; start + n <= double.length; start++) {
    emit(
      'WINDOW',
      `start=${start}`,
      `Try the window starting at index ${start}: double[${start}..${start + n - 1}] = "${doubleStr.slice(start, start + n)}". Compare it to goal character by character.`,
      { start },
    );

    let matched = true;
    for (let k = 0; k < n; k++) {
      const di = start + k;
      const dc = double[di];
      const gc = goalArr[k];
      const ok = dc === gc;
      if (!ok) matched = false;
      emit(
        ok ? 'MATCH' : 'MISMATCH',
        ok ? `${dc}=${gc}` : `${dc}≠${gc}`,
        ok
          ? `double[${di}] = '${dc}' equals goal[${k}] = '${gc}'. So far the window still matches.`
          : `double[${di}] = '${dc}' does not equal goal[${k}] = '${gc}'. This window fails — slide one step to the right.`,
        { start, cmp: di, cmpOk: ok },
        ok ? undefined : 'bad',
      );
      if (!ok) break;
    }

    if (matched) {
      emit(
        'FOUND',
        `at ${start}`,
        `The whole window double[${start}..${start + n - 1}] equals "${goal}". goal is a rotation of s — return true.`,
        { start, found: true, done: true },
        'good',
      );
      return frames;
    }
  }

  emit(
    'DONE',
    'no rotation',
    `No window inside double ever matched "${goal}", so goal is not a rotation of s. Return false.`,
    { done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RotateState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.start !== null) pointers.push({ i: s.start, label: 'start', tone: 'accent', place: 'above' });
  if (s.cmp !== null)
    pointers.push({ i: s.cmp, label: 'cmp', tone: s.cmpOk === false ? 'bad' : 'good', place: 'below' });

  const windowRange: [number, number] | null =
    s.start !== null ? [s.start, s.start + s.n - 1] : null;

  const cellTone = (i: number) => {
    if (s.found && s.start !== null && i >= s.start && i <= s.start + s.n - 1) return 'found';
    if (s.cmp === i) return s.cmpOk === false ? 'dead' : 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        goal = <span className="font-mono text-ink">"{s.goal.join('')}"</span>
        {' · '}window ={' '}
        <span className="font-mono text-ink">{s.n}</span> chars
      </div>
      {s.lenOk ? (
        <>
          <div className={cn('mt-1', vizText.sm, 'text-ink3')}>double = s + s</div>
          <ArrayRow values={s.double} cellTone={cellTone} pointers={pointers} windowRange={windowRange} />
          <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
            goal:&nbsp;
            {s.goal.map((c, k) => (
              <span
                key={k}
                className={cn(
                  s.cmp !== null && s.start !== null && s.cmp - s.start === k
                    ? s.cmpOk === false
                      ? 'text-bad'
                      : 'text-good'
                    : 'text-ink',
                )}
              >
                {c}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className={cn('mt-2 font-mono text-bad', vizText.base)}>
          length mismatch → false
        </div>
      )}
      {s.found && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>→ true (rotation found)</div>
      )}
      {s.done && !s.found && s.lenOk && (
        <div className={cn('mt-2 font-mono text-bad', vizText.base)}>→ false (no rotation)</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RotateState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const winStr =
    s.start !== null ? s.double.slice(s.start, s.start + s.n).join('') : '—';
  return (
    <VarGrid>
      <InspectorRow k="goal" v={`"${s.goal.join('')}"`} />
      <InspectorRow k="double (s+s)" v={`"${s.double.join('')}"`} />
      <InspectorRow k="len equal?" v={s.lenOk ? 'yes' : 'no'} />
      <InspectorRow k="window start" v={s.start ?? '—'} />
      <InspectorRow k="window" v={winStr === '—' ? '—' : `"${winStr}"`} />
      <InspectorRow k="result" v={s.found ? 'true' : s.done ? 'false' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-rotate-string';
export const title = 'Rotate string';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Rotate string\"?",
    choices: [
      {
        label: "Double string trick — fits this problem",
        correct: true
      },
      {
        label: "Bijection map — different approach"
      },
      {
        label: "Char frequency — different approach"
      },
      {
        label: "Multiset match — different approach"
      }
    ],
    explain: "goal is a window hiding inside s+s"
  },
  {
    id: "init",
    prompt: "At the start of a run (Rotate string), what strategy is established?",
    choices: [
      {
        label: "goal is a window hiding inside — described in INIT caption",
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
    explain: "Rotate String: goal is a rotation of s iff both have equal length AND goal appears somewhere inside s + s. Every rotation of s is a length- window hiding in the doubled string."
  },
  {
    id: "key-step",
    prompt: "On the \"WINDOW\" step (start=), what happens?",
    choices: [
      {
        label: "Try the window starting at index — this move caption",
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
    explain: "Try the window starting at index : double[..] = \"\". Compare it to goal character by character."
  },
  {
    id: "state",
    prompt: "What does the `double` field track in the visualization state?",
    choices: [
      {
        label: "s + s, split — updated each frame",
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
    explain: "The recorder keeps `double` in sync: s + s, split into chars — the track we slide the window along"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Rotate string\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n·L) time, O(n·L) space — wrong order of growth"
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n log n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). len equal AND goal is substring of s+s"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "The whole window double[..] equals \"\". — final DONE caption",
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
    explain: "The whole window double[..] equals \"\". goal is a rotation of s — return true."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'rs1', label: '"abcde" → "cdeab"', value: { s: 'abcde', goal: 'cdeab' } },
    { id: 'rs2', label: '"abcde" → "abced"', value: { s: 'abcde', goal: 'abced' } },
  ] satisfies SampleInput<RotateInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RotateState | undefined;
    const ok = s ? s.found : false;
    return { ok, label: ok ? 'true' : 'false' };
  },
};

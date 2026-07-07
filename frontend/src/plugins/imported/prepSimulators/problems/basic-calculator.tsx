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
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailStack,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';

interface CalcInput {
  s: string;
}

interface CalcState {
  s: string;
  i: number | null; // index of the char being processed
  res: number; // running result inside the current paren level
  sign: number; // current sign (+1 or -1)
  stack: number[]; // saved (res, sign) pairs, pushed on '('
  done: boolean;
  answer: number | null; // final value once finished
}

function evaluate(s: string): number {
  const stack: number[] = [];
  let res = 0;
  let sign = 1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c! >= '0' && c! <= '9') {
      let num = 0;
      while (i < s.length && s[i]! >= '0' && s[i]! <= '9') {
        num = num * 10 + (s.charCodeAt(i) - 48);
        i++;
      }
      i--;
      res += sign * num;
    } else if (c === '+') {
      sign = 1;
    } else if (c === '-') {
      sign = -1;
    } else if (c === '(') {
      stack.push(res, sign);
      res = 0;
      sign = 1;
    } else if (c === ')') {
      const prevSign = stack.pop()!;
      const prevRes = stack.pop()!;
      res = prevRes + prevSign * res;
    }
  }
  return res;
}

function record({ s }: CalcInput): Frame<CalcState>[] {
  const stack: number[] = [];
  let res = 0;
  let sign = 1;

  const { emit, frames } = createPrepRecorder<CalcState>(() => ({
    s: s,
    res: res,
    sign: sign,
    stack: stack.slice(),
    answer: null,
    i: null,
    done: false,
  }));

  emit(
    'INIT',
    `"${s}"`,
    `Basic Calculator: evaluate "${s}" with +, −, parentheses and spaces. Keep a running res and a sign (+1 or −1). On '(' we push res and sign onto a stack and reset; on ')' we fold the inner result back into the saved outer state.`,
    { i: null },
  );

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === ' ') {
      emit(
        'SKIP',
        `skip space`,
        `Index ${i} is a space — ignore it and keep res = ${res}, sign = ${sign}.`,
        { i: i },
      );
      continue;
    }
    if (c! >= '0' && c! <= '9') {
      let num = 0;
      const start = i;
      while (i < s.length && s[i]! >= '0' && s[i]! <= '9') {
        num = num * 10 + (s.charCodeAt(i) - 48);
        i++;
      }
      i--;
      const span = start === i ? `digit at ${start}` : `digits ${start}..${i}`;
      res += sign * num;
      emit(
        'NUM',
        `+${sign > 0 ? '' : '−'}${num}`,
        `Read the number ${num} (${span}). Apply the current sign ${sign > 0 ? '+' : '−'} and add it: res = ${res - sign * num} ${sign > 0 ? '+' : '−'} ${num} = ${res}.`,
        { i: i },
      );
    } else if (c === '+') {
      sign = 1;
      emit(
        'SIGN',
        `sign = +1`,
        `Saw '+', so the next number is added: set sign = +1. res stays ${res}.`,
        { i: i },
      );
    } else if (c === '-') {
      sign = -1;
      emit(
        'SIGN',
        `sign = −1`,
        `Saw '−', so the next number is subtracted: set sign = −1. res stays ${res}.`,
        { i: i },
      );
    } else if (c === '(') {
      stack.push(res, sign);
      const savedRes = res;
      const savedSign = sign;
      res = 0;
      sign = 1;
      emit(
        'PUSH',
        `push ${savedRes},${savedSign > 0 ? '+1' : '−1'}`,
        `Open paren: push the outer res=${savedRes} and sign=${savedSign > 0 ? '+1' : '−1'} onto the stack, then reset res=0, sign=+1 to start evaluating the sub-expression fresh.`,
        { i: i },
      );
    } else if (c === ')') {
      const prevSign = stack.pop()!;
      const prevRes = stack.pop()!;
      const inner = res;
      res = prevRes + prevSign * inner;
      emit(
        'POP',
        `fold ${prevRes}${prevSign > 0 ? '+' : '−'}(${inner})`,
        `Close paren: the inner expression evaluated to ${inner}. Pop the saved sign ${prevSign > 0 ? '+1' : '−1'} and res ${prevRes}, then fold: res = ${prevRes} ${prevSign > 0 ? '+' : '−'} ${inner} = ${res}.`,
        { i: i },
      );
    }
  }

  emit(
    'DONE',
    `= ${res}`,
    `Reached the end of the string. The fully evaluated expression "${s}" = ${res}.`,
    { i: null, done: true, answer: res },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<CalcState>) {
  const s = frame.state;
  const chars = s.s.split('').map((c) => (c === ' ' ? '␣' : c));
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');

  const stackPairs = s.stack.reduce<string[]>((acc, _v, idx) => {
    if (idx % 2 === 0)
      acc.push(`res ${s.stack[idx]!}, sign ${s.stack[idx + 1]! > 0 ? '+1' : '−1'}`);
    return acc;
  }, []);

  const cur = s.i !== null && s.i >= 0 && s.i < s.s.length ? s.s[s.i]! : null;

  const rail = (
    <>
      <RailStack label="stack" items={stackPairs} topLabel="top" />
      <RailGroup label="state">
        {cur !== null && <RailStat k="char" v={cur === ' ' ? '␣' : cur} tone="accent" />}
        <RailStat k="res" v={s.res} />
        <RailStat k="sign" v={s.sign > 0 ? '+1' : '−1'} />
      </RailGroup>
      {s.done && s.answer !== null && <RailResult label="answer" value={s.answer} tone="good" />}
    </>
  );

  return (
    <VizStage rail={rail}>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CalcState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.i !== null && s.i >= 0 && s.i < s.s.length ? s.s[s.i]! : '—';
  return (
    <VarGrid>
      <InspectorRow k="char (i)" v={cur === ' ' ? '␣' : cur} />
      <InspectorRow k="res" v={s.res} />
      <InspectorRow k="sign" v={s.sign > 0 ? '+1' : '−1'} />
      <InspectorRow k="stack depth" v={s.stack.length / 2} />
      <InspectorRow k="answer" v={s.answer ?? (s.done ? s.res : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-basic-calculator';
export const title = 'Basic Calculator';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Basic Calculator"?',
    choices: [
      {
        label: "Stack (push res+sign on '(') — fits this problem",
        correct: true,
      },
      {
        label: 'Stack with auxiliary min stack — different approach',
      },
      {
        label: 'Stack bracket matching — different approach',
      },
      {
        label: 'Monotonic decreasing deque — different approach',
      },
    ],
    explain: 'Track running `res` and `sign` (+1 or -1)',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Basic Calculator), what strategy is established?',
    choices: [
      {
        label: 'Track running `res` and `sign` (+1 — described in INIT caption',
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
      "Basic Calculator: evaluate \"\" with +, −, parentheses and spaces. Keep a running res and a sign (+1 or −1). On '(' we push res and sign onto a stack and reset; on ')' we fold the inner result back into the saved outer state.",
  },
  {
    id: 'key-step',
    prompt: 'On the "SIGN" step (sign = −1), what happens?',
    choices: [
      {
        label: "Saw '−', so the next number — this move caption",
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
    explain: "Saw '−', so the next number is subtracted: set sign = −1. res stays .",
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'index of the char — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: index of the char being processed',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Basic Calculator"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n·maxK) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(1) space — wrong order of growth',
      },
    ],
    explain:
      'O(n). O(n). Track running `res` and `sign` (+1 or -1); On `(`: push `res` and `sign` to stack, reset both',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Reached the end of the string. — final DONE caption',
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
    explain: 'Reached the end of the string. The fully evaluated expression "" = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'bc1', label: '(1+(4+5+2)-3)', value: { s: '(1+(4+5+2)-3)' } },
    { id: 'bc2', label: '1-(2+3)', value: { s: '1-(2+3)' } },
  ] satisfies SampleInput<CalcInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CalcState | undefined;
    const v = s ? evaluate(s.s) : 0;
    return { ok: true, label: `= ${v}` };
  },
};

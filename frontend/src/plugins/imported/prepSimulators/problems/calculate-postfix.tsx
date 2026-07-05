import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PostfixInput {
  tokens: string[];
}

interface PostfixState {
  tokens: string[];
  ti: number | null; // index of the token currently being processed
  stack: number[]; // operand stack, bottom -> top (left -> right)
  a: number | null; // first operand popped (second-from-top)
  b: number | null; // second operand popped (top)
  op: string | null; // operator applied this step
  pushed: number | null; // value just pushed (top of stack)
  highlight: number[]; // stack indices to mark this frame (operands / result)
  result: number | null;
  done: boolean;
}

const OPS = new Set(['+', '-', '*', '/']);

function applyOp(a: number, b: number, op: string): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return Math.trunc(a / b);
    default:
      return 0;
  }
}

function record({ tokens }: PostfixInput): Frame<PostfixState>[] {  const stack: number[] = [];

  const { emit, frames } = createRecorder<PostfixState>(() => ({
        tokens,
        ti: null,
        stack: stack.slice(),
        a: null,
        b: null,
        op: null,
        pushed: null,
        highlight: [],
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `${tokens.length} tokens`,
    `Postfix (Reverse Polish) evaluation: scan tokens left to right. A number is pushed onto the stack; an operator pops the top two values, applies the op, and pushes the result. When done, the single remaining value is the answer.`,
    {},
  );

  for (let ti = 0; ti < tokens.length; ti++) {
    const tok = tokens[ti];

    if (OPS.has(tok)) {
      const b = stack[stack.length - 1];
      const a = stack[stack.length - 2];
      emit(
        'POP',
        `pop ${a} ${tok} ${b}`,
        `Token "${tok}" is an operator. Pop the top two operands: b = ${b} (top) and a = ${a} (below it). The lower one (a) is the left-hand side of the operation.`,
        {
          ti,
          a,
          b,
          op: tok,
          highlight: [stack.length - 1, stack.length - 2],
        },
      );

      stack.pop();
      stack.pop();
      const r = applyOp(a, b, tok);
      stack.push(r);

      emit(
        'APPLY',
        `${a} ${tok} ${b} = ${r}`,
        `Apply the operator: a ${tok} b = ${a} ${tok} ${b} = ${r}. Remove both operands and push the result ${r} back onto the stack.`,
        {
          ti,
          a,
          b,
          op: tok,
          pushed: r,
          highlight: [stack.length - 1],
        },
      );
    } else {
      const v = Number.parseInt(tok, 10);
      stack.push(v);
      emit(
        'PUSH',
        `push ${v}`,
        `Token "${tok}" is a number. Push ${v} onto the stack; it waits there as an operand for a future operator.`,
        {
          ti,
          pushed: v,
          highlight: [stack.length - 1],
        },
      );
    }
  }

  const result = stack.length > 0 ? stack[0] : 0;
  emit(
    'DONE',
    `= ${result}`,
    `All tokens processed. One value remains on the stack: ${result}. That is the value of the postfix expression.`,
    { result, done: true, highlight: stack.length > 0 ? [0] : [] },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<PostfixState>) {
  const s = frame.state;
  const stackVals: (number | string)[] = s.stack.length > 0 ? s.stack : ['∅'];
  const highlight = new Set(s.highlight);

  const pointers: ArrayPointer[] = [];
  if (s.stack.length > 0) {
    pointers.push({ i: s.stack.length - 1, label: 'top', tone: 'accent', place: 'below' });
  }

  const cellTone = (i: number) => {
    if (s.stack.length === 0) return '';
    if (s.done && i === 0) return 'found';
    if (s.pushed !== null && highlight.has(i)) return 'match';
    if (highlight.has(i)) return 'mid';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn('flex flex-wrap items-center gap-1 font-mono', vizText.sm)}>
        {s.tokens.map((t, i) => (
          <span
            key={i}
            className={cn(
              'rounded px-1.5 py-0.5',
              i === s.ti ? 'bg-accentbg text-accent' : 'text-ink3',
              s.ti !== null && i < s.ti ? 'opacity-50' : '',
            )}
          >
            {t}
          </span>
        ))}
      </div>

      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        stack (bottom → top)
        {s.op !== null && s.a !== null && s.b !== null && !s.done && (
          <>
            {' · '}
            <span className="font-mono text-ink">
              {s.a} {s.op} {s.b}
              {s.pushed !== null ? ` = ${s.pushed}` : ''}
            </span>
          </>
        )}
      </div>
      <ArrayRow values={stackVals} cellTone={cellTone} pointers={pointers} windowRange={null} />

      {s.result !== null && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>→ {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PostfixState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const tok = s.ti !== null ? s.tokens[s.ti] : '—';
  const top = s.stack.length > 0 ? s.stack[s.stack.length - 1] : '—';
  return (
    <VarGrid>
      <InspectorRow k="token" v={tok} />
      <InspectorRow k="stack size" v={s.stack.length} />
      <InspectorRow k="top" v={top} />
      <InspectorRow k="a (lower)" v={s.a ?? '—'} />
      <InspectorRow k="b (top)" v={s.b ?? '—'} />
      <InspectorRow k="op" v={s.op ?? '—'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-calculate-postfix';
export const title = 'Calculate postfix';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Calculate postfix\"?",
    choices: [
      {
        label: "Postfix evaluation stack — fits this problem",
        correct: true
      },
      {
        label: "Sliding window queue + running sum — different approach"
      },
      {
        label: "Stack — different approach"
      },
      {
        label: "Dual-stack infix calculator — different approach"
      }
    ],
    explain: "Numbers push; an operator pops two and pushes the result"
  },
  {
    id: "init",
    prompt: "At the start of a run (Calculate postfix), what strategy is established?",
    choices: [
      {
        label: "Numbers push; an operator pops two — described in INIT caption",
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
    explain: "Postfix (Reverse Polish) evaluation: scan tokens left to right. A number is pushed onto the stack; an operator pops the top two values, applies the op, and pushes the result. When done, the single remaining value is the answer."
  },
  {
    id: "key-step",
    prompt: "On the \"APPLY\" step (   = ), what happens?",
    choices: [
      {
        label: "Apply the operator: a b = — this move caption",
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
    explain: "Apply the operator: a  b =    = . Remove both operands and push the result  back onto the stack."
  },
  {
    id: "state",
    prompt: "What does the `ti` field track in the visualization state?",
    choices: [
      {
        label: "index of the token currently — updated each frame",
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
    explain: "The recorder keeps `ti` in sync: index of the token currently being processed"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Calculate postfix\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(2ⁿ) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(1) amortized time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n log n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). switch token; pop b then a; applyOp; stack[0] is answer"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "All tokens processed. One value remains — final DONE caption",
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
    explain: "All tokens processed. One value remains on the stack: . That is the value of the postfix expression."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'pf1', label: '2 1 + 3 * → 9', value: { tokens: ['2', '1', '+', '3', '*'] } },
    { id: 'pf2', label: '4 13 5 / + → 6', value: { tokens: ['4', '13', '5', '/', '+'] } },
  ] satisfies SampleInput<PostfixInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PostfixState | undefined;
    if (!s || s.result === null) return { ok: false, label: 'no result' };
    return { ok: true, label: `= ${s.result}` };
  },
};

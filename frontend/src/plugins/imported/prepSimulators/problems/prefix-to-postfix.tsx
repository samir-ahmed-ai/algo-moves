import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PreToPostInput {
  exp: string;
}

interface PreToPostState {
  exp: string;
  i: number | null; // current scan index (right-to-left)
  stack: string[]; // postfix fragments, bottom -> top
  a: string | null; // first popped operand (top)
  b: string | null; // second popped operand
  op: string | null; // operator just processed
  pushed: string | null; // fragment just pushed
  result: string | null;
  done: boolean;
}

function isOp(c: string): boolean {
  return c === '+' || c === '-' || c === '*' || c === '/';
}

function record({ exp }: PreToPostInput): Frame<PreToPostState>[] {  const stack: string[] = [];

  const { emit, frames } = createRecorder<PreToPostState>(() => ({
        exp,
        i: null,
        stack: stack.slice(),
        a: null,
        b: null,
        op: null,
        pushed: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `exp="${exp}"`,
    `Prefix to postfix: scan the prefix expression RIGHT to LEFT using a stack of postfix fragments. An operand is pushed as-is; an operator pops two fragments a and b (a is on top) and pushes a + b + op.`,
    {},
  );

  for (let i = exp.length - 1; i >= 0; i--) {
    const c = exp[i];
    if (c === ' ') {
      emit('SKIP', `i=${i} space`, `Position ${i} is a space — skip it.`, { i });
      continue;
    }
    if (isOp(c)) {
      const a = stack[stack.length - 1];
      const b = stack[stack.length - 2];
      stack.pop();
      stack.pop();
      const pushed = a + b + c;
      stack.push(pushed);
      emit(
        'OP',
        `'${c}': ${a}+${b}+${c}`,
        `'${c}' is an operator. Pop the top fragment a="${a}" and the next fragment b="${b}", then push a + b + '${c}' = "${pushed}". In postfix the operands come before the operator.`,
        { i, a, b, op: c, pushed, stack: stack.slice() },
      );
    } else {
      stack.push(c);
      emit(
        'OPERAND',
        `push '${c}'`,
        `'${c}' is an operand. Push it onto the stack unchanged.`,
        { i, pushed: c, stack: stack.slice() },
      );
    }
  }

  const result = stack[stack.length - 1];
  emit(
    'DONE',
    `result="${result}"`,
    `The scan is finished and one fragment remains on the stack: "${result}". That is the postfix form of the input.`,
    { result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PreToPostState>) {
  const s = frame.state;
  const chars = [...s.exp];
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        prefix (scan <span className="font-mono text-ink">right → left</span>)
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {chars.map((ch, idx) => {
          const active = s.i === idx;
          return (
            <div
              key={idx}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded border font-mono',
                vizText.base,
                active ? 'border-accent bg-accentbg text-accent' : 'border-edge bg-panel2 text-ink',
              )}
            >
              {ch === ' ' ? '␣' : ch}
            </div>
          );
        })}
      </div>

      <div className={cn('mt-3', vizText.sm, 'text-ink3')}>stack (bottom → top)</div>
      <div className="mt-1 flex flex-wrap items-end gap-1">
        {s.stack.length === 0 ? (
          <span className={cn('font-mono', vizText.sm, 'text-ink3')}>empty</span>
        ) : (
          s.stack.map((frag, idx) => {
            const top = idx === s.stack.length - 1;
            return (
              <div
                key={idx}
                className={cn(
                  'flex min-w-[28px] items-center justify-center rounded border px-2 py-1 font-mono',
                  vizText.base,
                  top ? 'border-good bg-panel2 text-good' : 'border-edge bg-panel2 text-ink',
                )}
              >
                {frag}
              </div>
            );
          })
        )}
      </div>

      {s.result && (
        <div className={cn('mt-3 font-mono text-good', vizText.base)}>postfix → {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PreToPostState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.i !== null ? s.exp[s.i] : '—';
  return (
    <VarGrid>
      <InspectorRow k="i (scan)" v={s.i ?? '—'} />
      <InspectorRow k="char" v={cur === ' ' ? '␣' : cur} />
      <InspectorRow k="a (top)" v={s.a ?? '—'} />
      <InspectorRow k="b (next)" v={s.b ?? '—'} />
      <InspectorRow k="op" v={s.op ?? '—'} />
      <InspectorRow k="pushed" v={s.pushed ?? '—'} />
      <InspectorRow k="stack size" v={s.stack.length} />
      <InspectorRow k="result" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

function prefixToPostfix(exp: string): string {
  const stack: string[] = [];
  for (let i = exp.length - 1; i >= 0; i--) {
    const c = exp[i];
    if (c === ' ') continue;
    if (isOp(c)) {
      const a = stack[stack.length - 1];
      const b = stack[stack.length - 2];
      stack.pop();
      stack.pop();
      stack.push(a + b + c);
    } else {
      stack.push(c);
    }
  }
  return stack[stack.length - 1];
}

export const manifestId = 'prep-stacks-queues-prefix-to-postfix';
export const title = 'Prefix to postfix';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Prefix to postfix\"?",
    choices: [
      {
        label: "Reverse scan prefix stack — fits this problem",
        correct: true
      },
      {
        label: "Stack bracket matching — different approach"
      },
      {
        label: "Dual Stack (counts + strings) — different approach"
      },
      {
        label: "Shunting-yard (no parens) — different approach"
      }
    ],
    explain: "Scan right-to-left; an operator pops two operand strings"
  },
  {
    id: "init",
    prompt: "At the start of a run (Prefix to postfix), what strategy is established?",
    choices: [
      {
        label: "Scan right-to-left; an operator pops two — described in INIT caption",
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
    explain: "Prefix to postfix: scan the prefix expression RIGHT to LEFT using a stack of postfix fragments. An operand is pushed as-is; an operator pops two fragments a and b (a is on top) and pushes a + b + op."
  },
  {
    id: "key-step",
    prompt: "On the \"OP\" step ('': ++), what happens?",
    choices: [
      {
        label: "'' is an operator. Pop — this move caption",
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
    explain: "'' is an operator. Pop the top fragment a=\"\" and the next fragment b=\"\", then push a + b + '' = \"\". In postfix the operands come before the operator."
  },
  {
    id: "state",
    prompt: "What does the `i` field track in the visualization state?",
    choices: [
      {
        label: "current scan index (right-to-left) — updated each frame",
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
    explain: "The recorder keeps `i` in sync: current scan index (right-to-left)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Prefix to postfix\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(n³) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(1) per next time, O(k) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). operand push; operator -> push a+b+op"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "The scan is finished and one — final DONE caption",
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
    explain: "The scan is finished and one fragment remains on the stack: \"\". That is the postfix form of the input."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'p2p1', label: '*-A/BC-DE', value: { exp: '*-A/BC-DE' } },
    { id: 'p2p2', label: '+AB', value: { exp: '+AB' } },
  ] satisfies SampleInput<PreToPostInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PreToPostState | undefined;
    const expected = s ? prefixToPostfix(s.exp) : '';
    const ok = !!s?.result && s.result === expected;
    return { ok, label: s?.result ?? 'no result' };
  },
};

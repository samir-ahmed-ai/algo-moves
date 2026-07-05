import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface InfixInput {
  exp: string;
}

interface InfixState {
  exp: string; // the raw infix expression, characters only (no spaces shown in tokens)
  tokens: string[]; // exp split into single-char tokens (spaces filtered out)
  i: number | null; // index into tokens of the char being processed
  ops: string[]; // operator stack, bottom → top
  out: string[]; // postfix output built so far, left → right
  result: string | null; // final postfix string once finished
  done: boolean;
}

function prec(c: string): number {
  if (c === '+' || c === '-') return 1;
  if (c === '*' || c === '/') return 2;
  return 0;
}

function record({ exp }: InfixInput): Frame<InfixState>[] {
  const tokens = exp.split('').filter((c) => c !== ' ');  const ops: string[] = [];
  const out: string[] = [];

  const { emit, frames } = createRecorder<InfixState>(() => ({
        exp,
        tokens,
        i: null,
        ops: ops.slice(),
        out: out.slice(),
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `exp=${exp.replace(/ /g, '')}`,
    `Infix → postfix via the shunting-yard scan (no parentheses). Operands flow straight to the output; operators wait on a precedence stack. Rule: before pushing operator c, pop every stacked operator whose precedence is ≥ prec(c).`,
    {},
  );

  for (let i = 0; i < tokens.length; i++) {
    const c = tokens[i];
    if (c >= '0' && c <= '9') {
      out.push(c);
      emit(
        'OPERAND',
        `out += ${c}`,
        `'${c}' is an operand (digit), so it goes directly to the output. Output is now "${out.join('')}".`,
        { i, out: out.slice() },
      );
      continue;
    }
    // c is an operator: pop while top has precedence >= prec(c).
    while (ops.length > 0 && prec(ops[ops.length - 1]) >= prec(c)) {
      const top = ops[ops.length - 1];
      out.push(top);
      ops.pop();
      emit(
        'POP',
        `pop ${top}`,
        `Operator '${c}' has precedence ${prec(c)}. The stack top '${top}' has precedence ${prec(top)} (≥ ${prec(c)}), so pop '${top}' to the output before pushing '${c}'. Output: "${out.join('')}".`,
        { i, ops: ops.slice(), out: out.slice() },
      );
    }
    ops.push(c);
    emit(
      'PUSH',
      `push ${c}`,
      `Now push operator '${c}' (precedence ${prec(c)}) onto the stack — it waits there until a lower- or equal-precedence operator, or the end, forces it out. Stack: [${ops.join(' ')}].`,
      { i, ops: ops.slice() },
    );
  }

  // Flush remaining operators.
  while (ops.length > 0) {
    const top = ops[ops.length - 1];
    out.push(top);
    ops.pop();
    emit(
      'FLUSH',
      `flush ${top}`,
      `Input exhausted — flush the leftover operators top-to-bottom. Pop '${top}' to the output. Output: "${out.join('')}".`,
      { i: null, ops: ops.slice(), out: out.slice() },
    );
  }

  const result = out.join('');
  emit(
    'DONE',
    `→ ${result}`,
    `Done. The postfix (reverse-Polish) form of "${exp.replace(/ /g, '')}" is "${result}". Time O(n), space O(n) for the operator stack.`,
    { result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<InfixState>) {
  const s = frame.state;
  const inputPointers: ArrayPointer[] = [];
  if (s.i !== null) inputPointers.push({ i: s.i, label: 'c', tone: 'accent', place: 'above' });
  const inputTone = (i: number) => (s.i === i ? 'match' : i < (s.i ?? -1) ? 'dead' : '');

  const opsCells = s.ops.length ? s.ops : ['·'];
  const topIdx = s.ops.length - 1;
  const opsTone = (i: number) => (s.ops.length > 0 && i === topIdx ? 'hi' : '');
  const opsPointers: ArrayPointer[] =
    s.ops.length > 0 ? [{ i: topIdx, label: 'top', tone: 'warn', place: 'below' }] : [];

  const outCells = s.out.length ? s.out : ['·'];
  const outTone = (_i: number) => (s.done && s.out.length > 0 ? 'found' : s.out.length > 0 ? 'match' : '');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        infix = <span className="font-mono text-ink">{s.exp.replace(/ /g, '')}</span>
      </div>
      <ArrayRow values={s.tokens} cellTone={inputTone} pointers={inputPointers} windowRange={null} />

      <div className={cn('mt-3', vizText.sm, 'text-ink3')}>operator stack (bottom → top)</div>
      <ArrayRow values={opsCells} cellTone={opsTone} pointers={opsPointers} windowRange={null} />

      <div className={cn('mt-3', vizText.sm, 'text-ink3')}>postfix output</div>
      <ArrayRow values={outCells} cellTone={outTone} pointers={[]} windowRange={null} />

      {s.result !== null && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>→ {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<InfixState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.i !== null ? s.tokens[s.i] : '—';
  return (
    <VarGrid>
      <InspectorRow k="char c" v={cur} />
      <InspectorRow k="prec(c)" v={s.i !== null ? prec(s.tokens[s.i]) : '—'} />
      <InspectorRow k="stack top" v={s.ops.length ? s.ops[s.ops.length - 1] : '—'} />
      <InspectorRow k="stack" v={s.ops.length ? `[${s.ops.join(' ')}]` : 'empty'} />
      <InspectorRow k="output" v={s.out.length ? s.out.join('') : '—'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? '' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-infix-to-postfix';
export const title = 'Infix to postfix';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Infix to postfix\"?",
    choices: [
      {
        label: "Shunting-yard (no parens) — fits this problem",
        correct: true
      },
      {
        label: "Two Pointers — different approach"
      },
      {
        label: "Postfix evaluation stack — different approach"
      },
      {
        label: "Stack with auxiliary min stack — different approach"
      }
    ],
    explain: "Operands flow straight to output; operators wait on a precedence stack"
  },
  {
    id: "init",
    prompt: "At the start of a run (Infix to postfix), what strategy is established?",
    choices: [
      {
        label: "Operands flow straight to output; — described in INIT caption",
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
    explain: "Infix → postfix via the shunting-yard scan (no parentheses). Operands flow straight to the output; operators wait on a precedence stack. Rule: before pushing operator c, pop every stacked operator whose precedence is ≥ prec(c)."
  },
  {
    id: "key-step",
    prompt: "On the \"PUSH\" step (push ), what happens?",
    choices: [
      {
        label: "Now push operator '' (precedence ) — this move caption",
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
    explain: "Now push operator '' (precedence ) onto the stack — it waits there until a lower- or equal-precedence operator, or the end, forces it out. Stack: []."
  },
  {
    id: "state",
    prompt: "What does the `exp` field track in the visualization state?",
    choices: [
      {
        label: "the raw infix expression, characters — updated each frame",
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
    explain: "The recorder keeps `exp` in sync: the raw infix expression, characters only (no spaces shown in tokens)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Infix to postfix\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(m·n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(1) per op time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n²) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). pop ops with prec>=cur before pushing cur; flush at end"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Done. The postfix (reverse-Polish) form — final DONE caption",
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
    explain: "Done. The postfix (reverse-Polish) form of \"\" is \"\". Time O(n), space O(n) for the operator stack."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'itp1', label: '2+3*4', value: { exp: '2+3*4' } },
    { id: 'itp2', label: '4*2+3-1', value: { exp: '4*2+3-1' } },
  ] satisfies SampleInput<InfixInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as InfixState | undefined;
    return s?.result ? { ok: true, label: s.result } : { ok: false, label: 'no output' };
  },
};

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  vizText,
} from '../../../_shared/vizKit';

interface ExprInput {
  postfix: string[];
}

interface ExprNode {
  val: string;
  left: ExprNode | null;
  right: ExprNode | null;
}

interface ExprState {
  stack: string[];
  tree: ExprNode | null;
  op: string;
  result: number | null;
  done: boolean;
}

function evaluate(n: ExprNode | null): number {
  if (!n) return 0;
  if (!n.left) return parseInt(n.val, 10);
  const l = evaluate(n.left);
  const r = evaluate(n.right);
  switch (n.val) {
    case '+':
      return l + r;
    case '-':
      return l - r;
    case '*':
      return l * r;
    case '/':
      return Math.trunc(l / r);
    default:
      return 0;
  }
}

function treeLabel(n: ExprNode | null): string {
  if (!n) return '—';
  if (!n.left) return n.val;
  return `(${treeLabel(n.left)} ${n.val} ${treeLabel(n.right)})`;
}

function record({ postfix }: ExprInput): Frame<ExprState>[] {
  const nodeStack: ExprNode[] = [];
  const labelStack: string[] = [];

  const { emit, frames } = createPrepRecorder<ExprState>(() => ({
    stack: labelStack.slice(),
    tree: nodeStack[nodeStack.length - 1]! ?? null,
    op: '',
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    postfix.join(' '),
    `Expression Tree: build from postfix via stack. Operands push nodes; operators pop two and push subtree.`,
    {},
  );

  for (const tok of postfix) {
    if (tok === '+' || tok === '-' || tok === '*' || tok === '/') {
      const r = nodeStack.pop()!;
      const l = nodeStack.pop()!;
      nodeStack.push({ val: tok, left: l, right: r });
      const rl = labelStack.pop() ?? '?';
      const ll = labelStack.pop() ?? '?';
      labelStack.push(`(${ll}${tok}${rl})`);
      emit('OP', tok, `Operator "${tok}": pop ${rl} and ${ll}, push subtree (${ll}${tok}${rl}).`, {
        op: tok,
        stack: labelStack.slice(),
        tree: nodeStack[nodeStack.length - 1]!,
      });
    } else {
      nodeStack.push({ val: tok, left: null, right: null });
      labelStack.push(tok);
      emit('PUSH', tok, `Operand "${tok}": push leaf node.`, {
        op: tok,
        stack: labelStack.slice(),
      });
    }
  }

  const tree = nodeStack[0]! ?? null;
  const result = evaluate(tree);
  emit(
    'EVAL',
    `=${result}`,
    `Evaluate tree ${treeLabel(tree)} → ${result}.`,
    { op: 'evaluate', tree, result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ExprState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.result !== null && (
        <RailGroup label="result">
          <RailStat k="val" v={s.result} tone="good" />
        </RailGroup>
      )}
      <RailGroup label="stack">
        <RailStat k="depth" v={s.stack.length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="mt-1 flex flex-wrap gap-1">
        {s.stack.map((x, i) => (
          <span
            key={i}
            className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}
          >
            {x}
          </span>
        ))}
      </div>
      {s.tree && (
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink')}>
          tree: {treeLabel(s.tree)}
        </div>
      )}
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ExprState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="stack depth" v={s.stack.length} />
      <InspectorRow k="result" v={s.result ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-design-an-expression-tree-with-evaluate-function';
export const title = 'Design an Expression Tree With Evaluate Function';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How is the expression tree built from postfix tokens?',
    choices: [
      {
        label: 'Operand/operator stack — push leaves, pop two for ops',
        correct: true,
      },
      {
        label: 'Recursive descent parser — top-down grammar on infix',
      },
      {
        label: 'Copy-on-write map stack — versioned snapshot per token',
      },
      {
        label: 'Merge-walk index pairs — multiply matching sparse entries',
      },
    ],
    explain: 'Numbers push ExprNode leaves; operators pop right then left and push a subtree node.',
  },
  {
    id: 'key-step',
    prompt: 'On OP for operator token, what stack operations occur?',
    choices: [
      {
        label: 'Pop right and left subtrees — push combined operator node',
        correct: true,
      },
      {
        label: 'Pop one operand path — unary operators in this postfix',
      },
      {
        label: 'Push operator without pops — defer combine until EVAL',
      },
      {
        label: 'Clear stack — rebuild from postfix scratch each operator',
      },
    ],
    explain:
      'const r = pop(); const l = pop(); push({ val: tok, left: l, right: r }) wires the subtree.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds to build and evaluate the expression tree?',
    choices: [
      {
        label: 'O(n) time, O(n) space — one stack pass over n tokens',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(1) space — sort tokens before build',
      },
      {
        label: 'O(n²) time, O(n) space — reparse entire postfix each token',
      },
      {
        label: 'O(1) time, O(n²) space — materialize all subtrees upfront',
      },
    ],
    explain:
      'Each token does constant stack work; final evaluate walks tree size proportional to n.',
  },
  {
    id: 'edge',
    prompt: 'How does evaluate handle division in this simulator?',
    choices: [
      {
        label: 'Math.trunc toward zero — integer division on child values',
        correct: true,
      },
      {
        label: 'Floating round nearest — preserve fractional quotients',
      },
      {
        label: 'Floor division — always round toward negative infinity',
      },
      {
        label: 'Reject division — abort when denominator non-zero',
      },
    ],
    explain:
      'The evaluate switch uses Math.trunc(l / r) for / tokens after recursive child evaluation.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'expr1',
      label: '3 4 + 2 *',
      value: { postfix: ['3', '4', '+', '2', '*'] },
    },
    {
      id: 'expr2',
      label: '10 2 / 3 +',
      value: { postfix: ['10', '2', '/', '3', '+'] },
    },
  ] satisfies SampleInput<ExprInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ExprState | undefined;
    return s?.result != null
      ? { ok: true, label: `=${s.result}` }
      : { ok: false, label: 'incomplete' };
  },
};

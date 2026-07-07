import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

  const { emit, frames } = createRecorder<ExprState>(() => ({
    stack: labelStack.slice(),
    tree: nodeStack[nodeStack.length - 1] ?? null,
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
        tree: nodeStack[nodeStack.length - 1],
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

  const tree = nodeStack[0] ?? null;
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result !== null && <span className="ml-2 font-mono text-good">= {s.result}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>stack</div>
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
    </div>
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
    prompt: 'Which approach fits "Expression Tree / Design an Expression Tree"?',
    choices: [
      {
        label: 'Stack — fits this problem',
        correct: true,
      },
      {
        label: 'Log parsing aggregation — different approach',
      },
      {
        label: 'Copy-on-write version snapshots — different approach',
      },
      {
        label: 'Trie dictionary + spell suggest — different approach',
      },
    ],
    explain: 'See Design An Expression Tree With Evaluate Function pattern',
  },
  {
    id: 'key-step',
    prompt: 'On the "EVAL" step (=), what happens?',
    choices: [
      {
        label: 'Evaluate tree → . — this move caption',
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
    explain: 'Evaluate tree  → .',
  },
  {
    id: 'state',
    prompt: 'What does the `stack` field track in the visualization state?',
    choices: [
      {
        label: 'Field stack in state — updated each frame',
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
    explain:
      'The recorder snapshots `stack` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "Expression Tree / Design an Expression Tree"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(versions) get time, O(changes) space — wrong order of growth',
      },
      {
        label: 'O(logs) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(n). Design An Expression Tree With Evaluate Function',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Evaluate tree → . — final DONE caption',
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
    explain: 'Evaluate tree  → .',
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

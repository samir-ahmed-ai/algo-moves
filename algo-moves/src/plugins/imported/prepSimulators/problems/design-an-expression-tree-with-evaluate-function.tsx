import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
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
  const frames: Frame<ExprState>[] = [];
  const nodeStack: ExprNode[] = [];
  const labelStack: string[] = [];

  const emit = (type: string, note: string, caption: string, s: Partial<ExprState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        stack: labelStack.slice(),
        tree: nodeStack[nodeStack.length - 1] ?? null,
        op: '',
        result: null,
        done: false,
        ...s,
      },
    });

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
      emit(
        'OP',
        tok,
        `Operator "${tok}": pop ${rl} and ${ll}, push subtree (${ll}${tok}${rl}).`,
        { op: tok, stack: labelStack.slice(), tree: nodeStack[nodeStack.length - 1] },
      );
    } else {
      nodeStack.push({ val: tok, left: null, right: null });
      labelStack.push(tok);
      emit('PUSH', tok, `Operand "${tok}": push leaf node.`, { op: tok, stack: labelStack.slice() });
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
          <span key={i} className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}>
            {x}
          </span>
        ))}
      </div>
      {s.tree && (
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink')}>tree: {treeLabel(s.tree)}</div>
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

export const simulator: ProblemSimulator = {
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
    return s?.result != null ? { ok: true, label: `=${s.result}` } : { ok: false, label: 'incomplete' };
  },
};

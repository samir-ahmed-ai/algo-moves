import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface InfixInput {
  exp: string;
}

interface InfixState {
  exp: string;
  i: number | null; // index of the char we are looking at
  nums: number[]; // value stack (left → bottom, right → top)
  ops: string[]; // operator stack
  applyA: number | null; // operand a in the last apply
  applyB: number | null; // operand b in the last apply
  applyOp: string | null; // operator in the last apply
  applyResult: number | null; // a op b
  answer: number | null;
  done: boolean;
}

function applyInfix(a: number, b: number, op: string): number {
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

function opPrec(op: string): number {
  return op === '+' || op === '-' ? 1 : 2;
}

function record({ exp }: InfixInput): Frame<InfixState>[] {
  const frames: Frame<InfixState>[] = [];
  const nums: number[] = [];
  const ops: string[] = [];
  let lastApply: { a: number; b: number; op: string; result: number } | null = null;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<InfixState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        exp,
        i: null,
        nums: nums.slice(),
        ops: ops.slice(),
        applyA: lastApply?.a ?? null,
        applyB: lastApply?.b ?? null,
        applyOp: lastApply?.op ?? null,
        applyResult: lastApply?.result ?? null,
        answer: null,
        done: false,
        ...s,
      },
    });

  const applyTop = () => {
    const op = ops.pop() as string;
    const b = nums.pop() as number;
    const a = nums.pop() as number;
    const result = applyInfix(a, b, op);
    nums.push(result);
    lastApply = { a, b, op, result };
  };

  emit(
    'INIT',
    `"${exp}"`,
    `Calculate Infix: evaluate "${exp}" with operator precedence using two stacks — one for numbers, one for operators. Time O(n), Space O(n).`,
    { i: 0 },
  );

  const n = exp.length;
  let i = 0;
  while (i < n) {
    const c = exp[i];
    if (c === ' ') {
      i++;
      continue;
    }
    if (c >= '0' && c <= '9') {
      let val = 0;
      const start = i;
      while (i < n && exp[i] >= '0' && exp[i] <= '9') {
        val = val * 10 + (exp.charCodeAt(i) - 48);
        i++;
      }
      nums.push(val);
      lastApply = null;
      emit(
        'PUSH_NUM',
        `push ${val}`,
        `Read the number ${val} (chars ${start}–${i - 1}). Push it onto the number stack.`,
        { i: i < n ? i : start },
      );
      continue;
    }
    // operator: flush all pending ops whose precedence is >= the current op
    while (ops.length > 0 && opPrec(ops[ops.length - 1]) >= opPrec(c)) {
      const top = ops[ops.length - 1];
      emit(
        'APPLY',
        `${top}`,
        `Operator '${c}' arrives. Top of the op stack '${top}' has precedence ${opPrec(top)} ≥ ${opPrec(c)}, so apply it first to the two top numbers.`,
        { i },
      );
      applyTop();
      emit(
        'APPLIED',
        `=${lastApply!.result}`,
        `${lastApply!.a} ${lastApply!.op} ${lastApply!.b} = ${lastApply!.result}. Pop both operands and '${lastApply!.op}', push the result ${lastApply!.result}.`,
        { i },
      );
    }
    ops.push(c);
    lastApply = null;
    emit(
      'PUSH_OP',
      `push ${c}`,
      `No higher- or equal-precedence operator pending, so push '${c}' onto the operator stack to wait for its right operand.`,
      { i },
    );
    i++;
  }

  // flush any remaining operators
  while (ops.length > 0) {
    const top = ops[ops.length - 1];
    emit(
      'APPLY',
      `${top}`,
      `End of expression but operator '${top}' is still pending — apply it to the two top numbers.`,
      { i: null },
    );
    applyTop();
    emit(
      'APPLIED',
      `=${lastApply!.result}`,
      `${lastApply!.a} ${lastApply!.op} ${lastApply!.b} = ${lastApply!.result}. Push the result ${lastApply!.result}.`,
      { i: null },
    );
  }

  const answer = nums.length > 0 ? nums[0] : 0;
  emit(
    'DONE',
    `${answer}`,
    `Both stacks are drained. The single remaining number ${answer} is the value of "${exp}".`,
    { i: null, answer, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<InfixState>) {
  const s = frame.state;
  if (s.exp.length === 0) return <VizEmpty />;

  const chars = s.exp.split('');
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && s.i < chars.length) {
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  }
  const charTone = (idx: number) => (s.i === idx ? 'match' : '');

  // top two numbers light up when an apply just happened
  const topIdx = s.nums.length - 1;
  const numTone = (idx: number) => {
    if (s.applyResult !== null && idx === topIdx) return 'found';
    if (idx === topIdx) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        expression
      </div>
      <ArrayRow values={chars} cellTone={charTone} pointers={pointers} windowRange={null} />

      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        nums stack <span className="text-ink2">(bottom → top)</span>
      </div>
      {s.nums.length === 0 ? (
        <div className={cn('font-mono text-ink3', vizText.sm)}>empty</div>
      ) : (
        <ArrayRow values={s.nums} cellTone={numTone} pointers={[]} windowRange={null} />
      )}

      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        ops stack <span className="text-ink2">(bottom → top)</span>
      </div>
      <div className={cn('font-mono text-ink', vizText.base)}>
        {s.ops.length === 0 ? <span className="text-ink3">empty</span> : `[ ${s.ops.join(' ')} ]`}
      </div>

      {s.applyOp !== null && (
        <div className={cn('mt-1 font-mono text-accent', vizText.sm)}>
          {s.applyA} {s.applyOp} {s.applyB} = {s.applyResult}
        </div>
      )}
      {s.done && s.answer !== null && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>→ {s.answer}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<InfixState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const ch = s.i !== null && s.i < s.exp.length ? s.exp[s.i] : '—';
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char" v={ch === ' ' ? '␣' : ch} />
      <InspectorRow k="nums top" v={s.nums.length > 0 ? s.nums[s.nums.length - 1] : '—'} />
      <InspectorRow k="nums size" v={s.nums.length} />
      <InspectorRow k="ops top" v={s.ops.length > 0 ? s.ops[s.ops.length - 1] : '—'} />
      <InspectorRow k="last apply" v={s.applyOp !== null ? `${s.applyA} ${s.applyOp} ${s.applyB} = ${s.applyResult}` : '—'} />
      <InspectorRow k="answer" v={s.done && s.answer !== null ? s.answer : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-calculate-infix';
export const title = 'Calculate infix';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ci1', label: '"2+3*4"', value: { exp: '2+3*4' } },
    { id: 'ci2', label: '"10+2*6-3"', value: { exp: '10+2*6-3' } },
  ] satisfies SampleInput<InfixInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as InfixState | undefined;
    if (!s || s.answer === null) return { ok: false, label: 'no result' };
    return { ok: true, label: `${s.answer}` };
  },
};

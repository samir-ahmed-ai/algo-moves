import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CalcInput {
  s: string;
}

type Op = '+' | '-' | '*' | '/';

interface CalcState {
  chars: string[]; // the expression, one char per cell
  i: number | null; // index currently being scanned
  num: number; // digit accumulator for the current number
  op: Op; // operator that applies to `num` when it is flushed
  stack: number[]; // signed terms; final answer is their sum
  applied: number | null; // stack slot just written/updated (for highlight)
  result: number | null; // final sum, once computed
  done: boolean;
}

const OPS: readonly Op[] = ['+', '-', '*', '/'] as const;
function isOp(c: string): c is Op {
  return (OPS as readonly string[]).includes(c);
}

function record({ s }: CalcInput): Frame<CalcState>[] {  const chars = s.split('');
  const stack: number[] = [];
  let num = 0;
  let op: Op = '+';

  const { emit, frames } = createRecorder<CalcState>(() => ({
        chars,
        i: null,
        num,
        op,
        stack: stack.slice(),
        applied: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `"${s}"`,
    `Basic Calculator II evaluates "${s}" with + − × ÷ (no parentheses). We scan left to right, building each number, and keep a stack of signed terms. × and ÷ act immediately on the top of the stack; + and − just push. The answer is the sum of the stack.`,
    {},
  );

  // Iterate one extra step (i === chars.length) to flush the last pending number,
  // exactly like the Go `for i := 0; i <= len(s); i++` loop.
  for (let i = 0; i <= chars.length; i++) {
    const c = i < chars.length ? chars[i] : '';

    if (i < chars.length && c === ' ') {
      emit('SKIP', 'space', `Index ${i} is a space — ignore it and keep scanning.`, { i });
      continue;
    }

    if (i < chars.length && c >= '0' && c <= '9') {
      num = num * 10 + (c.charCodeAt(0) - 48);
      emit(
        'DIGIT',
        `num=${num}`,
        `Digit '${c}' at index ${i}: fold it into the running number — num = num×10 + ${c} = ${num}. We only act once the number ends.`,
        { i, num },
      );
      continue;
    }

    // We hit an operator (or the end of the string): flush `num` using the
    // PREVIOUS operator `op`, then adopt this char as the next operator.
    const opName = op === '+' ? 'plus' : op === '-' ? 'minus' : op === '*' ? 'times' : 'divide';
    let flushCaption: string;
    let applied: number | null = null;

    switch (op) {
      case '+':
        stack.push(num);
        applied = stack.length - 1;
        flushCaption = `Pending operator is '+', so push +${num} onto the stack as its own term.`;
        break;
      case '-':
        stack.push(-num);
        applied = stack.length - 1;
        flushCaption = `Pending operator is '−', so push −${num} onto the stack as its own term.`;
        break;
      case '*': {
        const top = stack[stack.length - 1];
        const prod = top * num;
        stack[stack.length - 1] = prod;
        applied = stack.length - 1;
        flushCaption = `Pending operator is '×', so fold into the top of the stack: ${top} × ${num} = ${prod}. Multiplication binds tighter, so it consumes the previous term.`;
        break;
      }
      case '/': {
        const top = stack[stack.length - 1];
        // Go integer division truncates toward zero.
        const q = Math.trunc(top / num);
        stack[stack.length - 1] = q;
        applied = stack.length - 1;
        flushCaption = `Pending operator is '÷', so fold into the top of the stack: trunc(${top} ÷ ${num}) = ${q}. Division binds tighter, so it consumes the previous term.`;
        break;
      }
    }

    const atEnd = i >= chars.length;
    const nextOp: Op = atEnd ? op : isOp(c) ? c : op;
    const where = atEnd ? 'End of expression' : `Operator '${c}' at index ${i}`;

    // Reset the number accumulator for the next term, and adopt the new operator.
    num = 0;
    op = nextOp;

    emit(
      atEnd ? 'FLUSH' : 'OP',
      atEnd ? `flush (${opName})` : `op '${c}'`,
      `${where}: the number just built is complete. ${flushCaption}${atEnd ? '' : ` Remember '${c}' as the operator for the next number.`}`,
      { i: atEnd ? null : i, num: 0, op, applied },
    );
  }

  const result = stack.reduce((a, b) => a + b, 0);
  emit(
    'DONE',
    `= ${result}`,
    `Every term is on the stack: [${stack.join(', ')}]. Sum them to get the answer: ${result}.`,
    { result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<CalcState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');
  const opGlyph = s.op === '*' ? '×' : s.op === '/' ? '÷' : s.op === '-' ? '−' : '+';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        num = <span className="font-mono text-ink">{s.num}</span>
        {' · '}pending op ={' '}
        <span className="font-mono text-ink">{opGlyph}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        stack [
        {s.stack.map((v, i) => (
          <span key={i} className={cn(i === s.applied ? 'text-accent' : 'text-ink')}>
            {i > 0 ? ', ' : ''}
            {v}
          </span>
        ))}
        ]
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>= {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CalcState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const opGlyph = s.op === '*' ? '×' : s.op === '/' ? '÷' : s.op === '-' ? '−' : '+';
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char" v={s.i !== null && s.i < s.chars.length ? `'${s.chars[s.i]}'` : '—'} />
      <InspectorRow k="num" v={s.num} />
      <InspectorRow k="pending op" v={opGlyph} />
      <InspectorRow k="stack" v={`[${s.stack.join(', ')}]`} />
      <InspectorRow k="result" v={s.result ?? (s.done ? '0' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-basic-calculator-ii';
export const title = 'Basic Calculator II';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'bc1', label: '"3+2*2"', value: { s: '3+2*2' } },
    { id: 'bc2', label: '" 3/2 "', value: { s: ' 3/2 ' } },
  ] satisfies SampleInput<CalcInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CalcState | undefined;
    const v = s?.result ?? 0;
    return { ok: true, label: `= ${v}` };
  },
};

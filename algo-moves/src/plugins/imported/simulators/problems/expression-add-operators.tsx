import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, ExprToken } from '../../../_shared/vizKit';

interface ExprInput {
  num: string;
  target: number;
}

interface ExprState {
  num: string;
  target: number;
  idx: number; // next digit index to consume
  path: string; // expression built so far
  evalv: number; // running value of `path`
  prev: number; // last operand (signed) for '*' precedence
  results: string[];
  done: boolean;
}

function record({ num, target }: ExprInput): Frame<ExprState>[] {
  const frames: Frame<ExprState>[] = [];
  const results: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    idx: number,
    path: string,
    evalv: number,
    prev: number,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { num, target, idx, path, evalv, prev, results: results.slice(), done: type === 'DONE' },
    });

  emit(
    'INIT',
    `${num} → ${target}`,
    `Insert '+', '-', '*', or nothing (to grow a multi-digit operand) between the digits of "${num}" so the expression equals ${target}. Track the running value and the previous operand so '*' can undo and reapply with correct precedence.`,
    0,
    '',
    0,
    0,
  );

  const bt = (idx: number, path: string, evalv: number, prev: number) => {
    if (idx === num.length) {
      if (evalv === target) {
        results.push(path);
        emit(
          'RECORD',
          `+"${path}"`,
          `All digits used and "${path}" = ${evalv} = target ${target} — record it (${results.length} so far).`,
          idx,
          path,
          evalv,
          prev,
          'good',
        );
      } else {
        emit(
          'REJECT',
          `${evalv}≠${target}`,
          `All digits used but "${path}" = ${evalv} ≠ target ${target} — discard this expression.`,
          idx,
          path,
          evalv,
          prev,
        );
      }
      return;
    }
    for (let i = idx; i < num.length; i++) {
      if (i > idx && num[idx] === '0') break; // no leading-zero multi-digit operands
      const sub = num.slice(idx, i + 1);
      const val = parseInt(sub, 10);
      if (idx === 0) {
        emit(
          'START',
          `${sub}`,
          `Start the expression with operand ${sub}. Running value = ${val}.`,
          i + 1,
          sub,
          val,
          val,
        );
        bt(i + 1, sub, val, val);
      } else {
        emit(
          'PLUS',
          `+${sub}`,
          `Choose '+${sub}': running value ${evalv} + ${val} = ${evalv + val}.`,
          i + 1,
          path + '+' + sub,
          evalv + val,
          val,
        );
        bt(i + 1, path + '+' + sub, evalv + val, val);

        emit(
          'MINUS',
          `-${sub}`,
          `Choose '-${sub}': running value ${evalv} - ${val} = ${evalv - val}.`,
          i + 1,
          path + '-' + sub,
          evalv - val,
          -val,
        );
        bt(i + 1, path + '-' + sub, evalv - val, -val);

        const muled = evalv - prev + prev * val;
        emit(
          'TIMES',
          `*${sub}`,
          `Choose '*${sub}': '*' binds to the previous operand ${prev}. Undo it (${evalv} - ${prev}) then add ${prev}*${val} = ${prev * val}, giving ${muled}.`,
          i + 1,
          path + '*' + sub,
          muled,
          prev * val,
        );
        bt(i + 1, path + '*' + sub, muled, prev * val);
      }
    }
  };

  bt(0, '', 0, 0);
  emit(
    'DONE',
    `${results.length} found`,
    `All operator placements explored — ${results.length} expression${results.length === 1 ? '' : 's'} of "${num}" equal ${target}: ${results.map((r) => `"${r}"`).join(', ')}.`,
    num.length,
    '',
    0,
    0,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ExprState>) {
  const s = frame.state;
  const digits = num2chars(s.num);
  const pointers: ArrayPointer[] = [];
  if (!s.done && s.idx < s.num.length) {
    pointers.push({ i: s.idx, label: 'next', tone: 'warn', place: 'above' });
  }
  const tone = (i: number) => (i < s.idx ? 'match' : '');
  const rail = (
    <>
      <RailGroup label="expr">
        <RailStat k="path" v={s.path || '·'} tone="accent" />
        <RailStat k="value" v={s.evalv} />
        {!s.done && <RailStat k="prev" v={s.prev} />}
      </RailGroup>
      <RailStack label="found" items={s.results} />
      {s.done && <RailResult label="total" value={s.results.length} tone={s.results.length > 0 ? 'good' : 'bad'} />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow values={digits} cellTone={tone} pointers={pointers} />
      <ExprToken>{s.path || '·'}</ExprToken>
    </VizStage>
  );
}

function num2chars(num: string): string[] {
  return num.split('');
}

function Inspector({ frame }: InspectorProps<ExprState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="num / target" v={`${s.num} / ${s.target}`} />
      <InspectorRow k="expression" v={`"${s.path}"`} />
      <InspectorRow k="value" v={s.evalv} />
      <InspectorRow k="prev operand" v={s.prev} />
      <InspectorRow k="found" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'imp-31-expression-add-operators';
export const title = 'Expression Add Operators';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: '123-6', label: '"123", 6', value: { num: '123', target: 6 } },
    { id: '232-8', label: '"232", 8', value: { num: '232', target: 8 } },
  ] satisfies SampleInput<ExprInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ExprState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} found` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, vizText, ExprToken } from '../../../_shared/vizKit';

interface ParensInput {
  expr: string;
}

interface ParensState {
  expr: string; // the whole expression being parenthesized
  span: string; // the current substring being split
  op: string; // the operator chosen at this split (or '')
  left: string; // left substring of the current split
  right: string; // right substring of the current split
  results: number[]; // accumulating results for the whole expression
  done: boolean;
}

function record({ expr }: ParensInput): Frame<ParensState>[] {  const results: number[] = [];

  const { emit, frames } = createRecorder<ParensState>(() => ({
        expr: expr,
        results: results.slice(),
        span: '',
        op: '',
        left: '',
        right: '',
        done: false
      }));

  emit('INIT', `"${expr}"`, `Compute every value "${expr}" can take by parenthesizing it differently. Divide and conquer: at each operator, recursively evaluate the left and right substrings, then combine every left result with every right result.`, { span: expr, op: '', left: '', right: '' });

  const apply = (a: number, op: string, b: number): number =>
    op === '+' ? a + b : op === '-' ? a - b : a * b;

  // Returns all values the substring can evaluate to.
  const solve = (s: string): number[] => {
    let isNumber = true;
    const out: number[] = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '+' || c === '-' || c === '*') {
        isNumber = false;
        const lStr = s.slice(0, i);
        const rStr = s.slice(i + 1);
        emit('SPLIT', `split @ ${c}`, `Split "${s}" at the '${c}' between "${lStr}" and "${rStr}". Recurse on each side, then combine with '${c}'.`, { span: s, op: c, left: lStr, right: rStr });
        const left = solve(lStr);
        const right = solve(rStr);
        for (const a of left) {
          for (const b of right) {
            const v = apply(a, c, b);
            out.push(v);
            if (s === expr) {
              results.push(v);
              emit('COMBINE', `${a}${c}${b}=${v}`, `Top-level combine: ${a} ${c} ${b} = ${v}. Record ${v} (${results.length} value${results.length === 1 ? '' : 's'} so far).`, { span: s, op: c, left: lStr, right: rStr }, 'good');
            }
          }
        }
      }
    }
    if (isNumber) {
      const v = parseInt(s, 10);
      emit('LEAF', `${s}=${v}`, `"${s}" has no operator — it evaluates to the single value ${v}.`, { span: s, op: '', left: '', right: '' });
      return [v];
    }
    return out;
  };

  solve(expr);
  const sorted = results.slice().sort((a, b) => a - b);
  emit('DONE', `${results.length} values`, `Every parenthesization explored — "${expr}" can evaluate to ${results.length} value${results.length === 1 ? '' : 's'}: [${sorted.join(', ')}].`, { span: expr, op: '', left: '', right: '' , done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<ParensState>) {
  const s = frame.state;
  const sorted = s.results.slice().sort((a, b) => a - b);
  const rail = (
    <>
      <RailGroup label="split">
        <RailStat k="span" v={s.span || '—'} />
        <RailStat k="op" v={s.op || '—'} tone={s.op ? 'accent' : undefined} />
      </RailGroup>
      <RailStack
        label="results"
        items={sorted.map(String)}
        highlightEnd="bottom"
        topLabel="latest"
      />
      {s.done && (
        <RailResult label="total" value={s.results.length} tone="good" />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <div className={`${vizText.sm} text-ink3`}>
        parenthesizing <span className="font-mono text-ink">{s.expr}</span>
      </div>
      <ExprToken>
        {s.op ? (
          <>
            <span className={`chip ${vizText.expr}`}>{s.left || '·'}</span>
            <span className="text-accent">{s.op}</span>
            <span className={`chip ${vizText.expr}`}>{s.right || '·'}</span>
          </>
        ) : (
          <span>{s.span || '·'}</span>
        )}
      </ExprToken>
      <div className={`${vizText.sm} text-ink2`}>
        {s.op
          ? `splitting "${s.span}" at '${s.op}'`
          : s.done
            ? 'all splits explored'
            : `evaluating "${s.span}"`}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ParensState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="expression" v={`"${s.expr}"`} />
      <InspectorRow k="current span" v={`"${s.span}"`} />
      <InspectorRow k="operator" v={s.op || '—'} />
      <InspectorRow k="left / right" v={s.op ? `"${s.left}" / "${s.right}"` : '—'} />
      <InspectorRow k="results" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'imp-39-different-ways-to-add-parentheses';
export const title = 'Different Ways to Add Parentheses';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: '2-1-1', label: '"2-1-1"', value: { expr: '2-1-1' } },
    { id: '2*3-4*5', label: '"2*3-4*5"', value: { expr: '2*3-4*5' } },
  ] satisfies SampleInput<ParensInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ParensState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} values` };
  },
};

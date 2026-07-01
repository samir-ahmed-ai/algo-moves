import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, PathDisplay, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ParenInput {
  n: number;
}

interface ParenState {
  n: number;
  path: string; // current partial string of parentheses
  open: number; // count of '(' placed
  close: number; // count of ')' placed
  results: string[];
  done: boolean;
}

function record({ n }: ParenInput): Frame<ParenState>[] {
  const frames: Frame<ParenState>[] = [];
  const results: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    path: string,
    open: number,
    close: number,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { n, path, open, close, results: results.slice(), done: type === 'DONE' },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Build every valid string of ${n} pairs of parentheses. Two choices at each step: add '(' while open < ${n}, or add ')' while close < open (closing only what is already open keeps the string valid). There are C(${n}) = Catalan(${n}) results.`,
    '',
    0,
    0,
  );

  const bt = (path: string, open: number, close: number) => {
    if (path.length === 2 * n) {
      results.push(path);
      emit(
        'RECORD',
        `+"${path}"`,
        `Length reached ${2 * n} with open=close=${n} — record the valid string "${path}" (${results.length} so far).`,
        path,
        open,
        close,
        'good',
      );
      return;
    }
    if (open < n) {
      emit(
        'OPEN',
        `add '('`,
        `open=${open} < ${n}, so we may add '('. Now open=${open + 1}, close=${close}. path = "${path}(".`,
        path + '(',
        open + 1,
        close,
      );
      bt(path + '(', open + 1, close);
    }
    if (close < open) {
      emit(
        'CLOSE',
        `add ')'`,
        `close=${close} < open=${open}, so we may add ')' to match an open bracket. Now open=${open}, close=${close + 1}. path = "${path})".`,
        path + ')',
        open,
        close + 1,
      );
      bt(path + ')', open, close + 1);
    }
  };

  bt('', 0, 0);
  emit(
    'DONE',
    `${results.length} strings`,
    `All branches explored — ${results.length} valid parenthesizations of ${n} pairs.`,
    '',
    0,
    0,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ParenState>) {
  const s = frame.state;
  const decision =
    s.done || s.path.length === 0
      ? `open ${s.open} / ${s.n} · close ${s.close}`
      : `open=${s.open} (cap ${s.n}) · close=${s.close} (cap ${s.open})`;
  return (
    <div className="board-area board-area--text">
      <div className={cn(vizText.sm, 'text-ink3')}>building valid parentheses · n={s.n}</div>
      <PathDisplay value={s.path || '·'} />
      <div className={cn(vizText.sm, 'text-ink2')}>{decision}</div>
      <div className={cn('mt-3 text-ink3', vizText.sm)}>
        valid strings found ({s.results.length})
        <div className="mt-1 flex flex-wrap gap-1.5">
          {s.results.map((r, i) => (
            <span key={i} className={cn('chip font-mono text-ink', vizText.sm)}>
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ParenState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const catalan = (m: number) => {
    let r = 1;
    for (let i = 0; i < m; i++) r = (r * 2 * (2 * i + 1)) / (i + 2);
    return Math.round(r);
  };
  return (
    <VarGrid>
      <InspectorRow k="n (pairs)" v={s.n} />
      <InspectorRow k="path" v={`"${s.path}"`} />
      <InspectorRow k="open / close" v={`${s.open} / ${s.close}`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target C(n)" v={catalan(s.n)} />
    </VarGrid>
  );
}

export const manifestId = 'imp-34-generate-parentheses';
export const title = 'Generate Parentheses';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'n3', label: 'n = 3', value: { n: 3 } },
    { id: 'n2', label: 'n = 2', value: { n: 2 } },
  ] satisfies SampleInput<ParenInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ParenState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} strings` };
  },
};

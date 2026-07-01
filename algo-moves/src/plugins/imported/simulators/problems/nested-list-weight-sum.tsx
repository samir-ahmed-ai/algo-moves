import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

// A nested integer is either a plain number or a (possibly nested) list.
type Nested = number | Nested[];

interface NestedInput {
  list: Nested[];
}

// One renderable line of the indented tree view.
interface TreeLine {
  id: number;
  depth: number; // 1-based depth, matching the algorithm's convention
  kind: 'int' | 'open' | 'close';
  value?: number; // only for 'int'
}

interface NestedState {
  lines: TreeLine[];
  activeId: number | null; // line currently being processed
  sum: number;
  contribution: number | null; // value*depth added by the active integer
  done: boolean;
}

// Flatten the nested structure into indented lines so the View can render a
// stable, scannable tree. depth starts at 1 (depthSum -> btDepthSum(list, 1)).
function flatten(list: Nested[], depth: number, lines: TreeLine[], next: { id: number }): void {
  for (const item of list) {
    if (typeof item === 'number') {
      lines.push({ id: next.id++, depth, kind: 'int', value: item });
    } else {
      lines.push({ id: next.id++, depth, kind: 'open' });
      flatten(item, depth + 1, lines, next);
      lines.push({ id: next.id++, depth, kind: 'close' });
    }
  }
}

function record({ list }: NestedInput): Frame<NestedState>[] {
  const frames: Frame<NestedState>[] = [];
  const lines: TreeLine[] = [];
  flatten(list, 1, lines, { id: 0 });

  let sum = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    activeId: number | null,
    contribution: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { lines, activeId, sum, contribution, done: type === 'DONE' },
    });

  const intCount = lines.filter((l) => l.kind === 'int').length;
  emit(
    'INIT',
    `${intCount} integers`,
    `Depth-first walk of the nested list. Each integer contributes value × depth (the outermost list is depth 1); descending into a sublist increases depth by 1. Sum the contributions of all ${intCount} integers.`,
    null,
    null,
  );

  // Walk the flattened lines in order; only integers add to the sum.
  for (const line of lines) {
    if (line.kind === 'open') {
      emit('DESCEND', `→ depth ${line.depth + 1}`, `Enter a sublist — its elements live at depth ${line.depth + 1}.`, line.id, null);
    } else if (line.kind === 'close') {
      emit('ASCEND', `← depth ${line.depth}`, `Leave the sublist and return to depth ${line.depth}.`, line.id, null);
    } else {
      const contribution = (line.value ?? 0) * line.depth;
      sum += contribution;
      emit(
        'ADD',
        `+${line.value}×${line.depth}`,
        `Integer ${line.value} sits at depth ${line.depth}, so it contributes ${line.value} × ${line.depth} = ${contribution}. Running weighted sum is now ${sum}.`,
        line.id,
        contribution,
      );
    }
  }

  emit('DONE', `sum = ${sum}`, `Every integer visited — the weighted depth sum is ${sum}.`, null, null, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<NestedState>) {
  const s = frame.state;
  return (
    <div className="board-area board-area--text">
      <div className={cn(vizText.sm, 'text-ink3')}>
        weighted sum (Σ value × depth) · <span className="font-mono text-ink">{s.sum}</span>
      </div>
      <div className={cn('flex flex-col gap-0.5 font-mono', vizText.base)}>
        {s.lines.map((line) => {
          const active = s.activeId === line.id;
          const pad = (line.depth - 1) * 18;
          const text =
            line.kind === 'open' ? '[' : line.kind === 'close' ? ']' : String(line.value);
          return (
            <div
              key={line.id}
              className="flex items-center rounded px-1 py-[1px]"
              style={{
                marginLeft: pad,
                background: active ? 'var(--accent-bg)' : 'transparent',
                outline: active ? '1px solid var(--accent)' : 'none',
                color: line.kind === 'int' ? 'var(--text)' : 'var(--text-3)',
              }}
            >
              <span className={cn('w-14 shrink-0 text-ink3', vizText.xs)}>depth {line.depth}</span>
              <span>{text}</span>
              {active && line.kind === 'int' && s.contribution !== null && (
                <span className={cn('ml-2 text-accent', vizText.xs)}>
                  +{line.value} × {line.depth} = {s.contribution}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<NestedState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const active = s.activeId !== null ? s.lines.find((l) => l.id === s.activeId) : undefined;
  return (
    <VarGrid>
      <InspectorRow k="current depth" v={active ? active.depth : '—'} />
      <InspectorRow k="current value" v={active && active.kind === 'int' ? (active.value ?? '—') : '—'} />
      <InspectorRow k="last contribution" v={s.contribution ?? '—'} />
      <InspectorRow k="weighted sum" v={s.sum} />
    </VarGrid>
  );
}

export const manifestId = 'imp-38-nested-list-weight-sum';
export const title = 'Nested List Weight Sum';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'classic', label: '[[1,1],2,[1,1]]', value: { list: [[1, 1], 2, [1, 1]] } },
    { id: 'deep', label: '[1,[4,[6]]]', value: { list: [1, [4, [6]]] } },
  ] satisfies SampleInput<NestedInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as NestedState | undefined;
    return { ok: true, label: `sum = ${s ? s.sum : 0}` };
  },
};

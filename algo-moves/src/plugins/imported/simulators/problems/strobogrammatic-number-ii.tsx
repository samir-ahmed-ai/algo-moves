import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { CharCell, InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface StroboInput {
  n: number;
}

interface StroboState {
  n: number;
  path: string[]; // current buffer, '·' for unfilled slots
  low: number; // active left pointer
  high: number; // active right pointer
  results: string[];
  done: boolean;
}

const PAIRS: [string, string][] = [
  ['0', '0'],
  ['1', '1'],
  ['8', '8'],
  ['6', '9'],
  ['9', '6'],
];

function record({ n }: StroboInput): Frame<StroboState>[] {
  const frames: Frame<StroboState>[] = [];
  const path: string[] = Array.from({ length: n }, () => '·');
  const results: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    low: number,
    high: number,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { n, path: path.slice(), low, high, results: results.slice(), done: type === 'DONE' },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Build length-${n} strobogrammatic numbers (same upside-down: 0↔0, 1↔1, 6↔9, 8↔8, 9↔6) by filling outer pairs inward. No leading zero when n>1; the middle slot (odd n) takes 0, 1, or 8.`,
    0,
    n - 1,
  );

  const backtrack = (low: number, high: number) => {
    if (low > high) {
      const s = path.join('');
      results.push(s);
      emit('RECORD', `+${s}`, `Pointers crossed — the number "${s}" is complete and strobogrammatic (${results.length} so far).`, low, high, 'good');
      return;
    }
    if (low === high) {
      for (const c of ['0', '1', '8']) {
        path[low] = c;
        const s = path.join('');
        results.push(s);
        emit('RECORD', `mid ${c} → ${s}`, `Single middle slot at index ${low}: it must map to itself, so try ${c} → record "${s}" (${results.length} so far).`, low, high, 'good');
      }
      path[low] = '·';
      return;
    }
    for (const [a, b] of PAIRS) {
      if (low === 0 && a === '0') {
        emit('REJECT', `✗ ${a}/${b}`, `Outer pair ${a}/${b} would put a leading zero at index 0 — skip it.`, low, high);
        continue;
      }
      path[low] = a;
      path[high] = b;
      emit('CHOOSE', `${a}…${b}`, `Place ${a} at index ${low} and ${b} at index ${high} (a strobogrammatic pair). Recurse inward.`, low + 1, high - 1);
      backtrack(low + 1, high - 1);
      path[low] = '·';
      path[high] = '·';
      emit('BACKTRACK', `undo ${a}/${b}`, `Backtrack: clear the ${a}/${b} pair at indices ${low}/${high} and try the next pair.`, low, high);
    }
  };

  if (n > 0) backtrack(0, n - 1);
  emit('DONE', `${results.length} number${results.length === 1 ? '' : 's'}`, `All pair choices explored — ${results.length} strobogrammatic number${results.length === 1 ? '' : 's'} of length ${n}.`, 0, n - 1, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<StroboState>) {
  const s = frame.state;
  return (
    <div className="board-area board-area--text">
      <div className={cn(vizText.sm, 'text-ink3')}>length n = {s.n}</div>
      <div className="mt-2 flex gap-1">
        {s.path.map((c, i) => {
          const active = i === s.low || i === s.high;
          return (
            <CharCell key={i} active={active} className={cn(c === '·' ? 'text-ink3' : '')}>
              {c}
            </CharCell>
          );
        })}
      </div>
      <div className={cn('mt-3 text-ink3', vizText.sm)}>
        strobogrammatic numbers ({s.results.length})
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {s.results.map((r, i) => (
            <span key={i} className={cn('font-mono text-ink', vizText.base)}>
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<StroboState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="buffer" v={s.path.join('')} />
      <InspectorRow k="low / high" v={`${s.low} / ${s.high}`} />
      <InspectorRow k="found" v={s.results.length} />
    </VarGrid>
  );
}

export const manifestId = 'imp-33-strobogrammatic-number-ii';
export const title = 'Strobogrammatic Number II';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'n2', label: 'n = 2', value: { n: 2 } },
    { id: 'n3', label: 'n = 3', value: { n: 3 } },
  ] satisfies SampleInput<StroboInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as StroboState | undefined;
    const n = s ? s.results.length : 0;
    return { ok: true, label: `${n} number${n === 1 ? '' : 's'}` };
  },
};

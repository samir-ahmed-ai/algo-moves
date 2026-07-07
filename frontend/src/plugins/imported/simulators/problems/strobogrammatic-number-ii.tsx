import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  vizText,
  CharCell,
  VizStage,
  RailStack,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';

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
  const path: string[] = Array.from({ length: n }, () => '·');
  const results: string[] = [];

  const { emit, frames } = createRecorder<StroboState>(() => ({
    n: n,
    path: path.slice(),
    results: results.slice(),
    low: 0,
    high: 0,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Build length-${n} strobogrammatic numbers (same upside-down: 0↔0, 1↔1, 6↔9, 8↔8, 9↔6) by filling outer pairs inward. No leading zero when n>1; the middle slot (odd n) takes 0, 1, or 8.`,
    { low: 0, high: n - 1 },
  );

  const backtrack = (low: number, high: number) => {
    if (low > high) {
      const s = path.join('');
      results.push(s);
      emit(
        'RECORD',
        `+${s}`,
        `Pointers crossed — the number "${s}" is complete and strobogrammatic (${results.length} so far).`,
        { low: low, high: high },
        'good',
      );
      return;
    }
    if (low === high) {
      for (const c of ['0', '1', '8']) {
        path[low] = c;
        const s = path.join('');
        results.push(s);
        emit(
          'RECORD',
          `mid ${c} → ${s}`,
          `Single middle slot at index ${low}: it must map to itself, so try ${c} → record "${s}" (${results.length} so far).`,
          { low: low, high: high },
          'good',
        );
      }
      path[low] = '·';
      return;
    }
    for (const [a, b] of PAIRS) {
      if (low === 0 && a === '0') {
        emit(
          'REJECT',
          `✗ ${a}/${b}`,
          `Outer pair ${a}/${b} would put a leading zero at index 0 — skip it.`,
          { low: low, high: high },
        );
        continue;
      }
      path[low] = a;
      path[high] = b;
      emit(
        'CHOOSE',
        `${a}…${b}`,
        `Place ${a} at index ${low} and ${b} at index ${high} (a strobogrammatic pair). Recurse inward.`,
        { low: low + 1, high: high - 1 },
      );
      backtrack(low + 1, high - 1);
      path[low] = '·';
      path[high] = '·';
      emit(
        'BACKTRACK',
        `undo ${a}/${b}`,
        `Backtrack: clear the ${a}/${b} pair at indices ${low}/${high} and try the next pair.`,
        { low: low, high: high },
      );
    }
  };

  if (n > 0) backtrack(0, n - 1);
  emit(
    'DONE',
    `${results.length} number${results.length === 1 ? '' : 's'}`,
    `All pair choices explored — ${results.length} strobogrammatic number${results.length === 1 ? '' : 's'} of length ${n}.`,
    { low: 0, high: n - 1, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<StroboState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="low" v={s.low} />
        <RailStat k="high" v={s.high} />
      </RailGroup>
      <RailStack label="found" items={s.results} highlightEnd="bottom" />
      <RailResult label="count" value={s.results.length} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={96}>
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
    </VizStage>
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

export const simulator: ProblemSimulator = {
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

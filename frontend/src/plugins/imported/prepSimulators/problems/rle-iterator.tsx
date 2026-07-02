import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RleInput {
  encoding: number[];
  calls: number[];
}

interface RleState {
  enc: number[];
  idx: number;
  op: string;
  n: number;
  result: number | null;
  done: boolean;
}

function record({ encoding, calls }: RleInput): Frame<RleState>[] {  const enc = [...encoding];
  let idx = 0;

  const { emit, frames } = createRecorder<RleState>(() => ({
        enc: enc.slice(),
        idx,
        op: '',
        n: 0,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `${encoding.length / 2} pairs`,
    `RLE Iterator: encoding is [count,val,count,val,...]. Next(n) consumes counts; returns val when enough remain, else -1.`,
    {},
  );

  for (const n of calls) {
    let remaining = n;
    let result = -1;
    while (idx < enc.length) {
      if (enc[idx] >= remaining) {
        enc[idx] -= remaining;
        result = enc[idx + 1];
        emit(
          'NEXT',
          `n=${n} → ${result}`,
          `Next(${n}): consume ${remaining} from pair [${enc[idx] + remaining},${enc[idx + 1]}] → return ${result}.`,
          { op: `next(${n})`, n, result, enc: enc.slice(), idx },
          'good',
        );
        remaining = 0;
        break;
      }
      remaining -= enc[idx];
      idx += 2;
    }
    if (remaining > 0) {
      emit(
        'EOF',
        '-1',
        `Next(${n}): exhausted encoding → return -1.`,
        { op: `next(${n})`, n, result: -1, enc: enc.slice(), idx },
        'bad',
      );
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<RleState>) {
  const s = frame.state;
  const pairs: { count: number; val: number; i: number }[] = [];
  for (let i = 0; i < s.enc.length; i += 2) {
    pairs.push({ count: s.enc[i], val: s.enc[i + 1], i });
  }
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.result !== null && <span className="ml-2 font-mono text-good">→ {s.result}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {pairs.map(({ count, val, i }) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.idx ? 'border-accent bg-accentbg' : i < s.idx ? 'border-edge text-ink3 line-through' : 'border-edge',
            )}
          >
            {count}×{val}
          </span>
        ))}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>idx = {s.idx}</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RleState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n || '—'} />
      <InspectorRow k="result" v={s.result ?? '—'} />
      <InspectorRow k="idx" v={s.idx} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-rle-iterator';
export const title = 'RLE Iterator';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'rle1',
      label: '[3,0,2,2,1,1] · next 4,2',
      value: { encoding: [3, 0, 2, 2, 1, 1], calls: [4, 2] },
    },
  ] satisfies SampleInput<RleInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RleState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};

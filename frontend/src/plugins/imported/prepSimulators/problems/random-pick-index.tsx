import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PickIdxInput {
  nums: number[];
  target: number;
  /** Deterministic picks: each value is the random draw (0..cnt-1) for that target occurrence. */
  draws?: number[];
}

interface PickIdxState {
  nums: number[];
  target: number;
  i: number;
  cnt: number;
  res: number;
  op: string;
  picked: number | null;
  done: boolean;
}

function record({ nums, target, draws = [] }: PickIdxInput): Frame<PickIdxState>[] {  let cnt = 0;
  let res = 0;
  let drawIdx = 0;

  const { emit, frames } = createRecorder<PickIdxState>(() => ({
        nums: [...nums],
        target,
        i: 0,
        cnt,
        res,
        op: '',
        picked: null,
        done: false
      }));

  emit(
    'INIT',
    `target=${target}`,
    `Random Pick Index: reservoir sampling — for each nums[i]==target, cnt++; with prob 1/cnt replace res with i.`,
    {},
  );

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== target) continue;
    cnt++;
    const draw = draws[drawIdx] ?? 0;
    drawIdx++;
    const replace = draw === 0;
    if (replace) res = i;
    emit(
      'HIT',
      `i=${i} cnt=${cnt}`,
      `nums[${i}]=${target}: cnt→${cnt}. ${replace ? `draw=0 → res=${i}.` : `draw=${draw}≠0 → keep res=${res}.`}`,
      { i, cnt, res, op: `@${i} cnt=${cnt}`, picked: replace ? i : null },
      replace ? 'good' : undefined,
    );
  }

  emit(
    'DONE',
    `index ${res}`,
    `Pick(${target}) → index ${res} (uniform over ${cnt} occurrence(s)).`,
    { op: 'done', res, picked: res, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PickIdxState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        target = <span className="font-mono text-ink">{s.target}</span>
        {s.picked !== null && <span className="ml-2 font-mono text-good">picked @{s.picked}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {s.nums.map((v, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              v === s.target ? (i === s.res ? 'border-accent bg-accentbg text-accent' : 'border-good text-good') : 'border-edge text-ink2',
            )}
          >
            {v}
          </span>
        ))}
      </div>
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink')}>
        cnt={s.cnt} · res={s.res}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PickIdxState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="cnt" v={s.cnt} />
      <InspectorRow k="res" v={s.res} />
      <InspectorRow k="i" v={s.i || '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-random-pick-index';
export const title = 'Random Pick Index';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'rpi1',
      label: '[1,2,3,3,3] target 3',
      value: { nums: [1, 2, 3, 3, 3], target: 3, draws: [0, 0, 1] },
    },
  ] satisfies SampleInput<PickIdxInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PickIdxState | undefined;
    return s?.done ? { ok: true, label: `index ${s.res}` } : { ok: false, label: 'incomplete' };
  },
};

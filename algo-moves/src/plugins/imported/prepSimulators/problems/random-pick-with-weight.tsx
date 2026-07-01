import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PickWInput {
  weights: number[];
  /** Deterministic targets in [1, sum] for each PickIndex call. */
  targets: number[];
}

interface PickWState {
  weights: number[];
  prefix: number[];
  target: number;
  picked: number;
  op: string;
  done: boolean;
}

function record({ weights, targets }: PickWInput): Frame<PickWState>[] {
  const frames: Frame<PickWState>[] = [];
  const prefix: number[] = [];
  for (let i = 0; i < weights.length; i++) {
    prefix.push(i === 0 ? weights[0] : prefix[i - 1] + weights[i]);
  }
  const total = prefix[prefix.length - 1];

  const emit = (type: string, note: string, caption: string, s: Partial<PickWState>, tone?: 'good' | 'bad') =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        weights: [...weights],
        prefix: prefix.slice(),
        target: 0,
        picked: -1,
        op: '',
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `sum=${total}`,
    `Random Pick with Weight: prefix sums define buckets. PickIndex draws target in [1,sum], binary search prefix for index.`,
    { prefix: prefix.slice() },
  );

  for (let t = 0; t < targets.length; t++) {
    const target = targets[t];
    let lo = 0;
    let hi = prefix.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (prefix[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const picked = lo;
    emit(
      'PICK',
      `target=${target} → ${picked}`,
      `PickIndex(): target=${target} in [1,${total}]. Binary search prefix → index ${picked} (weight ${weights[picked]}).`,
      { target, picked, op: `pick → ${picked}` },
      'good',
    );
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<PickWState>) {
  const s = frame.state;
  const total = s.prefix[s.prefix.length - 1] ?? 0;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.picked >= 0 && <span className="ml-2 font-mono text-good">index {s.picked}</span>}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>weights & prefix (sum={total})</div>
      <div className="mt-1 space-y-1">
        {s.weights.map((w, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-2 rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.picked ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            <span>i={i}</span>
            <span>w={w}</span>
            <span>prefix={s.prefix[i]}</span>
          </div>
        ))}
      </div>
      {s.target > 0 && (
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink')}>target draw = {s.target}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PickWState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target || '—'} />
      <InspectorRow k="picked" v={s.picked >= 0 ? s.picked : '—'} />
      <InspectorRow k="prefix" v={`[${s.prefix.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-random-pick-with-weight';
export const title = 'Random Pick with Weight';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'rpw1',
      label: 'weights [1,3] · targets 1,4',
      value: { weights: [1, 3], targets: [1, 4] },
    },
  ] satisfies SampleInput<PickWInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PickWState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};

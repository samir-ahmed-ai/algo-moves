import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type Interval = [number, number];

interface InsertInput {
  ins: Interval[];
  x: Interval;
}

type Phase = 'init' | 'before' | 'merge' | 'place' | 'after' | 'done';

interface InsertState {
  ins: Interval[];
  x: Interval; // the new interval as it grows by absorbing overlaps
  res: Interval[]; // result built so far
  i: number | null; // index in `ins` currently under consideration
  phase: Phase;
  placedAt: number | null; // index in res where x landed
  done: boolean;
}

const fmt = (iv: Interval) => `[${iv[0]},${iv[1]}]`;

function record({ ins, x }: InsertInput): Frame<InsertState>[] {
  const frames: Frame<InsertState>[] = [];
  const res: Interval[] = [];
  // local mutable copy of x so we never mutate the input tuple
  let xs = x[0];
  let xe = x[1];

  const emit = (
    type: string,
    note: string,
    caption: string,
    i: number | null,
    phase: Phase,
    placedAt: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        ins,
        x: [xs, xe],
        res: res.map((r) => [r[0], r[1]] as Interval),
        i,
        phase,
        placedAt,
        done: phase === 'done',
      },
    });

  emit(
    'INIT',
    `insert ${fmt([xs, xe])}`,
    `Insert Interval: the existing intervals ${ins.map(fmt).join(' ')} are sorted and non-overlapping. We splice in ${fmt([xs, xe])} using three segments — copy everything strictly before it, absorb every overlap into x, then copy everything after.`,
    null,
    'init',
    null,
  );

  let i = 0;

  // Segment 1 — copy intervals that end before x starts (no overlap, left side).
  while (i < ins.length && ins[i][1] < xs) {
    res.push([ins[i][0], ins[i][1]]);
    emit(
      'BEFORE',
      `copy ${fmt(ins[i])}`,
      `ins[${i}] = ${fmt(ins[i])} ends at ${ins[i][1]}, which is below x.start = ${xs}, so it sits entirely to the left. Copy it straight into the result.`,
      i,
      'before',
      null,
    );
    i++;
  }

  // Segment 2 — absorb every interval that overlaps x, extending x's bounds.
  while (i < ins.length && ins[i][0] <= xe) {
    const before: Interval = [xs, xe];
    if (ins[i][0] < xs) xs = ins[i][0];
    if (ins[i][1] > xe) xe = ins[i][1];
    emit(
      'MERGE',
      `absorb ${fmt(ins[i])}`,
      `ins[${i}] = ${fmt(ins[i])} starts at ${ins[i][0]} ≤ x.end = ${before[1]}, so it overlaps x. Absorb it: x grows from ${fmt(before)} to ${fmt([xs, xe])} by taking the min start and max end.`,
      i,
      'merge',
      null,
    );
    i++;
  }

  // Place the merged x.
  res.push([xs, xe]);
  const placed = res.length - 1;
  emit(
    'PLACE',
    `place ${fmt([xs, xe])}`,
    `No more overlaps. The fully merged interval ${fmt([xs, xe])} now goes into the result at position ${placed}.`,
    null,
    'place',
    placed,
    'good',
  );

  // Segment 3 — copy the remaining intervals (all to the right of x).
  while (i < ins.length) {
    res.push([ins[i][0], ins[i][1]]);
    emit(
      'AFTER',
      `copy ${fmt(ins[i])}`,
      `ins[${i}] = ${fmt(ins[i])} starts after x.end = ${xe}, so it belongs to the right segment. Copy it across unchanged.`,
      i,
      'after',
      placed,
    );
    i++;
  }

  emit(
    'DONE',
    `${res.length} intervals`,
    `Done. The result ${res.map(fmt).join(' ')} stays sorted and non-overlapping. Time O(n), space O(n) for the output list.`,
    null,
    'done',
    placed,
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<InsertState>) {
  const s = frame.state;

  // Row 1: the input intervals as string cells, with a pointer on the current one.
  const inputCells = s.ins.map(fmt);
  const inputPointers: ArrayPointer[] = [];
  if (s.i !== null) {
    const lab = s.phase === 'before' ? 'copy' : s.phase === 'merge' ? 'absorb' : 'i';
    inputPointers.push({ i: s.i, label: lab, tone: s.phase === 'merge' ? 'warn' : 'accent', place: 'above' });
  }
  const inputTone = (idx: number) =>
    s.i === idx ? (s.phase === 'merge' ? 'match' : s.phase === 'after' ? 'match' : 'lo') : '';

  // Row 2: the result built so far, with x's slot highlighted green.
  const resCells = s.res.map(fmt);
  const resTone = (idx: number) => (s.placedAt !== null && idx === s.placedAt ? 'found' : 'match');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        inserting{' '}
        <span className="font-mono text-ink">{fmt(s.x)}</span>
        {' · '}phase <span className="font-mono text-ink">{s.phase}</span>
      </div>

      <div className={cn('mt-1', vizText.xs, 'text-ink3')}>input intervals</div>
      {inputCells.length > 0 ? (
        <ArrayRow values={inputCells} cellTone={inputTone} pointers={inputPointers} windowRange={null} />
      ) : (
        <div className={cn('font-mono', vizText.sm, 'text-ink3')}>(none)</div>
      )}

      <div className={cn('mt-2', vizText.xs, 'text-ink3')}>result</div>
      {resCells.length > 0 ? (
        <ArrayRow values={resCells} cellTone={resTone} pointers={[]} windowRange={null} />
      ) : (
        <div className={cn('font-mono', vizText.sm, 'text-ink3')}>(empty)</div>
      )}

      {s.done && (
        <div className={cn('mt-2 font-mono text-good', vizText.base)}>
          → {s.res.map(fmt).join(' ')}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<InsertState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="x (merged)" v={fmt(s.x)} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="ins[i]" v={s.i !== null ? fmt(s.ins[s.i]) : '—'} />
      <InspectorRow k="result size" v={s.res.length} />
      <InspectorRow k="x placed at" v={s.placedAt ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-insert-interval';
export const title = 'Insert interval';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'ii1',
      label: '[[1,3],[6,9]] + [2,5]',
      value: { ins: [[1, 3], [6, 9]], x: [2, 5] } as InsertInput,
    },
    {
      id: 'ii2',
      label: '[[1,2],[3,5],[6,7],[8,10],[12,16]] + [4,8]',
      value: {
        ins: [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]],
        x: [4, 8],
      } as InsertInput,
    },
  ] satisfies SampleInput<InsertInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as InsertState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: true, label: s.res.map(fmt).join(' ') };
  },
};

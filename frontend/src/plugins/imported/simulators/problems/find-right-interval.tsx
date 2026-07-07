import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface FriInput {
  intervals: [number, number][];
}

interface FriState {
  intervals: [number, number][];
  starts: number[]; // sorted ascending
  origIdx: number[]; // original index of each sorted start
  cur: number; // interval being processed
  key: number; // current interval's end
  lo: number;
  hi: number;
  mid: number | null;
  res: number; // best sorted position found so far (smallest start >= key)
  answers: (number | null)[];
  done: boolean;
}

function record({ intervals }: FriInput): Frame<FriState>[] {
  const n = intervals.length;

  // sort starts ascending, remembering each start's original interval index
  const order = intervals.map((iv, i) => ({ start: iv[0], i })).sort((a, b) => a.start - b.start);
  const starts = order.map((o) => o.start);
  const origIdx = order.map((o) => o.i);
  const answers: (number | null)[] = new Array<number | null>(n).fill(null);

  let cur = -1;
  let key = 0;
  let lo = 0;
  let hi = 0;
  let mid: number | null = null;
  let res = -1;

  const { emit, frames } = createRecorder<FriState>(() => ({
    intervals: intervals,
    starts: starts,
    origIdx: origIdx,
    cur: cur,
    key: key,
    lo: lo,
    hi: hi,
    mid: mid,
    res: res,
    answers: answers.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `${n} intervals`,
    `For each interval, find the interval whose start is the smallest value ≥ this interval's end. Sort the starts ascending (shown below, each labelled with its original index) and binary-search them: the answer is the index of the first start that is still ≥ the end.`,
    {},
  );

  for (let p = 0; p < n; p++) {
    cur = p;
    key = intervals[p][1];
    lo = 0;
    hi = n - 1;
    mid = null;
    res = -1;
    emit(
      'INTERVAL',
      `interval ${p} → end ${key}`,
      `Interval ${p} = [${intervals[p][0]}, ${intervals[p][1]}]. Binary-search the sorted starts for the smallest start ≥ ${key} (its end).`,
      {},
    );

    while (lo <= hi) {
      mid = (lo + hi) >> 1;
      emit('MID', `mid=${mid}`, `Look at the middle start: starts[${mid}] = ${starts[mid]}.`, {});
      if (starts[mid] >= key) {
        res = mid;
        hi = mid - 1;
        emit(
          'LEFT',
          `res=${mid}`,
          `${starts[mid]} ≥ ${key}, so this start qualifies — remember it (res = ${mid}) and keep searching left for an even smaller qualifying start. Set hi = ${hi}.`,
          {},
        );
      } else {
        lo = mid + 1;
        emit(
          'RIGHT',
          `lo=${lo}`,
          `${starts[mid]} < ${key}, too small — the answer must be further right. Set lo = ${lo}.`,
          {},
        );
      }
    }

    mid = null;
    if (res === -1) {
      answers[p] = -1;
      emit(
        'NONE',
        `interval ${p} → -1`,
        `No start is ≥ ${key}, so interval ${p} has no right interval. Answer = -1.`,
        {},
      );
    } else {
      answers[p] = origIdx[res];
      emit(
        'PICK',
        `interval ${p} → ${origIdx[res]}`,
        `The smallest qualifying start is starts[${res}] = ${starts[res]}, which belongs to original interval ${origIdx[res]}. Answer for interval ${p} = ${origIdx[res]}.`,
        {},
      );
    }
  }

  cur = -1;
  mid = null;
  emit(
    'DONE',
    'finished',
    `Every interval resolved. Right-interval indices = [${answers.map((a) => a ?? -1).join(', ')}].`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FriState>) {
  const s = frame.state;
  const live = s.lo <= s.hi && s.cur >= 0 && !s.done;
  const pointers: ArrayPointer[] = [];
  if (s.mid !== null) pointers.push({ i: s.mid, label: 'mid', tone: 'warn', place: 'above' });
  if (live) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.res === i && (s.lo > s.hi || s.done)) return 'found';
    if (s.mid === i) return 'mid';
    return '';
  };
  const header =
    s.cur >= 0
      ? `interval ${s.cur} = [${s.intervals[s.cur][0]}, ${s.intervals[s.cur][1]}] · need start ≥ ${s.key}`
      : 'sorted starts (labelled by original interval index)';

  const answeredItems = s.answers
    .map((a, i) => (a !== null ? `[${i}]→${a}` : null))
    .filter((x): x is string => x !== null);

  const rail = (
    <>
      <RailGroup label="binary search">
        <RailStat
          k="interval"
          v={s.cur >= 0 ? `[${s.intervals[s.cur][0]},${s.intervals[s.cur][1]}]` : '—'}
        />
        <RailStat k="end" v={s.cur >= 0 ? s.key : '—'} tone="accent" />
        <RailStat k="lo" v={s.lo} />
        <RailStat k="hi" v={s.hi} />
        <RailStat k="mid" v={s.mid ?? '—'} tone="warn" />
      </RailGroup>
      <RailStack label="answers" items={answeredItems} />
      {s.done && (
        <RailResult
          label="result"
          value={`[${s.answers.map((a) => a ?? -1).join(', ')}]`}
          tone="good"
        />
      )}
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      <div className="text-ink3 text-sm mb-1">{header}</div>
      <ArrayRow
        values={s.starts}
        cellTone={tone}
        pointers={pointers}
        label={(i) => `→${s.origIdx[i]}`}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<FriState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow
        k="interval"
        v={s.cur >= 0 ? `[${s.intervals[s.cur][0]}, ${s.intervals[s.cur][1]}]` : '—'}
      />
      <InspectorRow k="end (key)" v={s.cur >= 0 ? s.key : '—'} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow k="result" v={s.answers.map((a) => (a === null ? '·' : a)).join(', ')} />
    </VarGrid>
  );
}

export const manifestId = 'imp-50-find-right-interval';
export const title = 'Find Right Interval';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'fri1',
      label: '[[3,4],[2,3],[1,2]] → [-1,0,1]',
      value: {
        intervals: [
          [3, 4],
          [2, 3],
          [1, 2],
        ],
      },
    },
    {
      id: 'fri2',
      label: '[[1,4],[2,3],[3,4]] → [-1,2,-1]',
      value: {
        intervals: [
          [1, 4],
          [2, 3],
          [3, 4],
        ],
      },
    },
  ] satisfies SampleInput<FriInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FriState | undefined;
    const ans = s ? s.answers.map((a) => a ?? -1) : [];
    return { ok: true, label: `[${ans.join(', ')}]` };
  },
};

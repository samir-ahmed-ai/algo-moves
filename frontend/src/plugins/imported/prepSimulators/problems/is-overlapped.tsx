import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface Point {
  x: number;
  y: number;
}

// Two axis-aligned rectangles, each given by a bottom-left (p1/q1) and a
// top-right (p2/q2) corner.
interface OverlapInput {
  p1: Point;
  p2: Point;
  q1: Point;
  q2: Point;
}

type Axis = 'x' | 'y';

interface OverlapState {
  // Span of each rectangle on each axis: [left, right].
  rxA: [number, number];
  rxB: [number, number];
  ryA: [number, number];
  ryB: [number, number];
  axis: Axis | null; // axis currently under inspection
  maxLeft: number | null; // max(lefts) on the active axis
  minRight: number | null; // min(rights) on the active axis
  xPass: boolean | null; // does the X projection intersect?
  yPass: boolean | null; // does the Y projection intersect?
  result: boolean | null; // final overlap verdict
  done: boolean;
}

// Inclusive timeline bounds for the ArrayRow track so both rectangles fit.
const TRACK_LO = 0;
const TRACK_HI = 10;

function record({ p1, p2, q1, q2 }: OverlapInput): Frame<OverlapState>[] {
  const rxA: [number, number] = [p1.x, p2.x];
  const rxB: [number, number] = [q1.x, q2.x];
  const ryA: [number, number] = [p1.y, p2.y];
  const ryB: [number, number] = [q1.y, q2.y];

  const base: OverlapState = {
    rxA,
    rxB,
    ryA,
    ryB,
    axis: null,
    maxLeft: null,
    minRight: null,
    xPass: null,
    yPass: null,
    result: null,
    done: false,
  };

  const { emit, frames } = createPrepRecorder<OverlapState>(() => ({
    ...base,
  }));

  emit(
    'INIT',
    'two rectangles',
    `Is Overlapped: two axis-aligned rectangles overlap (with positive area) only if their X projections intersect AND their Y projections intersect. Rectangle A spans X[${p1.x},${p2.x}]! Y[${p1.y},${p2.y}]!; rectangle B spans X[${q1.x},${q2.x}]! Y[${q1.y},${q2.y}]!. We test each axis separately.`,
    {},
  );

  // --- X axis ---
  const maxLeftX = Math.max(p1.x, q1.x);
  const minRightX = Math.min(p2.x, q2.x);
  emit(
    'AXIS_X',
    'project on X',
    `Project both rectangles onto the X axis. A covers [${p1.x},${p2.x}], B covers [${q1.x},${q2.x}]. The overlap test is min(rights) > max(lefts).`,
    { axis: 'x' },
  );
  emit(
    'EDGES_X',
    `max(${p1.x},${q1.x})=${maxLeftX}`,
    `Take the rightmost left edge: max(${p1.x}, ${q1.x}) = ${maxLeftX}. This is where any shared X range must start.`,
    { axis: 'x', maxLeft: maxLeftX },
  );
  emit(
    'EDGES_X',
    `min(${p2.x},${q2.x})=${minRightX}`,
    `Take the leftmost right edge: min(${p2.x}, ${q2.x}) = ${minRightX}. This is where any shared X range must end.`,
    { axis: 'x', maxLeft: maxLeftX, minRight: minRightX },
  );
  const xPass = minRightX > maxLeftX;
  emit(
    xPass ? 'X_OK' : 'X_FAIL',
    xPass ? `${minRightX} > ${maxLeftX}` : `${minRightX} ≤ ${maxLeftX}`,
    xPass
      ? `min(rights)=${minRightX} > max(lefts)=${maxLeftX}, so the X projections overlap on (${maxLeftX}, ${minRightX}). The X test passes — keep going to Y.`
      : `min(rights)=${minRightX} is not greater than max(lefts)=${maxLeftX}, so the X projections do NOT overlap. With no shared X range the rectangles cannot overlap — answer is false.`,
    { axis: 'x', maxLeft: maxLeftX, minRight: minRightX, xPass },
  );

  if (!xPass) {
    emit(
      'DONE',
      'no overlap',
      `Because the X projections are disjoint, the rectangles are separated horizontally. isOverlapped = false.`,
      {
        axis: 'x',
        maxLeft: maxLeftX,
        minRight: minRightX,
        xPass: false,
        result: false,
        done: true,
      },
      'bad',
    );
    return frames;
  }

  // --- Y axis ---
  const maxLeftY = Math.max(p1.y, q1.y);
  const minRightY = Math.min(p2.y, q2.y);
  emit(
    'AXIS_Y',
    'project on Y',
    `X passed. Now project onto the Y axis. A covers [${p1.y},${p2.y}], B covers [${q1.y},${q2.y}]. Apply the same min(rights) > max(lefts) test.`,
    { axis: 'y', xPass: true },
  );
  emit(
    'EDGES_Y',
    `max(${p1.y},${q1.y})=${maxLeftY}`,
    `Rightmost bottom edge: max(${p1.y}, ${q1.y}) = ${maxLeftY}. Any shared Y range must start here.`,
    { axis: 'y', xPass: true, maxLeft: maxLeftY },
  );
  emit(
    'EDGES_Y',
    `min(${p2.y},${q2.y})=${minRightY}`,
    `Lowest top edge: min(${p2.y}, ${q2.y}) = ${minRightY}. Any shared Y range must end here.`,
    { axis: 'y', xPass: true, maxLeft: maxLeftY, minRight: minRightY },
  );
  const yPass = minRightY > maxLeftY;
  emit(
    yPass ? 'Y_OK' : 'Y_FAIL',
    yPass ? `${minRightY} > ${maxLeftY}` : `${minRightY} ≤ ${maxLeftY}`,
    yPass
      ? `min(rights)=${minRightY} > max(lefts)=${maxLeftY}, so the Y projections overlap on (${maxLeftY}, ${minRightY}). The Y test passes too.`
      : `min(rights)=${minRightY} is not greater than max(lefts)=${maxLeftY}, so the Y projections are disjoint. The rectangles are separated vertically — answer is false.`,
    { axis: 'y', xPass: true, maxLeft: maxLeftY, minRight: minRightY, yPass },
  );

  const result = xPass && yPass;
  emit(
    'DONE',
    result ? 'overlap' : 'no overlap',
    result
      ? `Both axes intersect, so the rectangles share a region of positive area. isOverlapped = true. (Time O(1), Space O(1).)`
      : `The Y projections are disjoint, so despite overlapping in X the rectangles do not share area. isOverlapped = false. (Time O(1), Space O(1).)`,
    { axis: 'y', xPass: true, yPass, maxLeft: maxLeftY, minRight: minRightY, result, done: true },
  );
  return frames;
}

function computeResult(frames: Frame<OverlapState>[]): boolean {
  const s = frames[frames.length - 1]?.state as OverlapState | undefined;
  return s?.result === true;
}

function View({ frame }: PluginViewProps<OverlapState>) {
  const s = frame.state;
  const axis = s.axis ?? 'x';
  const spanA = axis === 'x' ? s.rxA : s.ryA;
  const spanB = axis === 'x' ? s.rxB : s.ryB;

  // Build a fixed integer track and tint the cells each rectangle covers.
  const track: number[] = [];
  for (let v = TRACK_LO; v <= TRACK_HI; v++) track.push(v);

  const inSpan = (span: [number, number], v: number) => v >= span[0]! && v <= span[1]!;

  const tone = (i: number) => {
    const v = track[i]!;
    const inA = inSpan(spanA, v!);
    const inB = inSpan(spanB, v!);
    if (
      s.maxLeft !== null &&
      s.minRight !== null &&
      s.minRight > s.maxLeft &&
      v! > s.maxLeft &&
      v! < s.minRight
    )
      return 'found'; // the proven shared interval
    if (inA && inB) return 'match'; // both cover this point
    if (inA || inB) return 'in-window'; // exactly one rectangle
    return 'dead';
  };

  const pointers: ArrayPointer[] = [];
  if (s.maxLeft !== null) {
    const idx = s.maxLeft - TRACK_LO;
    if (idx >= 0 && idx < track.length)
      pointers.push({ i: idx, label: 'max(L)', tone: 'warn', place: 'above' });
  }
  if (s.minRight !== null) {
    const idx = s.minRight - TRACK_LO;
    if (idx >= 0 && idx < track.length)
      pointers.push({ i: idx, label: 'min(R)', tone: 'accent', place: 'below' });
  }

  const axisLabel = axis === 'x' ? 'X axis' : 'Y axis';

  const rail = (
    <>
      <RailGroup label={axisLabel}>
        <RailStat k="max(L)" v={s.maxLeft ?? '—'} tone="warn" />
        <RailStat k="min(R)" v={s.minRight ?? '—'} tone="accent" />
      </RailGroup>
      <RailGroup label="axes">
        <RailStat
          k="X"
          v={s.xPass === null ? '…' : s.xPass ? '✓' : '✗'}
          tone={s.xPass === null ? undefined : s.xPass ? 'good' : 'bad'}
        />
        <RailStat
          k="Y"
          v={s.yPass === null ? '…' : s.yPass ? '✓' : '✗'}
          tone={s.yPass === null ? undefined : s.yPass ? 'good' : 'bad'}
        />
      </RailGroup>
      {s.done && (
        <RailResult
          label="overlap"
          value={s.result ? 'true' : 'false'}
          tone={s.result ? 'good' : 'bad'}
        />
      )}
    </>
  );

  return (
    <VizStage rail={rail}>
      <ArrayRow values={track} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<OverlapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="axis" v={s.axis ?? '—'} />
      <InspectorRow k="max(lefts)" v={s.maxLeft ?? '—'} />
      <InspectorRow k="min(rights)" v={s.minRight ?? '—'} />
      <InspectorRow
        k="min > max?"
        v={s.maxLeft === null || s.minRight === null ? '—' : s.minRight > s.maxLeft ? 'yes' : 'no'}
      />
      <InspectorRow k="X passed" v={s.xPass === null ? '…' : s.xPass ? 'yes' : 'no'} />
      <InspectorRow k="Y passed" v={s.yPass === null ? '…' : s.yPass ? 'yes' : 'no'} />
      <InspectorRow
        k="overlap"
        v={s.result === null ? (s.done ? 'false' : '…') : s.result ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-intervals-is-overlapped';
export const title = 'Is overlapped';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Is overlapped"?',
    choices: [
      {
        label: 'Axis-separated rectangle overlap — fits this problem',
        correct: true,
      },
      {
        label: 'Compare six pairwise distances — different approach',
      },
      {
        label: 'Brute-force nearest store by distance — different approach',
      },
      {
        label: 'Sort + Greedy Merge — different approach',
      },
    ],
    explain: 'Overlap iff both the x-ranges and the y-ranges intersect with positive area',
  },
  {
    id: 'key-step',
    prompt: 'On the "EDGES_Y" step (max(,)=), what happens?',
    choices: [
      {
        label: 'Rightmost bottom edge: max(, ) = — this move caption',
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain: 'Rightmost bottom edge: max(, ) = . Any shared Y range must start here.',
  },
  {
    id: 'state',
    prompt: 'What does the `axis` field track in the visualization state?',
    choices: [
      {
        label: 'axis currently under inspection — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain: 'The recorder keeps `axis` in sync: axis currently under inspection',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Is overlapped"?',
    choices: [
      {
        label: 'O(1) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n^2) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(1). O(1). min(rights) > max(lefts) on both X and Y',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Lowest top edge: min(, ) = — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain: 'Lowest top edge: min(, ) = . Any shared Y range must end here.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'ov-yes',
      label: 'A[1..6]!×[1..6] vs B[4..9]!×[3..7] → overlap',
      value: {
        p1: { x: 1, y: 1 },
        p2: { x: 6, y: 6 },
        q1: { x: 4, y: 3 },
        q2: { x: 9, y: 7 },
      },
    },
    {
      id: 'ov-no',
      label: 'A[1..3]!×[1..8] vs B[5..9]!×[2..6] → no overlap',
      value: {
        p1: { x: 1, y: 1 },
        p2: { x: 3, y: 8 },
        q1: { x: 5, y: 2 },
        q2: { x: 9, y: 6 },
      },
    },
  ] satisfies SampleInput<OverlapInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const ok = computeResult(frames);
    return { ok, label: ok ? 'overlap' : 'no overlap' };
  },
};

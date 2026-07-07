import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import {
  InspectorRow,
  RailGroup,
  RailStat,
  RailSteps,
  VarGrid,
  VizEmpty,
  VizStage,
  VizStat,
  VizStatGroup,
  VizStatStrip,
  type RailStep,
} from '../../../_shared/vizKit';
import {
  IconBit,
  IconBucket,
  IconDup,
  IconGhost,
  IconRange,
  IconSpark,
  IconXor,
} from '../../../_shared/vizIcons';

interface DupMissInput {
  nums: number[];
}

type Phase = 'init' | 'xorAll' | 'split' | 'bucket' | 'decide' | 'done';

interface DupMissState {
  nums: number[];
  n: number;
  phase: Phase;
  // Phase 1 — combine 1..n with nums into xorAll = dup ^ missing
  xorAll: number;
  scanI: number | null; // index into nums currently folded in
  expectVal: number | null; // the i (1..n) currently folded in
  // Phase 2 — isolate a differing bit
  rightBit: number | null;
  // Phase 3 — bucket every value by that bit
  x: number; // xor of bucket where bit IS set
  y: number; // xor of bucket where bit is NOT set
  bucketVal: number | null; // value currently bucketed
  bucketHasBit: boolean | null; // which bucket it landed in
  // Phase 4 — result
  dup: number | null;
  missing: number | null;
  done: boolean;
}

function record({ nums }: DupMissInput): Frame<DupMissState>[] {
  const n = nums.length;

  let xorAll = 0;
  let rightBit: number | null = null;
  let x = 0;
  let y = 0;

  const { emit, frames } = createRecorder<DupMissState>(() => ({
    nums,
    n,
    phase: 'init',
    xorAll,
    scanI: null,
    expectVal: null,
    rightBit,
    x,
    y,
    bucketVal: null,
    bucketHasBit: null,
    dup: null,
    missing: null,
    done: false,
  }));

  const bin = (v: number) => '0b' + v.toString(2);

  emit(
    'INIT',
    `n=${n}`,
    `Find the duplicate and the missing value. The array should hold 1..${n} exactly once, but one number appears twice and another is absent. XOR every index 1..${n} with every array value: matched numbers cancel, leaving dup XOR missing. O(n) time, O(1) space.`,
    { phase: 'init' },
  );

  // Phase 1a — fold in the expected universe 1..n.
  for (let i = 1; i <= n; i++) {
    xorAll ^= i;
    emit(
      'XOR_RANGE',
      `^${i}`,
      `Fold the expected value ${i} into the accumulator. After XOR-ing 1..${i}, xorAll = ${xorAll} (${bin(xorAll)}).`,
      { phase: 'xorAll', expectVal: i, xorAll },
    );
  }

  // Phase 1b — fold in the actual array values.
  for (let i = 0; i < n; i++) {
    xorAll ^= nums[i];
    emit(
      'XOR_NUMS',
      `^nums[${i}]=${nums[i]}`,
      `Fold in the actual value nums[${i}] = ${nums[i]}. Equal numbers from the range and the array cancel each other; xorAll = ${xorAll} (${bin(xorAll)}).`,
      { phase: 'xorAll', scanI: i, xorAll },
    );
  }

  // Phase 2 — isolate the lowest set bit. dup and missing differ here.
  rightBit = xorAll & -xorAll;
  emit(
    'RIGHT_BIT',
    `rightBit=${rightBit}`,
    `xorAll = ${xorAll} (${bin(xorAll)}) equals dup XOR missing. Its lowest set bit is rightBit = xorAll & -xorAll = ${rightBit} (${bin(rightBit)}). dup and missing differ in this bit, so it splits them into two buckets.`,
    { phase: 'split', xorAll, rightBit },
  );

  // Phase 3a — bucket the expected universe 1..n.
  for (let i = 1; i <= n; i++) {
    const hasBit = (i & rightBit) !== 0;
    if (hasBit) x ^= i;
    else y ^= i;
    emit(
      'BUCKET_RANGE',
      hasBit ? `x^=${i}` : `y^=${i}`,
      `Expected value ${i}: bit ${rightBit} is ${hasBit ? 'set' : 'clear'}, so XOR it into bucket ${hasBit ? 'X' : 'Y'}. X = ${x}, Y = ${y}.`,
      { phase: 'bucket', expectVal: i, bucketVal: i, bucketHasBit: hasBit, x, y },
    );
  }

  // Phase 3b — bucket the actual array values.
  for (let i = 0; i < n; i++) {
    const v = nums[i];
    const hasBit = (v & rightBit) !== 0;
    if (hasBit) x ^= v;
    else y ^= v;
    emit(
      'BUCKET_NUMS',
      hasBit ? `x^=${v}` : `y^=${v}`,
      `Array value nums[${i}] = ${v}: bit ${rightBit} is ${hasBit ? 'set' : 'clear'}, so XOR it into bucket ${hasBit ? 'X' : 'Y'}. X = ${x}, Y = ${y}.`,
      { phase: 'bucket', scanI: i, bucketVal: v, bucketHasBit: hasBit, x, y },
    );
  }

  // Phase 4 — X and Y are dup and missing in some order. The one that
  // actually appears in nums (nums[x-1] === x) is the duplicate.
  const xPresent = x >= 1 && x <= n && nums[x - 1] === x;
  const dup = xPresent ? x : y;
  const missing = xPresent ? y : x;
  emit(
    'DECIDE',
    `nums[${x}-1]==${x}? ${xPresent}`,
    `Bucket X = ${x} and bucket Y = ${y} are the duplicate and the missing value, but in unknown order. Check whether X actually occurs: nums[${x} − 1] = ${nums[x - 1] ?? '—'} ${xPresent ? '=' : '≠'} ${x}. ${xPresent ? 'X is present, so X is the duplicate.' : 'X is absent, so X is the missing one and Y is the duplicate.'}`,
    { phase: 'decide', x, y, dup, missing },
  );

  emit(
    'DONE',
    `dup=${dup}, missing=${missing}`,
    `Answer: ${dup} is the duplicate and ${missing} is the missing value. Done in one pass over the data with only a handful of integers — O(n) time, O(1) space.`,
    { phase: 'done', x, y, dup, missing, done: true },
    'good',
  );

  return frames;
}

const PHASE_STEPS: RailStep[] = [
  { id: 'init', label: 'setup' },
  { id: 'xorAll', label: 'xor fold' },
  { id: 'split', label: 'pick bit' },
  { id: 'bucket', label: 'buckets' },
  { id: 'decide', label: 'decide' },
  { id: 'done', label: 'done' },
];

function View({ frame }: PluginViewProps<DupMissState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.scanI !== null && s.scanI >= 0 && s.scanI < s.n) {
    pointers.push({ i: s.scanI, label: 'i', tone: 'accent', place: 'above' });
  }
  const dupIdx = s.dup !== null && s.dup >= 1 && s.dup <= s.n ? s.dup - 1 : -1;
  if (dupIdx >= 0) pointers.push({ i: dupIdx, label: 'dup', tone: 'bad', place: 'below' });

  const tone = (i: number) => {
    if (dupIdx === i) return 'found';
    if (s.scanI === i) return 'match';
    return '';
  };

  const showXor = s.phase === 'xorAll' || s.phase === 'split';
  const bucketsLive = s.phase === 'bucket' || s.phase === 'decide' || s.phase === 'done';
  const folding =
    s.phase === 'xorAll' ? (s.expectVal ?? (s.scanI !== null ? s.nums[s.scanI] : null)) : null;
  const routing =
    s.phase === 'bucket' && s.bucketVal !== null
      ? `${s.bucketVal} → ${s.bucketHasBit ? 'X' : 'Y'}`
      : null;
  const op = folding !== null ? `^ ${folding}` : (routing ?? '—');

  const rail = (
    <>
      <RailSteps steps={PHASE_STEPS} activeId={s.phase} />
      <RailGroup label="answer">
        <RailStat
          k="dup"
          icon={<IconDup />}
          v={s.dup ?? '…'}
          tone={s.dup !== null ? 'bad' : undefined}
        />
        <RailStat
          k="missing"
          icon={<IconGhost />}
          v={s.missing ?? '…'}
          tone={s.missing !== null ? 'good' : undefined}
        />
      </RailGroup>
    </>
  );

  return (
    <VizStage rail={rail} minHeight={290}>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <VizStatStrip>
        <VizStatGroup>
          <VizStat k="holds" icon={<IconRange />} v={`1..${s.n}`} />
          <VizStat k="op" icon={<IconSpark />} v={op} tone={op !== '—' ? 'accent' : undefined} />
        </VizStatGroup>
        <VizStatGroup>
          <VizStat
            k="xor"
            icon={<IconXor />}
            v={`${s.xorAll} · 0b${s.xorAll.toString(2)}`}
            tone={showXor ? 'accent' : undefined}
          />
          <VizStat
            k="bit"
            icon={<IconBit />}
            v={s.rightBit ?? '—'}
            tone={s.phase === 'split' ? 'accent' : undefined}
          />
        </VizStatGroup>
        <VizStatGroup>
          <VizStat
            k="X"
            icon={<IconBucket />}
            v={bucketsLive ? s.x : '—'}
            tone={s.bucketHasBit === true ? 'accent' : undefined}
          />
          <VizStat
            k="Y"
            icon={<IconBucket />}
            v={bucketsLive ? s.y : '—'}
            tone={s.bucketHasBit === false ? 'accent' : undefined}
          />
        </VizStatGroup>
      </VizStatStrip>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<DupMissState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n" v={s.n} />
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="xorAll" v={`${s.xorAll} (0b${s.xorAll.toString(2)})`} />
      <InspectorRow k="rightBit" v={s.rightBit ?? '—'} />
      <InspectorRow k="X" v={s.x} />
      <InspectorRow k="Y" v={s.y} />
      <InspectorRow k="dup" v={s.dup ?? '…'} />
      <InspectorRow k="missing" v={s.missing ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-find-duplicate-and-missing';
export const title = 'Find duplicate and missing';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find duplicate and missing"?',
    choices: [
      {
        label: 'XOR + math — fits this problem',
        correct: true,
      },
      {
        label: 'Two pointers swap — different approach',
      },
      {
        label: 'Boyer-Moore voting — different approach',
      },
      {
        label: 'Sliding window — different approach',
      },
    ],
    explain: 'XOR all numbers and 1..n leaves dup^missing; a set bit splits them into two buckets',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Find duplicate and missing), what strategy is established?',
    choices: [
      {
        label: 'XOR all numbers and 1..n leaves — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Find the duplicate and the missing value. The array should hold 1.. exactly once, but one number appears twice and another is absent. XOR every index 1.. with every array value: matched numbers cancel, leaving dup XOR missing. O(n) time, O(1) space.',
  },
  {
    id: 'key-step',
    prompt: 'On the "RIGHT_BIT" step (rightBit=), what happens?',
    choices: [
      {
        label: 'xorAll = () equals dup XOR — this move caption',
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
    explain:
      'xorAll =  () equals dup XOR missing. Its lowest set bit is rightBit = xorAll & -xorAll =  (). dup and missing differ in this bit, so it splits them into two buckets.',
  },
  {
    id: 'state',
    prompt: 'What does the `scanI` field track in the visualization state?',
    choices: [
      {
        label: 'index into nums currently folded — updated each frame',
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
    explain: 'The recorder keeps `scanI` in sync: index into nums currently folded in',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find duplicate and missing"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n+m) time, O(1) space — wrong order of growth',
      },
    ],
    explain:
      'O(n). O(1). xor 1..n and arr; rightBit=x&-x; xor each bucket; nums[x-1]==x decides order',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Answer: is the duplicate — final DONE caption',
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
    explain:
      'Answer:  is the duplicate and  is the missing value. Done in one pass over the data with only a handful of integers — O(n) time, O(1) space.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'dm1', label: '[1,2,2,4] → dup 2, miss 3', value: { nums: [1, 2, 2, 4] } },
    { id: 'dm2', label: '[1,2,4,4,5] → dup 4, miss 3', value: { nums: [1, 2, 4, 4, 5] } },
  ] satisfies SampleInput<DupMissInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DupMissState | undefined;
    if (!s || s.dup === null || s.missing === null) {
      return { ok: false, label: 'no answer' };
    }
    return { ok: true, label: `dup ${s.dup}, missing ${s.missing}` };
  },
};

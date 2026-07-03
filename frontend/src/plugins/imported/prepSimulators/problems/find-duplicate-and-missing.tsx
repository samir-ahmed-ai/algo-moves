import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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

function record({ nums }: DupMissInput): Frame<DupMissState>[] {  const n = nums.length;

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
        done: false
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

  const showBucket = s.phase === 'bucket' && s.bucketVal !== null;
  const showXor = s.phase === 'xorAll' || s.phase === 'split';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        should hold 1..<span className="font-mono text-ink">{s.n}</span> · phase:{' '}
        <span className="font-mono text-ink">{s.phase}</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      {showXor && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          xorAll = <span className="text-ink">{s.xorAll}</span> (0b{s.xorAll.toString(2)})
          {s.expectVal !== null && (
            <span className="text-ink3"> · folding {s.expectVal}</span>
          )}
          {s.rightBit !== null && (
            <span className="text-ink3"> · rightBit = {s.rightBit}</span>
          )}
        </div>
      )}
      {(s.phase === 'bucket' || s.phase === 'decide' || s.phase === 'done') && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          X = <span className="text-ink">{s.x}</span> · Y ={' '}
          <span className="text-ink">{s.y}</span>
          {showBucket && (
            <span className="text-ink3">
              {' '}
              · {s.bucketVal} → bucket {s.bucketHasBit ? 'X' : 'Y'}
            </span>
          )}
        </div>
      )}
      {s.dup !== null && s.missing !== null && (
        <div className={cn('mt-1 font-mono', vizText.base)}>
          <span className="text-bad">dup = {s.dup}</span>
          {' · '}
          <span className="text-good">missing = {s.missing}</span>
        </div>
      )}
    </div>
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

export const simulator: ProblemSimulator = {
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

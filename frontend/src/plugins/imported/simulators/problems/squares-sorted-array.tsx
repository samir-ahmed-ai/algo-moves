import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { cn } from '@/lib/utils/cn';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  vizText,
  VizStage,
  RailGroup,
  RailStat,
  RailStack,
  RailResult,
} from '../../../_shared/vizKit';

interface SqInput {
  values: number[];
}

interface SqState {
  values: number[]; // the sorted (possibly negative) input
  left: number;
  right: number;
  chosen: number | null; // input index whose square was just written
  writeAt: number | null; // result slot just filled (from the back)
  result: (number | null)[]; // output being built back-to-front
  dead: boolean[]; // input cells already consumed
  done: boolean;
}

function record({ values }: SqInput): Frame<SqState>[] {
  const n = values.length;
  const result = new Array<number | null>(n).fill(null);
  const dead = new Array<boolean>(n).fill(false);
  let left = 0;
  let right = n - 1;

  const { emit, frames } = createRecorder<SqState>(() => ({
    values,
    left,
    right,
    chosen: null,
    writeAt: null,
    result: result.slice(),
    dead: dead.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `left=0 right=${right}`,
    `The input is sorted but has negatives, so the largest square sits at one of the two ends. Put left at 0 and right at ${right}; compare end squares and fill the result from the back forward.`,
    { chosen: null, writeAt: null },
  );

  for (let k = n - 1; k >= 0; k--) {
    const lSq = values[left] * values[left];
    const rSq = values[right] * values[right];
    if (lSq > rSq) {
      result[k] = lSq;
      dead[left] = true;
      emit(
        'TAKE-L',
        `res[${k}]=${lSq}`,
        `left²=${values[left]}²=${lSq} > right²=${values[right]}²=${rSq}, so the left end has the bigger square. Write ${lSq} into result[${k}] and advance left to ${left + 1}.`,
        { chosen: left, writeAt: k },
      );
      left++;
    } else {
      result[k] = rSq;
      dead[right] = true;
      emit(
        'TAKE-R',
        `res[${k}]=${rSq}`,
        `right²=${values[right]}²=${rSq} ≥ left²=${values[left]}²=${lSq}, so the right end has the bigger square. Write ${rSq} into result[${k}] and move right to ${right - 1}.`,
        { chosen: right, writeAt: k },
      );
      right--;
    }
  }

  emit(
    'DONE',
    'sorted squares',
    `Every input cell has been consumed. Filling from the back guaranteed the squares come out ascending: [${result.join(', ')}].`,
    { chosen: null, writeAt: null, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SqState>) {
  const s = frame.state;
  const live = s.left <= s.right;
  const lSq = live ? s.values[s.left] * s.values[s.left] : null;
  const rSq = live ? s.values[s.right] * s.values[s.right] : null;
  const filled = s.result.filter((v) => v !== null).length;
  const pointers: ArrayPointer[] = [];
  if (live) {
    pointers.push({ i: s.left, label: 'left', tone: 'accent', place: 'below' });
    pointers.push({ i: s.right, label: 'right', tone: 'bad', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.chosen === i) return 'mid';
    if (s.dead[i]) return 'dead';
    return '';
  };
  const resultItems = s.result.map((v, i) =>
    v === null
      ? { label: '·', tone: undefined }
      : { label: String(v), tone: (s.writeAt === i ? 'accent' : 'good') as 'accent' | 'good' },
  );
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="left²" v={lSq ?? '—'} tone="accent" />
        <RailStat k="right²" v={rSq ?? '—'} />
        <RailStat k="filled" v={`${filled}/${s.values.length}`} />
      </RailGroup>
      <RailStack label="result" items={resultItems} highlightEnd="bottom" topLabel="back" />
      {s.done && <RailResult label="answer" value={`[${s.result.join(', ')}]`} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <div className={cn(vizText.sm, 'text-ink3')}>
        two pointers from the ends · square &amp; merge backward
      </div>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SqState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const lSq = s.left <= s.right ? s.values[s.left] * s.values[s.left] : null;
  const rSq = s.left <= s.right ? s.values[s.right] * s.values[s.right] : null;
  const filled = s.result.filter((v) => v !== null).length;
  return (
    <VarGrid>
      <InspectorRow k="left" v={s.left <= s.right ? `${s.left} (${s.values[s.left]})` : '—'} />
      <InspectorRow k="right" v={s.left <= s.right ? `${s.right} (${s.values[s.right]})` : '—'} />
      <InspectorRow k="left²" v={lSq ?? '—'} />
      <InspectorRow k="right²" v={rSq ?? '—'} />
      <InspectorRow k="filled" v={`${filled} / ${s.values.length}`} />
      <InspectorRow k="result" v={s.done ? `[${s.result.join(', ')}]` : '…merging'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-56-squares-of-a-sorted-array';
export const title = 'Squares of a Sorted Array';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 's1', label: '[-4,-1,0,3,10]', value: { values: [-4, -1, 0, 3, 10] } },
    { id: 's2', label: '[-7,-3,2,3,11]', value: { values: [-7, -3, 2, 3, 11] } },
  ] satisfies SampleInput<SqInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SqState | undefined;
    return s && s.done
      ? { ok: true, label: `[${s.result.join(', ')}]` }
      : { ok: false, label: '—' };
  },
};

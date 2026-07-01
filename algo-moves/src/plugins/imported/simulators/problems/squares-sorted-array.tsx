import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const frames: Frame<SqState>[] = [];
  const n = values.length;
  const result = new Array<number | null>(n).fill(null);
  const dead = new Array<boolean>(n).fill(false);
  let left = 0;
  let right = n - 1;

  const emit = (
    type: string,
    note: string,
    caption: string,
    chosen: number | null,
    writeAt: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        values,
        left,
        right,
        chosen,
        writeAt,
        result: result.slice(),
        dead: dead.slice(),
        done: tone != null,
      },
    });

  emit(
    'INIT',
    `left=0 right=${right}`,
    `The input is sorted but has negatives, so the largest square sits at one of the two ends. Put left at 0 and right at ${right}; compare end squares and fill the result from the back forward.`,
    null,
    null,
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
        left,
        k,
      );
      left++;
    } else {
      result[k] = rSq;
      dead[right] = true;
      emit(
        'TAKE-R',
        `res[${k}]=${rSq}`,
        `right²=${values[right]}²=${rSq} ≥ left²=${values[left]}²=${lSq}, so the right end has the bigger square. Write ${rSq} into result[${k}] and move right to ${right - 1}.`,
        right,
        k,
      );
      right--;
    }
  }

  emit(
    'DONE',
    'sorted squares',
    `Every input cell has been consumed. Filling from the back guaranteed the squares come out ascending: [${result.join(', ')}].`,
    null,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SqState>) {
  const s = frame.state;
  const live = s.left <= s.right;
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
  const out = s.result.map((v) => (v === null ? '·' : v));
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>two pointers from the ends · square &amp; merge backward</div>
      <ArrayRow values={s.values} cellTone={tone} pointers={pointers} />
      <div className={cn('mt-3 text-ink3', vizText.sm)}>result (built back → front)</div>
      <ArrayRow
        values={out}
        cellTone={(i) => (s.writeAt === i ? 'found' : s.result[i] !== null ? 'mid' : '')}
      />
    </div>
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

export const simulator: DpSimulator = {
  inputs: [
    { id: 's1', label: '[-4,-1,0,3,10]', value: { values: [-4, -1, 0, 3, 10] } },
    { id: 's2', label: '[-7,-3,2,3,11]', value: { values: [-7, -3, 2, 3, 11] } },
  ] satisfies SampleInput<SqInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SqState | undefined;
    return s && s.done ? { ok: true, label: `[${s.result.join(', ')}]` } : { ok: false, label: '—' };
  },
};

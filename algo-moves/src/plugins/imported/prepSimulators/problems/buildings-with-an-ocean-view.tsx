import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import { QueueTape } from '../../../../components/QueueTape';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface BuildingsInput {
  heights: number[];
}

interface BuildingsState {
  heights: number[];
  i: number | null; // current building under inspection (scanning right→left)
  maxH: number; // tallest building seen so far to the right
  view: boolean[]; // view[k] = building k has an ocean view
  resRev: number[]; // indices collected so far, in reverse (right→left) order
  result: number[] | null; // final answer (left→right), only on the last frame
  done: boolean;
}

function record({ heights }: BuildingsInput): Frame<BuildingsState>[] {
  const frames: Frame<BuildingsState>[] = [];
  const n = heights.length;
  const view = new Array<boolean>(n).fill(false);
  const resRev: number[] = [];
  let maxH = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<BuildingsState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        heights,
        i: null,
        maxH,
        view: view.slice(),
        resRev: resRev.slice(),
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `n=${n}`,
    `Buildings With an Ocean View: the ocean is to the right. A building sees the ocean only if every building to its right is strictly shorter. Scan right-to-left tracking maxH (the tallest seen so far); any building taller than maxH has a clear view.`,
    { i: null },
  );

  for (let i = n - 1; i >= 0; i--) {
    emit(
      'SCAN',
      `i=${i}, maxH=${maxH}`,
      `Look at building ${i} (height ${heights[i]}). Compare it against maxH = ${maxH}, the tallest building anywhere to its right.`,
      { i },
    );
    if (heights[i] > maxH) {
      view[i] = true;
      resRev.push(i);
      const prevMax = maxH;
      maxH = heights[i];
      emit(
        'VIEW',
        `+${i}`,
        `${heights[i]} > ${prevMax}, so nothing to the right blocks building ${i} — it has an ocean view. Record index ${i} and raise maxH to ${maxH}.`,
        { i, view: view.slice(), resRev: resRev.slice() },
        'good',
      );
    } else {
      emit(
        'BLOCKED',
        `${heights[i]}≤${maxH}`,
        `${heights[i]} ≤ ${maxH}: a building of height ${maxH} to the right blocks the view, so building ${i} is skipped.`,
        { i },
        'bad',
      );
    }
  }

  const result = resRev.slice().reverse();
  emit(
    'DONE',
    `[${result.join(',')}]`,
    `Scan complete. We collected the view-having indices right-to-left, so reverse them into ascending order: [${result.join(', ')}]. These are the buildings with an ocean view.`,
    { i: null, result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<BuildingsState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.done && s.result?.includes(i)) return 'found';
    if (s.i === i) return 'match';
    if (s.view[i]) return 'found';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        ocean is to the right → · maxH ={' '}
        <span className="font-mono text-ink">{s.maxH}</span>
      </div>
      <ArrayRow values={s.heights} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>height per building (index below)</div>
      <div className="mt-1">
        <QueueTape items={s.resRev} label="collected (reverse) · " />
      </div>
      {s.result && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → [{s.result.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BuildingsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="heights[i]" v={s.i !== null ? s.heights[s.i] : '—'} />
      <InspectorRow k="maxH" v={s.maxH} />
      <InspectorRow k="views so far" v={s.resRev.length} />
      <InspectorRow
        k="result"
        v={s.result ? `[${s.result.join(', ')}]` : s.done ? 'none' : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-buildings-with-an-ocean-view';
export const title = 'Buildings With an Ocean View';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'boa1', label: '[4,2,3,1]', value: { heights: [4, 2, 3, 1] } },
    { id: 'boa2', label: '[1,3,2,4]', value: { heights: [1, 3, 2, 4] } },
  ] satisfies SampleInput<BuildingsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BuildingsState | undefined;
    const r = s?.result ?? [];
    return { ok: true, label: `[${r.join(',')}]` };
  },
};

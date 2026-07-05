import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface TrapInput {
  height: number[];
}

interface TrapState {
  height: number[];
  l: number | null; // left pointer
  r: number | null; // right pointer
  leftMax: number; // tallest wall seen from the left, up to l
  rightMax: number; // tallest wall seen from the right, up to r
  moved: 'l' | 'r' | null; // which pointer just advanced
  added: number | null; // water trapped at the cell we just landed on (0 = none)
  ans: number; // running total of trapped water
  done: boolean;
}

function record({ height }: TrapInput): Frame<TrapState>[] {
  const { emit, frames } = createRecorder<TrapState>(() => ({
        height,
        l: null,
        r: null,
        leftMax: 0,
        rightMax: 0,
        moved: null,
        added: null,
        ans: 0,
        done: false
      }));

  if (height.length === 0) {
    emit('DONE', '0', 'The elevation map is empty, so no water can be trapped. Answer = 0.', { done: true }, 'good');
    return frames;
  }

  let l = 0;
  let r = height.length - 1;
  let leftMax = height[l];
  let rightMax = height[r];
  let ans = 0;

  emit(
    'INIT',
    `l=${l} r=${r}`,
    `Trap Rain Water: two pointers close in from both ends. leftMax/rightMax track the tallest wall seen so far from each side. We always move the pointer on the SHORTER wall, because that side limits how much water its cells can hold.`,
    { l, r, leftMax, rightMax },
  );

  while (l < r) {
    if (leftMax < rightMax) {
      l++;
      if (height[l] > leftMax) {
        const prev = leftMax;
        leftMax = height[l];
        emit(
          'WALL-L',
          `leftMax→${leftMax}`,
          `leftMax (${prev}) < rightMax (${rightMax}), so advance the left pointer to ${l}. height[${l}] = ${height[l]} is a new tallest-left wall, so it traps no water itself — raise leftMax to ${leftMax}.`,
          { l, r, leftMax, rightMax, moved: 'l', added: 0, ans },
        );
      } else {
        const add = leftMax - height[l];
        ans += add;
        emit(
          'FILL-L',
          `+${add} (=${ans})`,
          `leftMax (${leftMax}) < rightMax (${rightMax}), so advance the left pointer to ${l}. height[${l}] = ${height[l]} sits below leftMax, so it traps leftMax − height[${l}] = ${leftMax} − ${height[l]} = ${add} units. Total = ${ans}.`,
          { l, r, leftMax, rightMax, moved: 'l', added: add, ans },
          add > 0 ? 'good' : undefined,
        );
      }
    } else {
      r--;
      if (height[r] > rightMax) {
        const prev = rightMax;
        rightMax = height[r];
        emit(
          'WALL-R',
          `rightMax→${rightMax}`,
          `leftMax (${leftMax}) ≥ rightMax (${prev}), so advance the right pointer to ${r}. height[${r}] = ${height[r]} is a new tallest-right wall, so it traps no water itself — raise rightMax to ${rightMax}.`,
          { l, r, leftMax, rightMax, moved: 'r', added: 0, ans },
        );
      } else {
        const add = rightMax - height[r];
        ans += add;
        emit(
          'FILL-R',
          `+${add} (=${ans})`,
          `leftMax (${leftMax}) ≥ rightMax (${rightMax}), so advance the right pointer to ${r}. height[${r}] = ${height[r]} sits below rightMax, so it traps rightMax − height[${r}] = ${rightMax} − ${height[r]} = ${add} units. Total = ${ans}.`,
          { l, r, leftMax, rightMax, moved: 'r', added: add, ans },
          add > 0 ? 'good' : undefined,
        );
      }
    }
  }

  emit(
    'DONE',
    `${ans}`,
    `The pointers have met (l = r = ${l}), so every cell has been accounted for. Total trapped water = ${ans}.`,
    { l, r, leftMax, rightMax, ans, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<TrapState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.l !== null) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
  if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'warn', place: 'above' });

  const tone = (i: number) => {
    if (s.done) return '';
    if (s.moved === 'l' && i === s.l) return s.added && s.added > 0 ? 'in-window' : 'match';
    if (s.moved === 'r' && i === s.r) return s.added && s.added > 0 ? 'in-window' : 'match';
    if (i === s.l) return 'lo';
    if (i === s.r) return 'hi';
    return '';
  };

  const win: [number, number] | null =
    s.l !== null && s.r !== null && s.l <= s.r && !s.done ? [s.l, s.r] : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        leftMax = <span className="font-mono text-ink">{s.leftMax}</span>
        {' · '}rightMax = <span className="font-mono text-ink">{s.rightMax}</span>
        {' · '}water = <span className="font-mono text-ink">{s.ans}</span>
      </div>
      <ArrayRow values={s.height} cellTone={tone} pointers={pointers} windowRange={win} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        {s.added !== null && !s.done
          ? s.added > 0
            ? `+${s.added} trapped at index ${s.moved === 'l' ? s.l : s.r}`
            : `no water at index ${s.moved === 'l' ? s.l : s.r} (it is a wall)`
          : 'move the shorter side; add sideMax − height'}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.ans} units of water</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<TrapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const hl = s.l !== null ? s.height[s.l] : null;
  const hr = s.r !== null ? s.height[s.r] : null;
  return (
    <VarGrid>
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="height[l]" v={hl ?? '—'} />
      <InspectorRow k="height[r]" v={hr ?? '—'} />
      <InspectorRow k="leftMax" v={s.leftMax} />
      <InspectorRow k="rightMax" v={s.rightMax} />
      <InspectorRow k="trapped (this step)" v={s.added ?? '—'} />
      <InspectorRow k="ans (total)" v={s.ans} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-trap-rain-water';
export const title = 'Trap rain water';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'trw1', label: '[4,2,0,3,2,5]', value: { height: [4, 2, 0, 3, 2, 5] } },
    { id: 'trw2', label: '[3,0,2,0,4]', value: { height: [3, 0, 2, 0, 4] } },
  ] satisfies SampleInput<TrapInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TrapState | undefined;
    const v = s?.ans ?? 0;
    return { ok: true, label: `${v} units · O(n)/O(1)` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RainInput {
  height: number[];
}

interface RainState {
  height: number[];
  l: number | null; // left pointer
  r: number | null; // right pointer
  maxL: number; // tallest wall seen from the left so far
  maxR: number; // tallest wall seen from the right so far
  water: number; // total water trapped so far
  side: 'L' | 'R' | null; // which side is being processed this step
  filled: number | null; // index that just trapped water this step
  added: number; // water added at `filled` this step
  done: boolean;
}

function record({ height }: RainInput): Frame<RainState>[] {
  const frames: Frame<RainState>[] = [];
  let l = 0;
  let r = height.length - 1;
  let maxL = 0;
  let maxR = 0;
  let water = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<RainState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        height,
        l,
        r,
        maxL,
        maxR,
        water,
        side: null,
        filled: null,
        added: 0,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `n=${height.length}`,
    `Trapping Rain Water: each bar is a wall of the given height; water pools in the dips between taller walls. Two pointers l=0 and r=${height.length - 1} close inward, tracking maxL and maxR — the tallest wall seen from each side.`,
    {},
  );

  while (l < r) {
    emit(
      'COMPARE',
      `h[${l}]=${height[l]} vs h[${r}]=${height[r]}`,
      `Compare the two ends: height[${l}]=${height[l]} ${height[l] < height[r] ? '<' : '>='} height[${r}]=${height[r]}. The shorter wall steps first — its trapped water is capped by the max on its own side, so that side is safe to settle now.`,
      {},
    );

    if (height[l] < height[r]) {
      if (height[l] >= maxL) {
        maxL = height[l];
        emit(
          'WALL_L',
          `maxL=${maxL}`,
          `height[${l}]=${height[l]} is a new (or equal) tallest left wall, so no water sits on it. Raise maxL to ${maxL} and advance l.`,
          { side: 'L', maxL },
        );
      } else {
        const add = maxL - height[l];
        water += add;
        emit(
          'WATER_L',
          `+${add} at ${l}`,
          `height[${l}]=${height[l]} is below the left wall maxL=${maxL}, so water fills the gap: maxL − height[${l}] = ${maxL} − ${height[l]} = ${add}. Total water is now ${water}.`,
          { side: 'L', filled: l, added: add, water },
          'good',
        );
      }
      l++;
    } else {
      if (height[r] >= maxR) {
        maxR = height[r];
        emit(
          'WALL_R',
          `maxR=${maxR}`,
          `height[${r}]=${height[r]} is a new (or equal) tallest right wall, so no water sits on it. Raise maxR to ${maxR} and retreat r.`,
          { side: 'R', maxR },
        );
      } else {
        const add = maxR - height[r];
        water += add;
        emit(
          'WATER_R',
          `+${add} at ${r}`,
          `height[${r}]=${height[r]} is below the right wall maxR=${maxR}, so water fills the gap: maxR − height[${r}] = ${maxR} − ${height[r]} = ${add}. Total water is now ${water}.`,
          { side: 'R', filled: r, added: add, water },
          'good',
        );
      }
      r--;
    }
  }

  emit(
    'DONE',
    `${water} units`,
    `The pointers met, so every bar has been settled. The total trapped rain water is ${water} units.`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RainState>) {
  const s = frame.state;
  if (s.height.length === 0) return <div className="board-area"><VizEmpty message="empty" /></div>;

  const pointers: ArrayPointer[] = [];
  if (s.l !== null && s.l <= (s.r ?? s.l)) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'below' });
  if (s.r !== null && s.r >= (s.l ?? s.r)) pointers.push({ i: s.r, label: 'r', tone: 'warn', place: 'below' });

  const tone = (i: number) => {
    if (s.filled === i) return 'in-window';
    if (s.l === i && s.side === 'L') return 'match';
    if (s.r === i && s.side === 'R') return 'match';
    if (s.done) return 'found';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        maxL = <span className="font-mono text-ink">{s.maxL}</span>
        {' · '}maxR = <span className="font-mono text-ink">{s.maxR}</span>
        {' · '}water = <span className="font-mono text-good">{s.water}</span>
      </div>
      <ArrayRow values={s.height} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        {s.filled !== null
          ? `trapped +${s.added} at index ${s.filled}`
          : s.done
            ? `done — ${s.water} units trapped`
            : 'shorter wall steps first'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RainState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="height[l]" v={s.l !== null && s.l < s.height.length ? s.height[s.l] : '—'} />
      <InspectorRow k="height[r]" v={s.r !== null && s.r >= 0 ? s.height[s.r] : '—'} />
      <InspectorRow k="maxL" v={s.maxL} />
      <InspectorRow k="maxR" v={s.maxR} />
      <InspectorRow k="water" v={s.water} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-trapping-rain-water';
export const title = 'Trapping Rain Water';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'trw1', label: '[4,2,0,3,2,5] → 9', value: { height: [4, 2, 0, 3, 2, 5] } },
    { id: 'trw2', label: '[3,0,2,0,4] → 7', value: { height: [3, 0, 2, 0, 4] } },
  ] satisfies SampleInput<RainInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RainState | undefined;
    const v = s?.water ?? 0;
    return { ok: true, label: `${v} units` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';

interface TrapInput {
  height: number[];
}

interface TrapState {
  height: number[];
  l: number; // left pointer
  r: number; // right pointer
  w: number | null; // current width r - l
  h: number | null; // current min(height[l], height[r])
  area: number | null; // current candidate area w * h
  best: number; // best area so far
  bestPair: [number, number] | null; // [l, r] that produced best
  improved: boolean; // did this candidate beat best
  moved: 'l' | 'r' | null; // which pointer we advanced this step
  done: boolean;
}

function record({ height }: TrapInput): Frame<TrapState>[] {
  let best = 0;
  let bestPair: [number, number] | null = null;
  let l = 0;
  let r = height.length - 1;

  const { emit, frames } = createRecorder<TrapState>(() => ({
    height,
    l: 0,
    r: height.length - 1,
    w: null,
    h: null,
    area: null,
    best,
    bestPair: bestPair ? [bestPair[0], bestPair[1]] : null,
    improved: false,
    moved: null,
    done: false,
  }));

  emit(
    'INIT',
    `n=${height.length}`,
    `Container With Most Water: treat each value as a vertical line. The water a pair (l, r) holds is width (r − l) times the shorter line min(height[l], height[r]). Start with the widest pair and walk the two pointers inward.`,
    { l, r },
  );

  while (l < r) {
    const w = r - l;
    const h = Math.min(height[l], height[r]);
    const area = w * h;
    const improved = area > best;
    if (improved) {
      best = area;
      bestPair = [l, r];
    }
    emit(
      'MEASURE',
      `area=${area}`,
      `Lines at l=${l} (${height[l]}) and r=${r} (${height[r]}): width = ${r} − ${l} = ${w}, height is the shorter line min(${height[l]}, ${height[r]}) = ${h}, so area = ${w} × ${h} = ${area}.${improved ? ` That beats the previous best (${best === area ? area : best}) — new best = ${area}.` : ` Best stays ${best}.`}`,
      { l, r, w, h, area, best, bestPair: bestPair ? [bestPair[0], bestPair[1]] : null, improved },
      improved ? 'good' : undefined,
    );

    if (height[l] < height[r]) {
      emit(
        'MOVE',
        `l→${l + 1}`,
        `The left line (${height[l]}) is shorter than the right (${height[r]}). The shorter line caps the area, so moving it is the only way to possibly gain — advance l to ${l + 1}.`,
        { l, r, w, h, area, moved: 'l' },
      );
      l++;
    } else {
      emit(
        'MOVE',
        `r→${r - 1}`,
        `The right line (${height[r]}) is at most the left (${height[l]}), so it caps the area. Move the shorter (right) pointer inward — advance r to ${r - 1}.`,
        { l, r, w, h, area, moved: 'r' },
      );
      r--;
    }
  }

  emit(
    'DONE',
    `best=${best}`,
    `The pointers met, so every meaningfully-wide pair has been considered. The most water any container holds is ${best}${bestPair ? `, from lines at indices ${bestPair[0]} and ${bestPair[1]}` : ''}.`,
    { l, r, best, bestPair: bestPair ? [bestPair[0], bestPair[1]] : null, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<TrapState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.l >= 0 && s.l < s.height.length) pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
  if (s.r >= 0 && s.r < s.height.length) pointers.push({ i: s.r, label: 'r', tone: 'accent', place: 'above' });
  const inWindow = !s.done && s.l < s.r;
  const tone = (i: number) => {
    if (s.bestPair && (i === s.bestPair[0] || i === s.bestPair[1])) return 'found';
    if (!s.done && (i === s.l || i === s.r)) return 'match';
    return '';
  };
  const rail = (
    <>
      <RailGroup label="pointers">
        <RailStat k="l" v={s.done ? '—' : s.l} tone="accent" />
        <RailStat k="r" v={s.done ? '—' : s.r} tone="accent" />
      </RailGroup>
      <RailGroup label="measure">
        <RailStat k="w" v={s.w ?? '—'} />
        <RailStat k="h" v={s.h ?? '—'} />
        <RailStat k="area" v={s.area ?? '—'} tone={s.improved ? 'good' : undefined} />
      </RailGroup>
      <RailResult
        label="best"
        value={s.best === 0 ? '—' : `${s.best}${s.bestPair ? ` @ [${s.bestPair[0]},${s.bestPair[1]}]` : ''}`}
        tone={s.done ? 'good' : 'accent'}
      />
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow
        values={s.height}
        cellTone={tone}
        pointers={pointers}
        windowRange={inWindow ? [s.l, s.r] : null}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TrapState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const inBounds = (i: number) => i >= 0 && i < s.height.length;
  return (
    <VarGrid>
      <InspectorRow k="l" v={s.done ? '—' : s.l} />
      <InspectorRow k="r" v={s.done ? '—' : s.r} />
      <InspectorRow k="height[l]" v={!s.done && inBounds(s.l) ? s.height[s.l] : '—'} />
      <InspectorRow k="height[r]" v={!s.done && inBounds(s.r) ? s.height[s.r] : '—'} />
      <InspectorRow k="width (r−l)" v={s.w ?? '—'} />
      <InspectorRow k="height (min)" v={s.h ?? '—'} />
      <InspectorRow k="area (w×h)" v={s.area ?? '—'} />
      <InspectorRow k="best" v={s.best} />
      <InspectorRow k="best pair" v={s.bestPair ? `[${s.bestPair.join(', ')}]` : '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-trap-most-water';
export const title = 'Trap most water';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'tmw1', label: '[1,8,6,2,5,4,8,3]', value: { height: [1, 8, 6, 2, 5, 4, 8, 3] } },
    { id: 'tmw2', label: '[1,2,4,3]', value: { height: [1, 2, 4, 3] } },
  ] satisfies SampleInput<TrapInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TrapState | undefined;
    return s ? { ok: true, label: `best ${s.best}` } : { ok: false, label: 'no data' };
  },
};

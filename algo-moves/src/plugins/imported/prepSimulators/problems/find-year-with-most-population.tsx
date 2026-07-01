import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PopulationInput {
  years: [number, number][]; // [birth, death] intervals
}

interface PopulationState {
  intervals: [number, number][]; // the raw input intervals
  delta: [number, number][]; // sorted [year, delta] entries built so far
  yearKeys: number[]; // sorted unique years (axis the View renders)
  prefix: (number | null)[]; // running population after sweeping each year (null = not swept yet)
  i: number | null; // index into yearKeys currently being swept
  buildPair: number | null; // index into intervals currently being folded into delta
  pop: number; // running population at the current sweep step
  bestPop: number; // best population seen so far
  bestYear: number | null; // year that achieved bestPop
  phase: 'build' | 'sweep' | 'done';
}

function record({ years }: PopulationInput): Frame<PopulationState>[] {  const delta = new Map<number, number>();

  // We keep yearKeys / prefix stable across frames so the axis does not jump.
  // They are computed once the delta map is fully built; before that the
  // sweep-only fields stay null/empty.
  const deltaEntries = (): [number, number][] =>
    [...delta.entries()].sort((a, b) => a[0] - b[0]);

  const { emit, frames } = createRecorder<PopulationState>(() => ({
        intervals: years,
        delta: deltaEntries(),
        yearKeys: [],
        prefix: [],
        i: null,
        buildPair: null,
        pop: 0,
        bestPop: 0,
        bestYear: null,
        phase: 'build'
      }));

  emit(
    'INIT',
    `${years.length} people`,
    `Find the year with the most people alive. Each person spans [birth, death]. Instead of touching every year of every life, we record only the changes: +1 the year someone is born, −1 the year after they die. Then a single sweep of the change points gives the running population.`,
    {},
  );

  // Build the delta map.
  for (let p = 0; p < years.length; p++) {
    const [birth, death] = years[p];
    delta.set(birth, (delta.get(birth) ?? 0) + 1);
    emit(
      'BIRTH',
      `+1 @${birth}`,
      `Person ${p} lives [${birth}, ${death}]. Mark a birth: delta[${birth}] += 1 — one more person is alive from year ${birth} onward.`,
      { buildPair: p, phase: 'build' },
    );
    delta.set(death + 1, (delta.get(death + 1) ?? 0) - 1);
    emit(
      'DEATH',
      `-1 @${death + 1}`,
      `They are alive through year ${death}, so the population drops the year after: delta[${death + 1}] −= 1. Using death+1 keeps the person counted in their final year.`,
      { buildPair: p, phase: 'build' },
    );
  }

  // Finalize the swept axis now that delta is complete.
  const finalDelta = deltaEntries();
  const yearKeys = finalDelta.map(([yr]) => yr);
  const prefix: (number | null)[] = yearKeys.map(() => null);

  emit(
    'SORT',
    `${yearKeys.length} change years`,
    `The delta map is complete. Collect its keys and sort them: [${yearKeys.join(', ')}]. These are the only years where the population can change, so we sweep them left to right with a prefix sum.`,
    { yearKeys, prefix: prefix.slice(), phase: 'sweep' },
  );

  // Sweep.
  let pop = 0;
  let bestPop = 0;
  let bestYear = 0;
  for (let i = 0; i < yearKeys.length; i++) {
    const yr = yearKeys[i];
    const d = finalDelta[i][1];
    pop += d;
    prefix[i] = pop;
    if (pop > bestPop) {
      const prevBest = bestPop;
      bestPop = pop;
      bestYear = yr;
      emit(
        'PEAK',
        `${yr}: pop ${pop}`,
        `Add delta[${yr}] (=${d >= 0 ? '+' : ''}${d}) to the running population → ${pop}. That beats the previous best (${prevBest}), so the new peak year is ${yr} with ${pop} people alive.`,
        { i, yearKeys, prefix: prefix.slice(), pop, bestPop, bestYear, phase: 'sweep' },
        'good',
      );
    } else {
      emit(
        'STEP',
        `${yr}: pop ${pop}`,
        `Add delta[${yr}] (=${d >= 0 ? '+' : ''}${d}) → running population ${pop}. This does not exceed the current best of ${bestPop} (year ${bestYear}), so the peak year is unchanged.`,
        { i, yearKeys, prefix: prefix.slice(), pop, bestPop, bestYear, phase: 'sweep' },
      );
    }
  }

  emit(
    'DONE',
    `year ${bestYear}`,
    `The sweep is finished. The maximum running population was ${bestPop}, first reached in year ${bestYear}. Return ${bestYear}.`,
    {
      i: yearKeys.indexOf(bestYear),
      yearKeys,
      prefix: prefix.slice(),
      pop,
      bestPop,
      bestYear,
      phase: 'done',
    },
    'good',
  );

  return frames;
}

function deltaAt(s: PopulationState, yr: number): number {
  const hit = s.delta.find(([k]) => k === yr);
  return hit ? hit[1] : 0;
}

function View({ frame }: PluginViewProps<PopulationState>) {
  const s = frame.state;
  const building = s.phase === 'build' || s.yearKeys.length === 0;

  if (building) {
    // During the build phase the axis is not finalized; show the intervals and
    // the delta map being assembled as mono lines.
    return (
      <div className="board-area">
        <div className={cn(vizText.sm, 'text-ink3')}>
          building delta map — +1 at birth, −1 at death+1
        </div>
        <div className={cn('mt-2 flex flex-col gap-1 font-mono', vizText.sm)}>
          {s.intervals.map(([b, d], p) => (
            <div
              key={p}
              className={cn(s.buildPair === p ? 'text-accent' : 'text-ink2')}
            >
              person {p}: [{b}, {d}]
            </div>
          ))}
        </div>
        <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
          delta {'{'}
          {s.delta.map(([yr, d]) => `${yr}:${d >= 0 ? '+' : ''}${d}`).join(', ')}
          {'}'}
        </div>
      </div>
    );
  }

  // Sweep phase: render the sorted change years as the axis.
  const deltaRow = s.yearKeys.map((yr) => {
    const d = deltaAt(s, yr);
    return `${d >= 0 ? '+' : ''}${d}`;
  });
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'sweep', tone: 'accent', place: 'above' });
  const bestIdx = s.bestYear === null ? -1 : s.yearKeys.indexOf(s.bestYear);
  if (bestIdx >= 0) pointers.push({ i: bestIdx, label: 'peak', tone: 'good', place: 'below' });

  const cellTone = (i: number) => {
    if (i === bestIdx) return 'found';
    if (s.i === i) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        sweep — running population ={' '}
        <span className="font-mono text-ink">{s.pop}</span>
        {' · '}best ={' '}
        <span className="font-mono text-ink">{s.bestPop}</span>
        {s.bestYear !== null && (
          <>
            {' @ year '}
            <span className="font-mono text-ink">{s.bestYear}</span>
          </>
        )}
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>year axis (sorted change points):</div>
      <ArrayRow
        values={s.yearKeys}
        cellTone={cellTone}
        pointers={pointers}
        windowRange={null}
      />
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>delta at each year:</div>
      <ArrayRow values={deltaRow} cellTone={cellTone} windowRange={null} />
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
        prefix population: [
        {s.prefix.map((v) => (v === null ? '·' : v)).join(', ')}]
      </div>
      {s.phase === 'done' && s.bestYear !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ year {s.bestYear}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PopulationState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const curYear = s.i !== null && s.i < s.yearKeys.length ? s.yearKeys[s.i] : null;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="people" v={s.intervals.length} />
      <InspectorRow k="delta keys" v={s.delta.length} />
      <InspectorRow k="sweep year" v={curYear ?? '—'} />
      <InspectorRow
        k="delta[year]"
        v={curYear !== null ? `${deltaAt(s, curYear) >= 0 ? '+' : ''}${deltaAt(s, curYear)}` : '—'}
      />
      <InspectorRow k="pop (running)" v={s.pop} />
      <InspectorRow k="best pop" v={s.bestPop} />
      <InspectorRow k="best year" v={s.bestYear ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-find-year-with-most-population';
export const title = 'Find year with most population';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'pop1',
      label: '[[1993,1999],[2000,2010]]',
      value: { years: [[1993, 1999], [2000, 2010]] },
    },
    {
      id: 'pop2',
      label: '[[1950,1961],[1960,1971],[1960,1971]]',
      value: { years: [[1950, 1961], [1960, 1971], [1960, 1971]] },
    },
  ] satisfies SampleInput<PopulationInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PopulationState | undefined;
    return s && s.bestYear !== null
      ? { ok: true, label: `year ${s.bestYear}` }
      : { ok: false, label: 'no data' };
  },
};

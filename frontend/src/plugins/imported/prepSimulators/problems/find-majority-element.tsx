import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

interface MajorityInput {
  nums: number[];
}

interface MajorityState {
  nums: number[];
  i: number | null; // index currently being voted on
  cand: number | null; // current candidate
  count: number; // running vote tally for cand
  picked: boolean; // did this step adopt a new candidate (count was 0)?
  matched: boolean | null; // did nums[i] match cand this step? null before any step
  done: boolean;
  result: number | null; // final majority candidate
}

function record({ nums }: MajorityInput): Frame<MajorityState>[] {
  let count = 0;
  let cand = 0;
  let started = false;

  const { emit, frames } = createRecorder<MajorityState>(() => ({
    nums,
    i: null,
    cand: started ? cand : null,
    count,
    picked: false,
    matched: null,
    done: false,
    result: null,
  }));

  emit(
    'INIT',
    `n=${nums.length}`,
    `Boyer-Moore voting: a majority element appears more than n/2 times. Sweep once keeping a single candidate and a vote count — matching votes add, rival votes cancel, and the last one standing wins.`,
    {},
  );

  for (let i = 0; i < nums.length; i++) {
    const v = nums[i];
    let picked = false;
    if (count === 0) {
      cand = v;
      started = true;
      picked = true;
      emit(
        'PICK',
        `cand=${v}`,
        `The count hit 0, so the old candidate is fully cancelled. Adopt nums[${i}] = ${v} as the new candidate.`,
        { i, cand: v, count, picked: true, matched: true },
      );
    }
    if (v === cand) {
      count++;
      emit(
        'VOTE_UP',
        `count=${count}`,
        `nums[${i}] = ${v} matches the candidate ${cand}, so add one vote. count = ${count}.`,
        { i, cand, count, picked, matched: true },
        'good',
      );
    } else {
      count--;
      emit(
        'VOTE_DOWN',
        `count=${count}`,
        `nums[${i}] = ${v} disagrees with candidate ${cand}, so a rival cancels one vote. count = ${count}.`,
        { i, cand, count, picked, matched: false },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `majority=${cand}`,
    `The sweep is over and ${cand} is the last one standing — it is the majority element. Time O(n), Space O(1).`,
    { cand, count, done: true, result: cand },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<MajorityState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (s.done && s.result !== null && s.nums[i] === s.result) return 'found';
    if (s.i === i) return s.matched === false ? 'dead' : 'match';
    return '';
  };
  const stepLabel =
    s.i === null
      ? 'sweeping left → right'
      : s.matched === false
        ? `rival: ${s.nums[s.i]} ≠ ${s.cand} → count−1`
        : `support: ${s.nums[s.i]} = ${s.cand} → count+1`;
  return (
    <VizStage rail={<>
      <RailGroup label="vote">
        <RailStat k="cand" v={s.cand === null ? '—' : s.cand} tone="accent" />
        <RailStat k="count" v={s.count} />
      </RailGroup>
      <RailGroup label="step">
        <RailStat k="i" v={s.i ?? '—'} />
        <RailStat k="status" v={stepLabel} />
      </RailGroup>
      {s.result !== null && <RailResult label="majority" value={s.result} tone="good" />}
    </>}>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MajorityState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="candidate" v={s.cand ?? '—'} />
      <InspectorRow k="count" v={s.count} />
      <InspectorRow k="this step" v={s.i === null ? '—' : s.matched ? '+1 support' : '−1 rival'} />
      <InspectorRow k="result" v={s.result ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-find-majority-element';
export const title = 'Find majority element';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'me1', label: '[2,2,1,1,1,2,2]', value: { nums: [2, 2, 1, 1, 1, 2, 2] } },
    { id: 'me2', label: '[3,3,4,2,3,3,3]', value: { nums: [3, 3, 4, 2, 3, 3, 3] } },
  ] satisfies SampleInput<MajorityInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MajorityState | undefined;
    return s?.result !== null && s?.result !== undefined
      ? { ok: true, label: `majority = ${s.result}` }
      : { ok: false, label: 'none' };
  },
};

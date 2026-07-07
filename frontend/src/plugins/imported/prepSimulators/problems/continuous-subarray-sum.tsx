import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createPrepRecorder } from '../strictHelpers';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailStack,
  RailResult,
} from '../../../_shared/vizKit';

interface SubarrayInput {
  nums: number[];
  k: number;
}

interface SubarrayState {
  nums: number[];
  k: number;
  i: number | null; // current index being scanned
  num: number | null; // nums[i]!
  prefix: number | null; // running prefix sum mod k (normalised to [0,k))
  prev: number | null; // earlier index that shared this remainder
  map: [number, number][]; // remainder -> first index it appeared at
  window: [number, number] | null; // [prev+1, i] answer span
  result: boolean | null; // final answer
  done: boolean;
}

function record({ nums, k }: SubarrayInput): Frame<SubarrayState>[] {
  const modMap = new Map<number, number>([[0, -1]]);
  let prefix = 0;

  const { emit, frames } = createPrepRecorder<SubarrayState>(() => ({
    nums,
    k,
    i: null,
    num: null,
    prefix: null,
    prev: null,
    map: [...modMap.entries()],
    window: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `Continuous Subarray Sum: is there a subarray of length >= 2 whose sum is a multiple of ${k}? Key fact: sum(i+1..j) is a multiple of ${k} exactly when prefix[j]! % ${k} == prefix[i]! % ${k}. We seed the map with remainder 0 -> index -1 so a whole prefix that is itself a multiple counts.`,
    { prefix: 0 },
  );

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i]!;
    prefix = (prefix + num!) % k;
    if (prefix < 0) prefix += k;
    emit(
      'SCAN',
      `prefix%${k}=${prefix}`,
      `Add nums[${i}]! = ${num} to the running sum and take it mod ${k}: remainder is ${prefix}. Have we seen this remainder before?`,
      { i, num, prefix },
    );

    if (modMap.has(prefix)) {
      const prev = modMap.get(prefix)!;
      if (i - prev >= 2) {
        emit(
          'FOUND',
          `[${prev + 1}..${i}]`,
          `Yes — remainder ${prefix} first appeared at index ${prev}, and ${i} − ${prev} = ${i - prev} >= 2. So nums[${prev + 1}..${i}]! sums to a multiple of ${k}. Return true.`,
          { i, num, prefix, prev, window: [prev + 1, i], result: true, done: true },
          'good',
        );
        return frames;
      }
      emit(
        'TOOSHORT',
        `gap ${i - prev}<2`,
        `Remainder ${prefix} was last seen at index ${prev}, but ${i} − ${prev} = ${i - prev} < 2, so the subarray would have length 1. Keep the earlier index ${prev} (we want the first occurrence) and move on.`,
        { i, num, prefix, prev },
      );
    } else {
      modMap.set(prefix, i);
      emit(
        'STORE',
        `map[${prefix}]!=${i}`,
        `Remainder ${prefix} is new — record map[${prefix}]! = ${i} as its first occurrence so a later match can form a subarray back to here.`,
        { i, num, prefix },
      );
    }
  }

  emit(
    'DONE',
    'false',
    `Scanned every index without two equal remainders at least 2 apart — no subarray of length >= 2 sums to a multiple of ${k}. Return false.`,
    { result: false, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SubarrayState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'j', tone: 'accent', place: 'above' });
  if (s.prev !== null && s.prev >= 0)
    pointers.push({ i: s.prev, label: 'i', tone: 'good', place: 'below' });
  const tone = (i: number) => {
    if (s.window && i >= s.window[0]! && i <= s.window[1]!) return 'found';
    return s.i === i ? 'match' : '';
  };
  const mapItems = s.map.map(([rem, idx]) => `${rem}:${idx}`);
  return (
    <VizStage
      railWidth={150}
      rail={
        <>
          <RailGroup label="scan">
            <RailStat k="k" v={s.k} />
            <RailStat k="prefix%k" v={s.prefix ?? '—'} tone="accent" />
            <RailStat
              k="prev idx"
              v={s.prev ?? '—'}
              tone={s.prev !== null && s.prev >= 0 ? 'good' : undefined}
            />
          </RailGroup>
          <RailStack label="map (rem:idx)" items={mapItems} />
          {s.result !== null && (
            <RailResult
              label="answer"
              value={s.result ? 'true' : 'false'}
              tone={s.result ? 'good' : 'bad'}
            />
          )}
        </>
      }
    >
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={s.window} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SubarrayState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="j (index)" v={s.i ?? '—'} />
      <InspectorRow k="nums[j]!" v={s.num ?? '—'} />
      <InspectorRow k="prefix % k" v={s.prefix ?? '—'} />
      <InspectorRow k="first seen at" v={s.prev ?? '—'} />
      <InspectorRow k="map size" v={s.map.length} />
      <InspectorRow k="result" v={s.result === null ? '…' : s.result ? 'true' : 'false'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-prefix-sum-continuous-subarray-sum';
export const title = 'Continuous Subarray Sum';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Continuous Subarray Sum"?',
    choices: [
      {
        label: 'Prefix Sum Mod Map — fits this problem',
        correct: true,
      },
      {
        label: 'Prefix Sum Map — different approach',
      },
      {
        label: 'Difference Array + Prefix Sum — different approach',
      },
    ],
    explain:
      '`prefix[j]! - prefix[i]!` is a multiple of `k` iff `prefix[j]! % k == prefix[i]! % k`',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Continuous Subarray Sum), what strategy is established?',
    choices: [
      {
        label: '`prefix[j]! - prefix[i]!` is a multiple — described in INIT caption',
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
      'Continuous Subarray Sum: is there a subarray of length >= 2 whose sum is a multiple of ? Key fact: sum(i+1..j) is a multiple of  exactly when prefix[j]! %  == prefix[i]! % . We seed the map with remainder 0 -> index -1 so a whole prefix that is itself a multiple counts.',
  },
  {
    id: 'key-step',
    prompt: 'On the "TOOSHORT" step (gap <2), what happens?',
    choices: [
      {
        label: 'Remainder was last seen at index — this move caption',
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
      'Remainder  was last seen at index , but  −  =  < 2, so the subarray would have length 1. Keep the earlier index  (we want the first occurrence) and move on.',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'current index being scanned — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: current index being scanned',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Continuous Subarray Sum"?',
    choices: [
      {
        label: 'O(n) time, O(min(n,k)) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n+m) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(n). O(min(n,k)). `prefix[j]! - prefix[i]!` is a multiple of `k` iff `prefix[j]! % k == prefix[i]! % k`; Store first occurrence index of each `prefix % k` in a map; seed `{0: -1}` fo',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Remainder is new — record map[] — final DONE caption',
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
      'Remainder  is new — record map[] =  as its first occurrence so a later match can form a subarray back to here.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'css1', label: '[23,2,4,6,7], k=6', value: { nums: [23, 2, 4, 6, 7], k: 6 } },
    { id: 'css2', label: '[23,2,6,4,7], k=13', value: { nums: [23, 2, 6, 4, 7], k: 13 } },
  ] satisfies SampleInput<SubarrayInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SubarrayState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'true' : 'false' };
  },
};

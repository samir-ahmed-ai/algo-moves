import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import {
  ArrayPatternInspector,
  ArrayPatternView,
  type ArrayPointer,
} from '../../../_shared/arrayPatterns';
import {
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  VizEmpty,
  type TreeNode,
} from '../../../_shared/vizKit';

interface TwoSumInput {
  nums: number[];
  target: number;
}

interface TwoSumState {
  nums: number[];
  target: number;
  i: number | null; // current index
  need: number | null; // target - nums[i], the complement we look up
  seen: [number, number][]; // value -> index entries stored so far
  hit: number | null; // index the complement was found at
  result: [number, number] | null;
  done: boolean;
}

function record({ nums, target }: TwoSumInput): Frame<TwoSumState>[] {
  const seen = new Map<number, number>();
  const { emit, frames } = createRecorder<TwoSumState>(() => ({
    nums,
    target,
    i: null,
    need: null,
    seen: [...seen.entries()],
    hit: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `target=${target}`,
    `Two Sum: find two indices whose values add up to ${target}. Walk the array once, remembering each value in a hash map so we can look back for the complement target − v.`,
    {},
  );

  for (let i = 0; i < nums.length; i++) {
    const v = nums[i];
    const need = target - v;
    emit(
      'SCAN',
      `need ${need}`,
      `At index ${i} the value is ${v}, so we need its complement ${target} − ${v} = ${need}. Is ${need} already in the map?`,
      { i, need },
    );
    if (seen.has(need)) {
      const j = seen.get(need)!;
      emit(
        'FOUND',
        `${j},${i}`,
        `Yes — ${need} was stored at index ${j}. nums[${j}] + nums[${i}] = ${nums[j]} + ${v} = ${target}. Return [${j}, ${i}].`,
        { i, need, hit: j, result: [j, i], done: true },
        'good',
      );
      return frames;
    }
    seen.set(v, i);
    emit(
      'STORE',
      `seen[${v}]=${i}`,
      `${need} is not in the map yet, so remember the current value: seen[${v}] = ${i}. Move on.`,
      { i, need },
    );
  }

  emit(
    'DONE',
    'no pair',
    `Scanned the whole array with no complement match — there is no pair that sums to ${target}.`,
    { done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<TwoSumState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.hit !== null) pointers.push({ i: s.hit, label: 'j', tone: 'good', place: 'below' });
  const tone = (i: number) =>
    s.result && (i === s.result[0] || i === s.result[1]) ? 'found' : s.i === i ? 'match' : '';
  const seenItems = s.seen.map(([v, idx]) => `${v}:${idx}`);
  return (
    <ArrayPatternView
      values={s.nums}
      pointers={pointers}
      cellTone={tone}
      rail={
        <>
          <RailStack label="seen" items={seenItems} />
          <RailGroup label="scan">
            <RailStat k="target" v={s.target} />
            <RailStat k="i" v={s.i ?? '—'} tone="accent" />
            <RailStat k="need" v={s.need ?? '—'} />
          </RailGroup>
          {s.done && (
            <RailResult
              label="answer"
              value={s.result ? `[${s.result[0]}, ${s.result[1]}]` : 'none'}
              tone={s.result ? 'good' : 'bad'}
            />
          )}
        </>
      }
    />
  );
}

function Inspector({ frame }: InspectorProps<TwoSumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  // `seen` is a value -> index map: show it as an indented, multi-row tree
  // (one row per entry) instead of squeezing it onto a single flat line.
  const seenRows: TreeNode[] = s.seen.map(([v, idx]) => ({ k: `value ${v}`, v: `index ${idx}` }));
  return (
    <ArrayPatternInspector
      rows={[
        ['target', s.target],
        ['i', s.i ?? '—'],
        ['nums[i]', s.i !== null ? s.nums[s.i] : '—'],
        ['need (target−v)', s.need ?? '—'],
        ['seen', seenRows.length > 0 ? seenRows : 'empty'],
        ['result', s.result ? `[${s.result.join(', ')}]` : s.done ? 'none' : '…'],
      ]}
    />
  );
}

export const manifestId = 'prep-arrays-two-sum';
export const title = 'Two sum';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Two sum"?',
    choices: [
      {
        label: 'Hash map — fits this problem',
        correct: true,
      },
      {
        label: 'XOR + math — different approach',
      },
      {
        label: 'Prefix + suffix pass — different approach',
      },
      {
        label: 'Track min/max product — different approach',
      },
    ],
    explain: 'Map remembers value->index; look back for the complement',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Two sum), what strategy is established?',
    choices: [
      {
        label: 'Map remembers value->index; look back — described in INIT caption',
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
      'Two Sum: find two indices whose values add up to . Walk the array once, remembering each value in a hash map so we can look back for the complement target − v.',
  },
  {
    id: 'key-step',
    prompt: 'On the "FOUND" step (,), what happens?',
    choices: [
      {
        label: 'Yes — was stored at index — this move caption',
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
    explain: 'Yes —  was stored at index . nums[] + nums[] =  +  = . Return [, ].',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'current index — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: current index',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Two sum"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(n). want target-v in seen? return; else seen[v]=i',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'is not in the map yet — final DONE caption',
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
    explain: ' is not in the map yet, so remember the current value: seen[] = . Move on.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ts1', label: '[2,7,11,15] → 9', value: { nums: [2, 7, 11, 15], target: 9 } },
    { id: 'ts2', label: '[3,2,4] → 6', value: { nums: [3, 2, 4], target: 6 } },
  ] satisfies SampleInput<TwoSumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TwoSumState | undefined;
    return s?.result
      ? { ok: true, label: `[${s.result.join(',')}]` }
      : { ok: false, label: 'no pair' };
  },
};

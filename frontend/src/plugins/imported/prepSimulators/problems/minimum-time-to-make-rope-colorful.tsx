import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RopeInput {
  colors: string;
  neededTime: number[];
}

interface RopeState {
  colors: string; // the balloon colours, one char per cell
  neededTime: number[]; // removal cost of each balloon
  i: number | null; // balloon currently under inspection
  prev: number | null; // the previous balloon we compared against
  groupStart: number | null; // first index of the current same-colour run
  sum: number; // total cost of the current run so far
  mx: number; // largest single cost in the current run
  cost: number; // accumulated answer
  done: boolean;
}

function record({ colors, neededTime }: RopeInput): Frame<RopeState>[] {
  let cost = 0;
  let mx = neededTime[0];
  let sum = neededTime[0];
  let groupStart = 0;

  const { emit, frames } = createRecorder<RopeState>(() => ({
    colors,
    neededTime,
    i: null,
    prev: null,
    groupStart,
    sum,
    mx,
    cost,
    done: false,
  }));

  emit(
    'INIT',
    `n=${colors.length}`,
    `Make Rope Colorful: remove balloons so no two adjacent share a colour, at minimum total removal time. Greedily scan left to right — within each run of equal colours we must keep exactly one balloon, so we keep the costliest and pay for the rest.`,
    { i: 0, groupStart: 0 },
  );

  emit(
    'GROUP',
    `sum=${sum} max=${mx}`,
    `Start the first group at index 0 with colour '${colors[0]}'. Track the running cost sum (=${sum}) and the largest single cost max (=${mx}) inside this group.`,
    { i: 0, groupStart: 0 },
  );

  for (let i = 1; i < colors.length; i++) {
    if (colors[i] === colors[i - 1]) {
      sum += neededTime[i];
      const newMax = neededTime[i] > mx;
      if (neededTime[i] > mx) mx = neededTime[i];
      emit(
        'EXTEND',
        `sum=${sum} max=${mx}`,
        `Balloon ${i} is colour '${colors[i]}', same as balloon ${i - 1}. It joins the group: sum += ${neededTime[i]} → ${sum}. ${
          newMax
            ? `Its cost ${neededTime[i]} is the new max in this group.`
            : `Max stays ${mx} (${neededTime[i]} ≤ ${mx}).`
        }`,
        { i, prev: i - 1 },
      );
    } else {
      const paid = sum - mx;
      cost += paid;
      emit(
        'CLOSE',
        `+${paid} cost=${cost}`,
        `Balloon ${i} is colour '${colors[i]}', different from '${colors[i - 1]}'. The previous group closes: keep the costliest (max=${mx}) and remove the rest, paying sum − max = ${sum} − ${mx} = ${paid}. Running answer = ${cost}.`,
        { i, prev: i - 1 },
        paid > 0 ? 'good' : undefined,
      );
      sum = neededTime[i];
      mx = neededTime[i];
      groupStart = i;
      emit(
        'GROUP',
        `sum=${sum} max=${mx}`,
        `Open a new group at index ${i} with colour '${colors[i]}'. Reset sum = ${sum} and max = ${mx}.`,
        { i, groupStart: i },
      );
    }
  }

  const paidLast = sum - mx;
  cost += paidLast;
  emit(
    'CLOSE',
    `+${paidLast} cost=${cost}`,
    `The array ends, so close the final group: pay sum − max = ${sum} − ${mx} = ${paidLast}. Total minimum time = ${cost}.`,
    { i: colors.length - 1, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<RopeState>) {
  const s = frame.state;
  const chars = s.colors.split('');
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.groupStart !== null && s.groupStart !== s.i)
    pointers.push({ i: s.groupStart, label: 'grp', tone: 'good', place: 'below' });
  const win: [number, number] | null =
    s.groupStart !== null && s.i !== null && s.i >= s.groupStart ? [s.groupStart, s.i] : null;
  const tone = (idx: number) =>
    s.done
      ? 'found'
      : s.i === idx
        ? 'match'
        : win && idx >= win[0] && idx <= win[1]
          ? 'in-window'
          : '';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        group sum = <span className="font-mono text-ink">{s.sum}</span>
        {' · '}group max = <span className="font-mono text-ink">{s.mx}</span>
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        neededTime [{s.neededTime.join(', ')}]
      </div>
      <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink', vizText.base)}>
        {s.done ? '→ ' : ''}total time = {s.cost}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RopeState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="colors[i]" v={s.i !== null ? s.colors[s.i] : '—'} />
      <InspectorRow k="group start" v={s.groupStart ?? '—'} />
      <InspectorRow k="group sum" v={s.sum} />
      <InspectorRow k="group max" v={s.mx} />
      <InspectorRow k="cost" v={s.done ? `${s.cost} (final)` : s.cost} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-minimum-time-to-make-rope-colorful';
export const title = 'Minimum Time to Make Rope Colorful';

function computeMinCost(colors: string, neededTime: number[]): number {
  if (colors.length === 0) return 0;
  let cost = 0;
  let mx = neededTime[0];
  let sum = neededTime[0];
  for (let i = 1; i < colors.length; i++) {
    if (colors[i] === colors[i - 1]) {
      sum += neededTime[i];
      if (neededTime[i] > mx) mx = neededTime[i];
    } else {
      cost += sum - mx;
      sum = neededTime[i];
      mx = neededTime[i];
    }
  }
  cost += sum - mx;
  return cost;
}

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Minimum Time to Make Rope Colorful"?',
    choices: [
      {
        label: 'Greedy (keep max in group) — fits this problem',
        correct: true,
      },
      {
        label: 'Vertical scan — different approach',
      },
      {
        label: 'Double string trick — different approach',
      },
      {
        label: 'Index Map — different approach',
      },
    ],
    explain: 'See Minimum Time To Make Rope Colorful pattern',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Minimum Time to Make Rope Colorful), what strategy is established?',
    choices: [
      {
        label: 'See Minimum Time To Make Rope — described in INIT caption',
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
      'Make Rope Colorful: remove balloons so no two adjacent share a colour, at minimum total removal time. Greedily scan left to right — within each run of equal colours we must keep exactly one balloon, so we keep the costliest and pay for the rest.',
  },
  {
    id: 'key-step',
    prompt: 'On the "CLOSE" step (+ cost=), what happens?',
    choices: [
      {
        label: "Balloon is colour '', different — this move caption",
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
      "Balloon  is colour '', different from ''. The previous group closes: keep the costliest (max=) and remove the rest, paying sum − max =  −  = . Running answer = .",
  },
  {
    id: 'state',
    prompt: 'What does the `colors` field track in the visualization state?',
    choices: [
      {
        label: 'the balloon colours, one char — updated each frame',
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
    explain: 'The recorder keeps `colors` in sync: the balloon colours, one char per cell',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Minimum Time to Make Rope Colorful"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(a+b+c) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O( time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). Minimum Time To Make Rope Colorful',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The array ends, so close — final DONE caption',
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
      'The array ends, so close the final group: pay sum − max =  −  = . Total minimum time = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'rope1',
      label: '"aabaa" [1,2,3,4,1]',
      value: { colors: 'aabaa', neededTime: [1, 2, 3, 4, 1] },
    },
    {
      id: 'rope2',
      label: '"abc" [1,2,3]',
      value: { colors: 'abc', neededTime: [1, 2, 3] },
    },
  ] satisfies SampleInput<RopeInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RopeState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const answer = computeMinCost(s.colors, s.neededTime);
    return { ok: true, label: `min time = ${answer}` };
  },
};

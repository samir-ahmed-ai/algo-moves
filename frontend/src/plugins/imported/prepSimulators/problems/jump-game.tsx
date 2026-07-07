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

interface JumpGameInput {
  nums: number[];
}

interface JumpGameState {
  nums: number[];
  i: number | null; // current index being evaluated
  reach: number; // farthest index reachable so far
  candidate: number | null; // i + nums[i], the reach if we jump from i
  extended: boolean; // did this step push reach farther?
  result: boolean | null; // final verdict once computed
  done: boolean;
}

function record({ nums }: JumpGameInput): Frame<JumpGameState>[] {
  const last = nums.length - 1;
  let reach = 0;

  const { emit, frames } = createRecorder<JumpGameState>(() => ({
    nums,
    i: null,
    reach,
    candidate: null,
    extended: false,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `reach=0`,
    `Jump Game: each value nums[i] is the max jump length from index i. Greedily track reach — the farthest index we can get to. Start at index 0 with reach = 0, and only ever step onto indices we can already reach.`,
    {},
  );

  let i = 0;
  for (; i <= reach && i < nums.length; i++) {
    const candidate = i + nums[i];
    emit(
      'SCAN',
      `i=${i}, ${i}+${nums[i]}=${candidate}`,
      `Index ${i} is reachable (i = ${i} ≤ reach = ${reach}). From here we can jump up to nums[${i}] = ${nums[i]} steps, landing as far as ${i} + ${nums[i]} = ${candidate}.`,
      { i, candidate },
    );
    if (candidate > reach) {
      const prev = reach;
      reach = candidate;
      emit(
        'EXTEND',
        `reach ${prev}→${reach}`,
        `${candidate} is farther than the old reach ${prev}, so we stretch reach to ${reach}. We can now get to every index up through ${reach}.`,
        { i, candidate, reach, extended: true },
        'good',
      );
    } else {
      emit(
        'KEEP',
        `reach stays ${reach}`,
        `${candidate} does not beat the current reach ${reach}, so reach is unchanged. Move to the next reachable index.`,
        { i, candidate, reach },
      );
    }
  }

  const stoppedEarly = i <= last; // loop broke because i > reach before hitting the end
  const result = reach >= last;
  emit(
    'DONE',
    result ? 'reachable' : 'stuck',
    result
      ? `reach = ${reach} ≥ last index ${last}, so the last index is reachable. Return true.`
      : `The loop stopped at i = ${i}: index ${i} sits beyond reach = ${reach}${stoppedEarly ? ' (a 0 trapped us)' : ''}, and reach ${reach} < last index ${last}. The end is unreachable — return false.`,
    { i: result ? last : Math.min(i, last), reach, result, done: true },
    result ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<JumpGameState>) {
  const s = frame.state;
  const last = s.nums.length - 1;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const reachIdx = Math.min(s.reach, last);
  if (reachIdx >= 0) pointers.push({ i: reachIdx, label: 'reach', tone: 'good', place: 'below' });

  const tone = (idx: number) => {
    if (s.result !== null) {
      if (idx === last) return s.result ? 'found' : 'dead';
    }
    if (idx === s.i) return 'match';
    if (idx <= s.reach && idx <= last) return 'in-window';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        reach = <span className="font-mono text-ink">{s.reach}</span>
        {' · '}last index = <span className="font-mono text-ink">{last}</span>
        {s.candidate !== null && !s.done && (
          <>
            {' · '}i+nums[i] = <span className="font-mono text-ink">{s.candidate}</span>
          </>
        )}
      </div>
      <ArrayRow
        values={s.nums}
        cellTone={tone}
        pointers={pointers}
        windowRange={s.reach >= 0 ? [0, Math.min(s.reach, last)] : null}
      />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>shaded = indices reachable so far</div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono', vizText.base, s.result ? 'text-good' : 'text-bad')}>
          → {s.result ? 'true' : 'false'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<JumpGameState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const last = s.nums.length - 1;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="i + nums[i]" v={s.candidate ?? '—'} />
      <InspectorRow k="reach" v={s.reach} />
      <InspectorRow k="last index" v={last} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'true' : 'false'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-jump-game';
export const title = 'Jump game';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Jump game"?',
    choices: [
      {
        label: 'Greedy reach — fits this problem',
        correct: true,
      },
      {
        label: 'Track min/max product — different approach',
      },
      {
        label: 'Scan from right — different approach',
      },
      {
        label: 'Floyd cycle — different approach',
      },
    ],
    explain: 'Stretch the farthest reachable index as you walk',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Jump game), what strategy is established?',
    choices: [
      {
        label: 'Stretch the farthest reachable index — described in INIT caption',
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
      'Jump Game: each value nums[i] is the max jump length from index i. Greedily track reach — the farthest index we can get to. Start at index 0 with reach = 0, and only ever step onto indices we can already reach.',
  },
  {
    id: 'key-step',
    prompt: 'On the "EXTEND" step (reach →), what happens?',
    choices: [
      {
        label: 'is farther than the old reach — this move caption',
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
      ' is farther than the old reach , so we stretch reach to . We can now get to every index up through .',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'current index being evaluated — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: current index being evaluated',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Jump game"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). loop while i<=reach; reach=max(reach,i+nums[i])',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'does not beat the current reach — final DONE caption',
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
      ' does not beat the current reach , so reach is unchanged. Move to the next reachable index.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'jg1', label: '[2,3,1,1,4] → true', value: { nums: [2, 3, 1, 1, 4] } },
    { id: 'jg2', label: '[3,2,1,0,4] → false', value: { nums: [3, 2, 1, 0, 4] } },
  ] satisfies SampleInput<JumpGameInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as JumpGameState | undefined;
    const ok = s?.result ?? false;
    return { ok, label: ok ? 'reachable: true' : 'stuck: false' };
  },
};

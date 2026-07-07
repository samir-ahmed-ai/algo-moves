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

interface DupInput {
  nums: number[];
}

type Phase = 'init' | 'p1' | 'p2' | 'done';

interface DupState {
  nums: number[];
  slow: number; // tortoise index
  fast: number; // hare index
  phase: Phase;
  meetAt: number | null; // where slow == fast inside the cycle (phase 1)
  result: number | null; // the duplicate value (cycle entrance)
}

function record({ nums }: DupInput): Frame<DupState>[] {
  const { emit, frames } = createRecorder<DupState>(() => ({
    nums,
    slow: 0,
    fast: 0,
    phase: 'init',
    meetAt: null,
    result: null,
  }));

  // Treat each value as a "next index" pointer: i -> nums[i]. Because values are
  // in [1, n-1] and there are n entries, a duplicate forces a cycle, and the
  // cycle's entrance is the duplicated value.
  let slow = nums[0];
  let fast = nums[nums[0]];

  emit(
    'INIT',
    `slow=${slow} fast=${fast}`,
    `Find Duplicate (Floyd's tortoise & hare): read each value as a jump link i → nums[i]. A repeated value makes the chain loop, and the loop's entrance is the duplicate. Start slow one hop in (nums[0]=${slow}) and fast two hops in (nums[nums[0]]=${fast}).`,
    { slow, fast, phase: 'p1' },
  );

  // Phase 1: advance slow by 1 and fast by 2 until they collide inside the cycle.
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[nums[fast]];
    emit(
      'STEP1',
      `slow=${slow} fast=${fast}`,
      `Phase 1 — slow takes one hop (now at index ${slow}), fast takes two (now at index ${fast}). They have not collided yet, so keep racing.`,
      { slow, fast, phase: 'p1' },
    );
  }

  const meetAt = slow;
  emit(
    'MEET',
    `meet@${meetAt}`,
    `Phase 1 done — slow and fast collide at index ${meetAt}. This proves a cycle exists, but the meeting point is somewhere inside the loop, not necessarily its entrance.`,
    { slow, fast, phase: 'p1', meetAt },
    'good',
  );

  // Phase 2: reset slow to 0, then advance both by 1; they meet at the entrance.
  slow = 0;
  emit(
    'RESET',
    `slow=0`,
    `Phase 2 — reset slow back to the start (index 0). Now advance both pointers one hop at a time; the spot where they meet is the cycle's entrance, which is the duplicate value.`,
    { slow, fast, phase: 'p2', meetAt },
  );

  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
    emit(
      'STEP2',
      `slow=${slow} fast=${fast}`,
      `Phase 2 — both pointers take a single hop: slow → ${slow}, fast → ${fast}. Still apart, so keep stepping together.`,
      { slow, fast, phase: 'p2', meetAt },
    );
  }

  emit(
    'FOUND',
    `dup=${slow}`,
    `Phase 2 done — the pointers meet at index ${slow}. That index is the cycle entrance, so the duplicated number is ${slow}.`,
    { slow, fast, phase: 'done', meetAt, result: slow },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<DupState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.slow >= 0 && s.slow < s.nums.length)
    pointers.push({ i: s.slow, label: 'slow', tone: 'accent', place: 'above' });
  if (s.fast >= 0 && s.fast < s.nums.length)
    pointers.push({ i: s.fast, label: 'fast', tone: 'warn', place: 'below' });

  const tone = (i: number) => {
    if (s.result !== null && i === s.result) return 'found';
    if (s.slow === i && s.fast === i) return 'match';
    if (s.slow === i) return 'lo';
    if (s.fast === i) return 'hi';
    return '';
  };

  const phaseLabel =
    s.phase === 'p1'
      ? 'phase 1 · slow +1, fast +2'
      : s.phase === 'p2'
        ? 'phase 2 · both +1'
        : s.phase === 'done'
          ? 'done'
          : 'start';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        index → nums[index] jump links · <span className="font-mono text-ink">{phaseLabel}</span>
      </div>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        slow=<span className="text-ink">{s.slow}</span> · fast=
        <span className="text-ink">{s.fast}</span>
        {s.meetAt !== null && (
          <>
            {' · '}meet@<span className="text-ink">{s.meetAt}</span>
          </>
        )}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ duplicate = {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<DupState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="slow (index)" v={s.slow} />
      <InspectorRow k="fast (index)" v={s.fast} />
      <InspectorRow
        k="nums[slow]"
        v={s.slow >= 0 && s.slow < s.nums.length ? s.nums[s.slow] : '—'}
      />
      <InspectorRow k="meet point" v={s.meetAt ?? '—'} />
      <InspectorRow k="duplicate" v={s.result ?? (s.phase === 'done' ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-find-duplicate-number';
export const title = 'Find duplicate number';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find duplicate number"?',
    choices: [
      {
        label: 'Floyd cycle — fits this problem',
        correct: true,
      },
      {
        label: 'Heap + math — different approach',
      },
      {
        label: 'One pass min price — different approach',
      },
      {
        label: 'Two pointers swap — different approach',
      },
    ],
    explain: "Values are jump links; the cycle's entrance is the duplicate",
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Find duplicate number), what strategy is established?',
    choices: [
      {
        label: "Values are jump links; the cycle's — described in INIT caption",
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
      "Find Duplicate (Floyd's tortoise & hare): read each value as a jump link i → nums[i]. A repeated value makes the chain loop, and the loop's entrance is the duplicate. Start slow one hop in (nums[0]=) and fast two hops in (nums[nums[0]]=).",
  },
  {
    id: 'key-step',
    prompt: 'On the "RESET" step (slow=0), what happens?',
    choices: [
      {
        label: 'Phase 2 — reset slow back — this move caption',
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
      "Phase 2 — reset slow back to the start (index 0). Now advance both pointers one hop at a time; the spot where they meet is the cycle's entrance, which is the duplicate value.",
  },
  {
    id: 'state',
    prompt: 'What does the `slow` field track in the visualization state?',
    choices: [
      {
        label: 'tortoise index — updated each frame',
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
    explain: 'The recorder keeps `slow` in sync: tortoise index',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find duplicate number"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
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
    explain: 'O(n). O(1). phase1 slow/fast till meet; phase2 reset slow=0, step both by 1',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Phase 2 done — the pointers — final DONE caption',
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
      'Phase 2 done — the pointers meet at index . That index is the cycle entrance, so the duplicated number is .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'fd1',
      label: '[1,3,4,2,2]',
      value: { nums: [1, 3, 4, 2, 2] },
      hint: 'Jump links form a cycle; the entrance index is the duplicate value 2.',
    },
    {
      id: 'fd2',
      label: '[3,1,3,4,2]',
      value: { nums: [3, 1, 3, 4, 2] },
      hint: 'Two indices store 3 — Floyd finds it without extra memory.',
    },
  ] satisfies SampleInput<DupInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as DupState | undefined;
    return s?.result !== null && s?.result !== undefined
      ? { ok: true, label: `dup = ${s.result}` }
      : { ok: false, label: 'no duplicate' };
  },
};

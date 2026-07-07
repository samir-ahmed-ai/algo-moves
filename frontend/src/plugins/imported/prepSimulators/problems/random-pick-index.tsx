import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface PickIdxInput {
  nums: number[];
  target: number;
  /** Deterministic picks: each value is the random draw (0..cnt-1) for that target occurrence. */
  draws?: number[];
}

interface PickIdxState {
  nums: number[];
  target: number;
  i: number;
  cnt: number;
  res: number;
  op: string;
  picked: number | null;
  done: boolean;
}

function record({ nums, target, draws = [] }: PickIdxInput): Frame<PickIdxState>[] {
  let cnt = 0;
  let res = 0;
  let drawIdx = 0;

  const { emit, frames } = createRecorder<PickIdxState>(() => ({
    nums: [...nums],
    target,
    i: 0,
    cnt,
    res,
    op: '',
    picked: null,
    done: false,
  }));

  emit(
    'INIT',
    `target=${target}`,
    `Random Pick Index: reservoir sampling — for each nums[i]==target, cnt++; with prob 1/cnt replace res with i.`,
    {},
  );

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== target) continue;
    cnt++;
    const draw = draws[drawIdx] ?? 0;
    drawIdx++;
    const replace = draw === 0;
    if (replace) res = i;
    emit(
      'HIT',
      `i=${i} cnt=${cnt}`,
      `nums[${i}]=${target}: cnt→${cnt}. ${replace ? `draw=0 → res=${i}.` : `draw=${draw}≠0 → keep res=${res}.`}`,
      { i, cnt, res, op: `@${i} cnt=${cnt}`, picked: replace ? i : null },
      replace ? 'good' : undefined,
    );
  }

  emit(
    'DONE',
    `index ${res}`,
    `Pick(${target}) → index ${res} (uniform over ${cnt} occurrence(s)).`,
    { op: 'done', res, picked: res, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PickIdxState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        target = <span className="font-mono text-ink">{s.target}</span>
        {s.picked !== null && <span className="ml-2 font-mono text-good">picked @{s.picked}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {s.nums.map((v, i) => (
          <span
            key={i}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              v === s.target
                ? i === s.res
                  ? 'border-accent bg-accentbg text-accent'
                  : 'border-good text-good'
                : 'border-edge text-ink2',
            )}
          >
            {v}
          </span>
        ))}
      </div>
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink')}>
        cnt={s.cnt} · res={s.res}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<PickIdxState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target} />
      <InspectorRow k="cnt" v={s.cnt} />
      <InspectorRow k="res" v={s.res} />
      <InspectorRow k="i" v={s.i || '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-random-pick-index';
export const title = 'Random Pick Index';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Random Pick Index"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Bijective tiny URL encode/decode — different approach',
      },
      {
        label: 'Trie dictionary + spell suggest — different approach',
      },
      {
        label: 'Hash map + doubly linked list LRU — different approach',
      },
    ],
    explain: 'See Random Pick Index pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Random Pick Index), what strategy is established?',
    choices: [
      {
        label: 'See Random Pick Index pattern — described in INIT caption',
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
      'Random Pick Index: reservoir sampling — for each nums[i]==target, cnt++; with prob 1/cnt replace res with i.',
  },
  {
    id: 'key-step',
    prompt: 'On the "HIT" step (i= cnt=), what happens?',
    choices: [
      {
        label: 'nums[]=: cnt→. ${replace ? — this move caption',
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
    explain: 'nums[]=: cnt→. ${replace ? ',
  },
  {
    id: 'state',
    prompt: 'What does the `nums` field track in the visualization state?',
    choices: [
      {
        label: 'Field nums in state — updated each frame',
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
    explain:
      'The recorder snapshots `nums` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Pick() → index (uniform over — final DONE caption',
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
    explain: 'Pick() → index  (uniform over  occurrence(s)).',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'rpi1',
      label: '[1,2,3,3,3] target 3',
      value: { nums: [1, 2, 3, 3, 3], target: 3, draws: [0, 0, 1] },
    },
  ] satisfies SampleInput<PickIdxInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PickIdxState | undefined;
    return s?.done ? { ok: true, label: `index ${s.res}` } : { ok: false, label: 'incomplete' };
  },
};

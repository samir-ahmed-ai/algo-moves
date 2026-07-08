import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  vizText,
} from '../../../_shared/vizKit';

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

  const { emit, frames } = createPrepRecorder<PickIdxState>(() => ({
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
    `Random Pick Index: reservoir sampling — for each nums[i]!==target, cnt++; with prob 1/cnt replace res with i.`,
    {},
  );

  for (let i = 0; i < nums.length; i++) {
    if (nums[i]! !== target) continue;
    cnt++;
    const draw = draws[drawIdx]! ?? 0;
    drawIdx++;
    const replace = draw === 0;
    if (replace) res = i;
    emit(
      'HIT',
      `i=${i} cnt=${cnt}`,
      `nums[${i}]!=${target}: cnt→${cnt}. ${replace ? `draw=0 → res=${i}.` : `draw=${draw}≠0 → keep res=${res}.`}`,
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
  const rail = (
    <>
      <RailGroup label="pick">
        <RailStat k="target" v={s.target} tone="accent" />
        {s.picked !== null && <RailStat k="idx" v={s.picked} tone="good" />}
      </RailGroup>
      <RailGroup label="reservoir">
        <RailStat k="cnt" v={s.cnt} />
        <RailStat k="res" v={s.res} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
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
    </VizStage>
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
    prompt: 'How does Random Pick Index achieve uniform choice?',
    choices: [
      {
        label: 'Reservoir sampling — replace res with prob 1/cnt on each hit',
        correct: true,
      },
      {
        label: 'Prefix sum buckets — binary search random target draw',
      },
      {
        label: 'Sorted avail list — assign request to server i mod k',
      },
      {
        label: 'Lazy min/max heaps — pop stale timestamp entries',
      },
    ],
    explain:
      'Scanning target indices increments cnt; when draw is 0, res becomes the current index i.',
  },
  {
    id: 'key-step',
    prompt: 'On HIT when nums[i] equals target, when does res update?',
    choices: [
      {
        label: 'Deterministic draw equals zero — treat as 1/cnt acceptance',
        correct: true,
      },
      {
        label: 'Every hit always — res becomes latest matching index',
      },
      {
        label: 'Only first hit — ignore later equal target indices',
      },
      {
        label: 'When cnt is even — alternate updates on parity of cnt',
      },
    ],
    explain:
      'The demo uses draws[]; draw===0 means replace res with i, modeling uniform reservoir replacement.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space bounds for Random Pick Index?',
    choices: [
      {
        label: 'O(n) pick time, O(1) extra space — single pass with cnt/res',
        correct: true,
      },
      {
        label: 'O(log n) pick, O(n) space — prefix array of all indices',
      },
      {
        label: 'O(1) pick, O(n) space — precompute all target positions',
      },
      {
        label: 'O(n log n) pick, O(n) space — sort values before sampling',
      },
    ],
    explain:
      'One linear scan counts matches; only cnt and res are kept besides the input array snapshot.',
  },
  {
    id: 'edge',
    prompt: 'Which indices participate in the reservoir scan?',
    choices: [
      {
        label: 'Only i where nums[i] equals target — others are skipped',
        correct: true,
      },
      {
        label: 'Every array index — cnt increments on all positions',
      },
      {
        label: 'Endpoint targets alone — first and last index anchor sample',
      },
      {
        label: 'Random shuffle order — visit indices in permuted sequence',
      },
    ],
    explain:
      'The for-loop continues immediately when nums[i] differs from target, so cnt counts matches only.',
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

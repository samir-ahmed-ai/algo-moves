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

interface PickWInput {
  weights: number[];
  /** Deterministic targets in [1, sum] for each PickIndex call. */
  targets: number[];
}

interface PickWState {
  weights: number[];
  prefix: number[];
  target: number;
  picked: number;
  op: string;
  done: boolean;
}

function record({ weights, targets }: PickWInput): Frame<PickWState>[] {
  const prefix: number[] = [];
  for (let i = 0; i < weights.length; i++) {
    prefix.push(i === 0 ? weights[0]! : prefix[i - 1]! + weights[i]!);
  }
  const total = prefix[prefix.length - 1]!;

  const { emit, frames } = createPrepRecorder<PickWState>(() => ({
    weights: [...weights],
    prefix: prefix.slice(),
    target: 0,
    picked: -1,
    op: '',
    done: false,
  }));

  emit(
    'INIT',
    `sum=${total}`,
    `Random Pick with Weight: prefix sums define buckets. PickIndex draws target in [1,sum], binary search prefix for index.`,
    { prefix: prefix.slice() },
  );

  for (let t = 0; t < targets.length; t++) {
    const target = targets[t]!;
    let lo = 0;
    let hi = prefix.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (prefix[mid]! < target!) lo = mid + 1;
      else hi = mid;
    }
    const picked = lo;
    emit(
      'PICK',
      `target=${target} → ${picked}`,
      `PickIndex(): target=${target} in [1,${total}]. Binary search prefix → index ${picked} (weight ${weights[picked]!}).`,
      { target, picked, op: `pick → ${picked}` },
      'good',
    );
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<PickWState>) {
  const s = frame.state;
  const total = s.prefix[s.prefix.length - 1]! ?? 0;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.picked >= 0 && <RailStat k="idx" v={s.picked} tone="good" />}
      </RailGroup>
      <RailGroup label="draw">
        <RailStat k="sum" v={total} />
        {s.target > 0 && <RailStat k="target" v={s.target} />}
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="space-y-1">
        {s.weights.map((w, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-2 rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              i === s.picked ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            <span>i={i}</span>
            <span>w={w}</span>
            <span>prefix={s.prefix[i]!}</span>
          </div>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<PickWState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="target" v={s.target || '—'} />
      <InspectorRow k="picked" v={s.picked >= 0 ? s.picked : '—'} />
      <InspectorRow k="prefix" v={`[${s.prefix.join(', ')}]`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-random-pick-with-weight';
export const title = 'Random Pick with Weight';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does Random Pick with Weight map a draw to an index?',
    choices: [
      {
        label: 'Prefix sum buckets — binary search target in [1, total weight]',
        correct: true,
      },
      {
        label: 'Reservoir over indices — uniform among equal weights',
      },
      {
        label: 'Sorted interval merge — coverage query on numeric range',
      },
      {
        label: 'Jump array on line — skip painted cells for overlap',
      },
    ],
    explain:
      'prefix[i] holds cumulative weight; PickIndex draws target and binary-searches the first prefix ≥ target.',
  },
  {
    id: 'key-step',
    prompt: 'On PICK with target draw, how is the index chosen?',
    choices: [
      {
        label: 'Binary search prefix — smallest index with prefix[mid] ≥ target',
        correct: true,
      },
      {
        label: 'Linear scan weights — pick first w strictly greater than target',
      },
      {
        label: 'Hash target modulo n — map draw directly to index',
      },
      {
        label: 'Always index zero — ignore weights after prefix build',
      },
    ],
    explain:
      'Standard lower-bound binary search on prefix returns the bucket containing the random target.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for Random Pick with Weight?',
    choices: [
      {
        label: 'O(n) build, O(log n) pick, O(n) space — prefix array storage',
        correct: true,
      },
      {
        label: 'O(1) build and pick, O(1) space — no prefix preprocessing',
      },
      {
        label: 'O(n log n) every pick, O(n²) space — resort weights each draw',
      },
      {
        label: 'O(n) pick only, O(1) space — scan without prefix sums',
      },
    ],
    explain: 'Prefix construction is linear once; each pick is a logarithmic search on that array.',
  },
  {
    id: 'edge',
    prompt: 'What range must the random target fall into?',
    choices: [
      {
        label: 'Closed interval [1, sum of weights] — inclusive bucket draw',
        correct: true,
      },
      {
        label: '[0, n-1] index range — target is array index not weight mass',
      },
      {
        label: '[0, sum) half-open — zero never selected in any bucket',
      },
      {
        label: 'Any integer — modulo wraps targets outside total weight',
      },
    ],
    explain:
      'INIT states PickIndex draws target in [1, total] where total is the last prefix entry.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'rpw1',
      label: 'weights [1,3] · targets 1,4',
      value: { weights: [1, 3], targets: [1, 4] },
    },
  ] satisfies SampleInput<PickWInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PickWState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};

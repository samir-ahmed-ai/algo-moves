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

type SqOp = { kind: 'add'; point: [number, number] } | { kind: 'count'; point: [number, number] };

interface SqInput {
  ops: SqOp[];
}

interface SqState {
  points: [number, number][];
  counts: Record<string, number>;
  op: string;
  result: number | null;
  done: boolean;
}

const key = (p: [number, number]) => `${p[0]!},${p[1]!}`;

function record({ ops }: SqInput): Frame<SqState>[] {
  const counts: Record<string, number> = {};
  const pts: [number, number][] = [];

  const { emit, frames } = createPrepRecorder<SqState>(() => ({
    points: pts.map((p) => [...p] as [number, number]),
    counts: { ...counts },
    op: '',
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    'empty',
    `Detect Squares: store point counts. Count(q) sums cnt[p1]!×cnt[p2]! for diagonal pairs forming axis-aligned squares with q.`,
    {},
  );

  for (const o of ops) {
    if (o.kind === 'add') {
      const p = o.point;
      const k = key(p);
      counts[k]! = (counts[k]! ?? 0) + 1;
      pts.push(p);
      emit(
        'ADD',
        key(p),
        `Add(${p[0]!},${p[1]!}): count at point → ${counts[k]!}. Total stored points: ${pts.length}.`,
        { op: `add (${p[0]!},${p[1]!})` },
      );
    } else {
      const [qx, qy] = o.point;
      let res = 0;
      for (const p of pts) {
        const [px, py] = p;
        if (px === qx || Math.abs(px - qx) !== Math.abs(py - qy)) continue;
        res += (counts[key([px, qy]!)] ?? 0) * (counts[key([qx, py]!)] ?? 0);
      }
      emit(
        'COUNT',
        `(${qx},${qy}) → ${res}`,
        `Count(${qx},${qy}): scan diagonal partners p where |px-qx|=|py-qy| and px≠qx. Sum cnt[px,qy]!×cnt[qx,py]! = ${res}.`,
        { op: `count (${qx},${qy})`, result: res },
        'good',
      );
    }
  }

  emit('DONE', 'done', `Done.`, { op: 'done', done: true }, 'good');
  return frames;
}

function View({ frame }: PluginViewProps<SqState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.result !== null && (
        <RailGroup label="result">
          <RailStat k="val" v={s.result} tone="good" />
        </RailGroup>
      )}
      <RailGroup label="points">
        <RailStat k="count" v={s.points.length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
        {Object.entries(s.counts).map(([k, c]) => (
          <span
            key={k}
            className={cn('rounded border border-edge px-2 py-0.5 font-mono', vizText.sm)}
          >
            ({k})×{c}
          </span>
        ))}
        {Object.keys(s.counts).length === 0 && (
          <span className={cn(vizText.sm, 'text-ink3')}>empty</span>
        )}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SqState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="points" v={s.points.length} />
      <InspectorRow k="result" v={s.result ?? '—'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-detect-squares';
export const title = 'Detect Squares';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does Detect Squares store and query points?',
    choices: [
      {
        label: 'Point count map — tally repeats at each coordinate key',
        correct: true,
      },
      {
        label: 'Sorted interval merge — union of painted segments',
      },
      {
        label: 'Dual heap median — split stream into low and high halves',
      },
      {
        label: 'Postfix node stack — build expression tree bottom-up',
      },
    ],
    explain: 'counts maps "x,y" to frequency; Count sums products of diagonal partner counts.',
  },
  {
    id: 'key-step',
    prompt: 'On COUNT(q), how is the answer computed?',
    choices: [
      {
        label: 'Scan diagonal partners p — add cnt[p1]×cnt[p2] when |dx|=|dy|',
        correct: true,
      },
      {
        label: 'Sort all points — binary search axis-aligned square corners',
      },
      {
        label: 'DFS four corners — enumerate every 4-point combination',
      },
      {
        label: 'Hash only query point — ignore stored partner coordinates',
      },
    ],
    explain:
      'For each stored point p forming a diagonal with q, multiply counts at the two completing corners.',
  },
  {
    id: 'complexity',
    prompt: 'What are typical bounds for Detect Squares?',
    choices: [
      {
        label: 'O(points) per count, O(points) space — scan stored list',
        correct: true,
      },
      {
        label: 'O(1) count always, O(1) space — constant lookup table',
      },
      {
        label: 'O(log n) count, O(n) space — interval binary search',
      },
      {
        label: 'O(n log n) add, O(1) space — resort coordinates each add',
      },
    ],
    explain: 'Count iterates all stored points; Add is O(1) map update plus append to pts.',
  },
  {
    id: 'edge',
    prompt: 'Which pairs are skipped when scanning for squares with query q?',
    choices: [
      {
        label: 'Same x as q or unequal |dx| and |dy| — not a diagonal partner',
        correct: true,
      },
      {
        label: 'Points with count zero — already removed from map entries',
      },
      {
        label: 'All points below q.y — only upper half-plane considered',
      },
      {
        label: 'Duplicate coordinates — second copy never counted again',
      },
    ],
    explain: 'The loop continues when px equals qx or when absolute row and column deltas differ.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'sq1',
      label: 'square from 4 corners',
      value: {
        ops: [
          { kind: 'add', point: [0, 0] },
          { kind: 'add', point: [0, 1] },
          { kind: 'add', point: [1, 0] },
          { kind: 'count', point: [1, 1] },
        ],
      },
    },
  ] satisfies SampleInput<SqInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SqState | undefined;
    return s?.done ? { ok: true, label: 'done' } : { ok: false, label: 'incomplete' };
  },
};

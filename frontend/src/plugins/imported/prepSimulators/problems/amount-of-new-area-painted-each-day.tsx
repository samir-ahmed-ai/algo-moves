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
  RailStack,
  vizText,
} from '../../../_shared/vizKit';

interface PaintInput {
  paint: [number, number][];
}

interface PaintState {
  maxR: number;
  jump: number[];
  results: number[];
  day: number;
  newCount: number;
  op: string;
  done: boolean;
}

function record({ paint }: PaintInput): Frame<PaintState>[] {
  let maxR = 0;
  for (const [, r] of paint) if (r > maxR) maxR = r;
  const jump = new Array(maxR + 1).fill(0);
  const results: number[] = [];

  const { emit, frames } = createPrepRecorder<PaintState>(() => ({
    maxR,
    jump: jump.slice(),
    results: results.slice(),
    day: 0,
    newCount: 0,
    op: '',
    done: false,
  }));

  emit(
    'INIT',
    `${paint.length} days`,
    `Amount of New Area Painted Each Day: jump[] skips already-painted segments. For each [l,r), walk with jump pointers — count only cells where jump[i]!==0 (fresh paint).`,
    {},
  );

  for (let day = 0; day < paint.length; day++) {
    const [l, r] = paint[day]!;
    let cnt = 0;
    let i = l;
    while (i < r) {
      if (jump[i]! === 0) {
        jump[i]! = i + 1;
        cnt++;
        i++;
      } else {
        const next = jump[i]!;
        jump[i]! = r;
        i = next;
      }
    }
    results.push(cnt);
    emit(
      'PAINT',
      `day ${day + 1}: [${l},${r}) → ${cnt}`,
      `Day ${day + 1}: paint [${l}, ${r}). Jump-pointer walk finds ${cnt} newly painted cell(s). Overlaps skip via jump[i]!=r.`,
      { day: day + 1, newCount: cnt, op: `[${l},${r}) → ${cnt}` },
      'good',
    );
  }

  emit(
    'DONE',
    results.join(', '),
    `Done. New area per day: [${results.join(', ')}].`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<PaintState>) {
  const s = frame.state;
  const painted = s.jump.filter((v, i) => v > i).length;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.day > 0 && <RailStat k="day" v={`+${s.newCount}`} tone="good" />}
      </RailGroup>
      <RailGroup label="line">
        <RailStat k="range" v={`[0..${s.maxR})`} />
        <RailStat k="painted" v={painted} />
      </RailGroup>
      {s.results.length > 0 && <RailStack label="results" items={s.results.map(String)} />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="mt-1 flex flex-wrap gap-0.5">
        {Array.from({ length: Math.min(s.maxR, 40) }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-4 w-3 rounded-sm border',
              vizText.sm,
              s.jump[i]! > i ? 'border-accent bg-accentbg' : 'border-edge bg-surface2',
            )}
            title={`${i}`}
          />
        ))}
        {s.maxR > 40 && <span className={cn(vizText.sm, 'text-ink3')}>…</span>}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<PaintState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="day" v={s.day || '—'} />
      <InspectorRow k="new area" v={s.newCount || '—'} />
      <InspectorRow k="results" v={s.results.length ? `[${s.results.join(', ')}]` : '—'} />
      <InspectorRow k="maxR" v={s.maxR} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-amount-of-new-area-painted-each-day';
export const title = 'Amount of New Area Painted Each Day';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which technique counts newly painted area each day?',
    choices: [
      {
        label: 'Jump-pointer array — skip cells already painted on the line',
        correct: true,
      },
      {
        label: 'Sorted merged intervals — AddRange merges overlaps',
      },
      {
        label: 'Copy-on-write snapshots — versioned map per paint stroke',
      },
      {
        label: 'Reservoir sampling — uniform pick among painted indices',
      },
    ],
    explain:
      'jump[i] links forward across painted runs so each cell is charged to the first day covering it.',
  },
  {
    id: 'key-step',
    prompt: 'During PAINT on interval [l, r), when is a cell counted as new?',
    choices: [
      {
        label: 'jump[i] is zero — first time cell i receives paint',
        correct: true,
      },
      {
        label: 'i equals l always — only left endpoint counts once',
      },
      {
        label: 'jump[i] equals r — cell touched by current right boundary',
      },
      {
        label: 'Every index in range — overlap days still add full width',
      },
    ],
    explain:
      'Fresh cells have jump[i]===0; painted cells redirect i via jump[i] to skip overlapping coverage.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space bounds for this paint problem?',
    choices: [
      {
        label: 'O(total newly painted) time, O(maxR) space — jump array size',
        correct: true,
      },
      {
        label: 'O(days × maxR) worst paint, O(1) space — no auxiliary array',
      },
      {
        label: 'O(log maxR) per day, O(days) space — heap of intervals',
      },
      {
        label: 'O(1) per day always, O(paints) space — hash each cell only',
      },
    ],
    explain:
      'Each cell is visited at most once when first painted; jump array spans coordinates up to maxR.',
  },
  {
    id: 'edge',
    prompt: 'When walk hits an already-painted cell inside [l, r), what happens?',
    choices: [
      {
        label: 'Follow jump[i] forward — no increment to new area count',
        correct: true,
      },
      {
        label: 'Count again — overlapping days double-charge the cell',
      },
      {
        label: 'Abort the day — stop painting remainder of interval',
      },
      {
        label: 'Reset jump[i] to zero — erase prior paint marker',
      },
    ],
    explain:
      'Non-zero jump[i] means already painted; the loop sets jump[i]=r and jumps to the next index.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'paint1',
      label: '[[1,4],[2,5]]',
      value: {
        paint: [
          [1, 4],
          [2, 5],
        ],
      },
    },
    {
      id: 'paint2',
      label: '[[1,4],[4,7]]',
      value: {
        paint: [
          [1, 4],
          [4, 7],
        ],
      },
    },
  ] satisfies SampleInput<PaintInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as PaintState | undefined;
    return s?.done
      ? { ok: true, label: `[${s.results.join(', ')}]` }
      : { ok: false, label: 'incomplete' };
  },
};

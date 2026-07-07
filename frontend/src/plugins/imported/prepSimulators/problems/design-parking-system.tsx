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

interface ParkingInput {
  big: number;
  medium: number;
  small: number;
  cars: number[];
}

interface ParkingState {
  slots: [number, number, number, number];
  op: string;
  carType: number | null;
  allowed: boolean | null;
  done: boolean;
}

const TYPE_LABELS = ['', 'big', 'medium', 'small'];

function record({ big, medium, small, cars }: ParkingInput): Frame<ParkingState>[] {
  const slots: [number, number, number, number] = [0, big, medium, small];

  const { emit, frames } = createRecorder<ParkingState>(() => ({
    slots: [...slots] as [number, number, number, number],
    op: '',
    carType: null,
    allowed: null,
    done: false,
  }));

  emit(
    'INIT',
    `big=${big} med=${medium} sm=${small}`,
    `Parking System: slots[1..3] track remaining big/medium/small spots. AddCar(type) decrements if available.`,
    {},
  );

  for (const carType of cars) {
    const label = TYPE_LABELS[carType] ?? `type${carType}`;
    if (slots[carType] > 0) {
      slots[carType]--;
      emit(
        'ADD',
        `${label} ok`,
        `AddCar(${carType}=${label}): slot available (${slots[carType] + 1} → ${slots[carType]}) → return true.`,
        { op: `AddCar(${label})`, carType, allowed: true },
        'good',
      );
    } else {
      emit(
        'REJECT',
        `${label} full`,
        `AddCar(${carType}=${label}): no ${label} spots left → return false.`,
        { op: `AddCar(${label})`, carType, allowed: false },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `left ${slots[1]}/${slots[2]}/${slots[3]}`,
    `Done. Remaining: big=${slots[1]}, medium=${slots[2]}, small=${slots[3]}.`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ParkingState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.allowed !== null && (
          <span className={cn('ml-2 font-mono', s.allowed ? 'text-good' : 'text-bad')}>
            → {s.allowed ? 'true' : 'false'}
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-3">
        {(['big', 'medium', 'small'] as const).map((label, i) => (
          <div
            key={label}
            className={cn(
              'rounded border px-3 py-1 font-mono',
              vizText.sm,
              s.carType === i + 1 ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            {label}: {s.slots[i + 1]}
          </div>
        ))}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ParkingState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="big left" v={s.slots[1]} />
      <InspectorRow k="medium left" v={s.slots[2]} />
      <InspectorRow k="small left" v={s.slots[3]} />
      <InspectorRow k="result" v={s.allowed === null ? '—' : s.allowed ? 'true' : 'false'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-design-parking-system';
export const title = 'Design Parking System';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Design Parking System"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Two Heaps — different approach',
      },
      {
        label: 'Round-robin load balancer — different approach',
      },
      {
        label: 'Bijective tiny URL encode/decode — different approach',
      },
    ],
    explain: 'See Design Parking System pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Design Parking System), what strategy is established?',
    choices: [
      {
        label: 'See Design Parking System pattern — described in INIT caption',
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
      'Parking System: slots[1..3] track remaining big/medium/small spots. AddCar(type) decrements if available.',
  },
  {
    id: 'key-step',
    prompt: 'On the "REJECT" step ( full), what happens?',
    choices: [
      {
        label: 'AddCar(=): no spots left → return — this move caption',
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
    explain: 'AddCar(=): no  spots left → return false.',
  },
  {
    id: 'state',
    prompt: 'What does the `slots` field track in the visualization state?',
    choices: [
      {
        label: 'Field slots in state — updated each frame',
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
      'The recorder snapshots `slots` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Done. Remaining: big=, medium=, small=. — final DONE caption',
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
    explain: 'Done. Remaining: big=, medium=, small=.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'park1',
      label: '1,1,0 · big,medium,big,small',
      value: { big: 1, medium: 1, small: 0, cars: [1, 2, 1, 3] },
    },
  ] satisfies SampleInput<ParkingInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ParkingState | undefined;
    return s?.done
      ? { ok: true, label: `${s.slots[1]}/${s.slots[2]}/${s.slots[3]} left` }
      : { ok: false, label: 'incomplete' };
  },
};

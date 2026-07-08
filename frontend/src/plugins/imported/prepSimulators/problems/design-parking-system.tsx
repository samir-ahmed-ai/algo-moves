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

  const { emit, frames } = createPrepRecorder<ParkingState>(() => ({
    slots: [...slots] as [number, number, number, number],
    op: '',
    carType: null,
    allowed: null,
    done: false,
  }));

  emit(
    'INIT',
    `big=${big} med=${medium} sm=${small}`,
    `Parking System: slots[1..3]! track remaining big/medium/small spots. AddCar(type) decrements if available.`,
    {},
  );

  for (const carType of cars) {
    const label = TYPE_LABELS[carType]! ?? `type${carType}`;
    if (slots[carType]! > 0) {
      slots[carType]!--;
      emit(
        'ADD',
        `${label} ok`,
        `AddCar(${carType}=${label}): slot available (${slots[carType]! + 1} → ${slots[carType]!}) → return true.`,
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
    `left ${slots[1]!}/${slots[2]!}/${slots[3]!}`,
    `Done. Remaining: big=${slots[1]!}, medium=${slots[2]!}, small=${slots[3]!}.`,
    { op: 'done', done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ParkingState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
      </RailGroup>
      {s.allowed !== null && (
        <RailGroup label="result">
          <RailStat k="ok" v={s.allowed ? 'true' : 'false'} tone={s.allowed ? 'good' : 'bad'} />
        </RailGroup>
      )}
      <RailGroup label="slots">
        <RailStat k="big" v={s.slots[1]!} />
        <RailStat k="med" v={s.slots[2]!} />
        <RailStat k="sm" v={s.slots[3]!} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex gap-3">
        {(['big', 'medium', 'small'] as const).map((label, i) => (
          <div
            key={label}
            className={cn(
              'rounded border px-3 py-1 font-mono',
              vizText.sm,
              s.carType === i + 1 ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            {label}: {s.slots[i + 1]!}
          </div>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<ParkingState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="op" v={s.op || '—'} />
      <InspectorRow k="big left" v={s.slots[1]!} />
      <InspectorRow k="medium left" v={s.slots[2]!} />
      <InspectorRow k="small left" v={s.slots[3]!} />
      <InspectorRow k="result" v={s.allowed === null ? '—' : s.allowed ? 'true' : 'false'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-design-parking-system';
export const title = 'Design Parking System';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'How does the parking system track availability?',
    choices: [
      {
        label: 'Per-type slot counters — big medium small remaining counts',
        correct: true,
      },
      {
        label: 'Sorted interval timeline — book half-open parking spans',
      },
      {
        label: 'Round-robin stall index — cycle physical spot ids',
      },
      {
        label: 'Lazy min/max heaps — stale timestamp cleanup on query',
      },
    ],
    explain: 'slots[1..3] initialize to capacities; AddCar(type) decrements when a spot exists.',
  },
  {
    id: 'key-step',
    prompt: 'On successful AddCar when slots[type] > 0, what happens?',
    choices: [
      {
        label: 'Decrement slots[type] — emit allowed true for that car type',
        correct: true,
      },
      {
        label: 'Increment slots[type] — counters grow when car enters',
      },
      {
        label: 'Reset all slots — reinitialize capacities after each car',
      },
      {
        label: 'Reject always — return false even when spots remain',
      },
    ],
    explain:
      'Successful AddCar decrements the matching type counter and returns true in the ADD frame.',
  },
  {
    id: 'complexity',
    prompt: 'What are the bounds for Design Parking System?',
    choices: [
      {
        label: 'O(1) per AddCar, O(1) space — three integer counters',
        correct: true,
      },
      {
        label: 'O(n) per car, O(n) space — list of occupied stall ids',
      },
      {
        label: 'O(log n) per car, O(n) space — heap of free stall numbers',
      },
      {
        label: 'O(cars) setup, O(1) space — no state beyond input array',
      },
    ],
    explain:
      'Each car checks one counter and optionally decrements; storage is fixed three slot counts.',
  },
  {
    id: 'edge',
    prompt: 'What happens on AddCar when the requested type has zero slots left?',
    choices: [
      {
        label: 'REJECT frame — return false without changing counters',
        correct: true,
      },
      {
        label: 'Borrow from other type — steal medium spot for big car',
      },
      {
        label: 'Wrap to type 1 — reuse big counter when small empty',
      },
      {
        label: 'Allow anyway — negative counters represent overbooking',
      },
    ],
    explain:
      'When slots[carType]===0 the recorder emits REJECT with allowed false and leaves counts unchanged.',
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
      ? { ok: true, label: `${s.slots[1]!}/${s.slots[2]!}/${s.slots[3]!} left` }
      : { ok: false, label: 'incomplete' };
  },
};

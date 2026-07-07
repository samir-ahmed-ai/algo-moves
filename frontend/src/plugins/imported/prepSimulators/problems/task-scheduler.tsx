import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface TaskSchedulerInput {
  tasks: string[];
  n: number;
}

interface TaskSchedulerState {
  tasks: string[];
  n: number;
  i: number | null; // index currently being counted
  freq: [string, number][]; // value -> running frequency
  maxF: number; // highest frequency seen so far
  cntMax: number | null; // how many tasks tie at maxF
  idle: number | null; // (maxF-1)*n + cntMax
  result: number | null; // final answer
  done: boolean;
}

function record({ tasks, n }: TaskSchedulerInput): Frame<TaskSchedulerState>[] {
  const freq = new Map<string, number>();
  let maxF = 0;

  const { emit, frames } = createPrepRecorder<TaskSchedulerState>(() => ({
    tasks,
    n,
    i: null,
    freq: [...freq.entries()],
    maxF,
    cntMax: null,
    idle: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Task Scheduler: identical tasks must be separated by a cooldown of ${n} slots. Instead of simulating the schedule, we use the math trick: the most frequent task forces a skeleton of gaps that every other task slots into.`,
    {},
  );

  // Phase 1: count frequencies, track the running max.
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]!;
    freq.set(t!, (freq.get(t!) ?? 0) + 1);
    const f = freq.get(t!)!;
    if (f > maxF) maxF = f;
    emit(
      'COUNT',
      `freq[${t}]!=${f}`,
      `Count task '${t}' at index ${i}: its frequency is now ${f}. The highest frequency seen so far is maxF = ${maxF}.`,
      { i, maxF },
    );
  }

  // Phase 2: count how many tasks tie at the maximum frequency.
  let cntMax = 0;
  for (const f of freq.values()) {
    if (f === maxF) cntMax++;
  }
  emit(
    'TIES',
    `cntMax=${cntMax}`,
    `The maximum frequency is ${maxF}. ${cntMax} distinct task${cntMax === 1 ? '' : 's'} occur${cntMax === 1 ? 's' : ''} that many times — these all share the last row of the schedule, so they extend the final block by cntMax = ${cntMax}.`,
    { maxF, cntMax },
  );

  // Phase 3: the cooldown-grid formula.
  const idle = (maxF - 1) * n + cntMax;
  emit(
    'FORMULA',
    `idle=${idle}`,
    `Lay the busiest task (${maxF} copies) as ${maxF - 1} full rows of width n+1, then add the tied tasks on the last row: idle = (maxF−1)·n + cntMax = (${maxF}−1)·${n} + ${cntMax} = ${idle}. This is the schedule length when cooldown gaps dominate.`,
    { maxF, cntMax, idle },
  );

  // Phase 4: compare against the raw task count (no idle needed if dense enough).
  const answer = idle < tasks.length ? tasks.length : idle;
  if (idle < tasks.length) {
    emit(
      'PICK',
      `len=${tasks.length}`,
      `idle (${idle}) is less than the number of tasks (${tasks.length}), meaning there are enough distinct tasks to fill every cooldown gap with no waiting. The answer is just len(tasks) = ${tasks.length}.`,
      { maxF, cntMax, idle, result: answer, done: true },
      'good',
    );
  } else {
    emit(
      'PICK',
      `idle=${idle}`,
      `idle (${idle}) is at least len(tasks) (${tasks.length}), so cooldown gaps force the CPU to wait. The answer is the grid size, ${idle}.`,
      { maxF, cntMax, idle, result: answer, done: true },
      'good',
    );
  }

  return frames;
}

function View({ frame }: PluginViewProps<TaskSchedulerState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');
  const freqLine = s.freq.length === 0 ? '∅' : s.freq.map(([v, f]) => `${v}:${f}`).join(', ');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        cooldown n = <span className="font-mono text-ink">{s.n}</span>
        {' · '}maxF = <span className="font-mono text-ink">{s.maxF}</span>
        {s.cntMax !== null && (
          <>
            {' · '}cntMax = <span className="font-mono text-ink">{s.cntMax}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.tasks} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        freq {'{'}
        {freqLine}
        {'}'}
      </div>
      {s.idle !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
          idle = (maxF−1)·n + cntMax = ({s.maxF}−1)·{s.n} + {s.cntMax} ={' '}
          <span className="text-ink">{s.idle}</span>
        </div>
      )}
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → max(len={s.tasks.length}, idle={s.idle}) = {s.result}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<TaskSchedulerState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (cooldown)" v={s.n} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="distinct tasks" v={s.freq.length} />
      <InspectorRow k="maxF" v={s.maxF} />
      <InspectorRow k="cntMax" v={s.cntMax ?? '—'} />
      <InspectorRow k="idle" v={s.idle ?? '—'} />
      <InspectorRow k="len(tasks)" v={s.tasks.length} />
      <InspectorRow k="answer" v={s.result ?? (s.done ? 0 : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-task-scheduler';
export const title = 'Task scheduler';

function computeAnswer(tasks: string[], n: number): number {
  const freq = new Map<string, number>();
  let maxF = 0;
  for (const t of tasks) {
    const f = (freq.get(t) ?? 0) + 1;
    freq.set(t, f);
    if (f > maxF) maxF = f;
  }
  let cntMax = 0;
  for (const f of freq.values()) if (f === maxF) cntMax++;
  const idle = (maxF - 1) * n + cntMax;
  return idle < tasks.length ? tasks.length : idle;
}

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Task scheduler"?',
    choices: [
      {
        label: 'Heap + math — fits this problem',
        correct: true,
      },
      {
        label: 'Two pointers — different approach',
      },
      {
        label: 'Monotonic stack — different approach',
      },
      {
        label: 'Reverse segments — different approach',
      },
    ],
    explain: 'Hottest task lays a grid of (maxF-1) cooldown gaps to fill',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Task scheduler), what strategy is established?',
    choices: [
      {
        label: 'Hottest task lays a grid — described in INIT caption',
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
      'Task Scheduler: identical tasks must be separated by a cooldown of  slots. Instead of simulating the schedule, we use the math trick: the most frequent task forces a skeleton of gaps that every other task slots into.',
  },
  {
    id: 'key-step',
    prompt: 'On the "FORMULA" step (idle=), what happens?',
    choices: [
      {
        label: 'Lay the busiest task ( copies) — this move caption',
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
      'Lay the busiest task ( copies) as  full rows of width n+1, then add the tied tasks on the last row: idle = (maxF−1)·n + cntMax = (−1)· +  = . This is the schedule length when cooldown gaps dominate.',
  },
  {
    id: 'state',
    prompt: 'What does the `i` field track in the visualization state?',
    choices: [
      {
        label: 'index currently being counted — updated each frame',
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
    explain: 'The recorder keeps `i` in sync: index currently being counted',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Task scheduler"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n+m) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(n²) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). idle=(maxF-1)*n+countMax; ans=max(len(tasks),idle)',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'idle () is at least len(tasks) — final DONE caption',
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
      'idle () is at least len(tasks) (), so cooldown gaps force the CPU to wait. The answer is the grid size, .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'tsk1',
      label: "['A','A','A','B','B','B'], n=2",
      value: { tasks: ['A', 'A', 'A', 'B', 'B', 'B'], n: 2 },
    },
    {
      id: 'tsk2',
      label: "['A','A','A','B','C','D'], n=2",
      value: { tasks: ['A', 'A', 'A', 'B', 'C', 'D'], n: 2 },
    },
  ] satisfies SampleInput<TaskSchedulerInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TaskSchedulerState | undefined;
    const answer = s ? computeAnswer(s.tasks, s.n) : 0;
    return { ok: true, label: `${answer} intervals` };
  },
};

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
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';
import { QueueTape } from '../../../../components/board/QueueTape';

type OpKind = 'enq' | 'deq' | 'max';

interface Op {
  kind: OpKind;
  val?: number; // present for enqueue
}

interface QueueMaxInput {
  ops: Op[];
}

interface QueueMaxState {
  queue: number[]; // FIFO, front at index 0
  maxDQ: number[]; // decreasing deque, front (= current max) at index 0
  highlightQueueBack: boolean; // ring the just-pushed queue back
  poppedTail: number | null; // maxDQ tail just dropped by enqueue
  currentMax: number | null; // result of a Max() query (or live front)
  output: number | null; // value returned by Dequeue / Max
  opLabel: string; // human-readable current operation
  done: boolean;
}

function record({ ops }: QueueMaxInput): Frame<QueueMaxState>[] {
  const queue: number[] = [];
  const maxDQ: number[] = [];

  const { emit, frames } = createPrepRecorder<QueueMaxState>(() => ({
    queue: queue.slice(),
    maxDQ: maxDQ.slice(),
    highlightQueueBack: false,
    poppedTail: null,
    currentMax: maxDQ.length > 0 ? maxDQ[0]! : null,
    output: null,
    opLabel: '',
    done: false,
  }));

  emit(
    'INIT',
    'empty',
    'Queue-with-max: a normal FIFO queue, shadowed by a decreasing deque whose front is always the current maximum. We replay a sequence of operations and watch both structures evolve.',
    { opLabel: 'start' },
  );

  for (const op of ops) {
    if (op.kind === 'enq') {
      const val = op.val ?? 0;
      const label = `Enqueue(${val})`;
      queue.push(val);
      emit(
        'ENQ_PUSH',
        `queue ← ${val}`,
        `${label}: append ${val} to the back of the FIFO queue. Now we must fix the max-deque so its front still holds the largest live value.`,
        { opLabel: label, highlightQueueBack: true },
      );

      while (maxDQ.length > 0 && maxDQ[maxDQ.length - 1]! < val) {
        const dropped = maxDQ[maxDQ.length - 1]!;
        maxDQ.pop();
        emit(
          'ENQ_DROP',
          `drop ${dropped}`,
          `${label}: the deque tail ${dropped} is smaller than ${val}. Since ${dropped} can never be the max while ${val} is in the queue, pop it off the back.`,
          { opLabel: label, poppedTail: dropped },
        );
      }

      maxDQ.push(val);
      emit(
        'ENQ_DQ_PUSH',
        `maxDQ ← ${val}`,
        `${label}: push ${val} onto the back of the max-deque. The deque stays non-increasing front-to-back, so maxDQ[0]! = ${maxDQ[0]!} is the current maximum.`,
        { opLabel: label },
      );
    } else if (op.kind === 'deq') {
      const label = 'Dequeue()';
      if (queue.length === 0) {
        emit(
          'DEQ_EMPTY',
          'empty',
          `${label}: the queue is empty, so there is nothing to remove. Return 0.`,
          { opLabel: label, output: 0 },
          'bad',
        );
        continue;
      }
      const v = queue[0]!;
      queue.shift();
      emit(
        'DEQ_POP',
        `→ ${v}`,
        `${label}: remove and return the front value ${v} from the FIFO queue.`,
        { opLabel: label, output: v },
      );

      if (maxDQ.length > 0 && maxDQ[0]! === v) {
        maxDQ.shift();
        emit(
          'DEQ_DQ_POP',
          `drop front ${v}`,
          `${label}: the removed value ${v} was also the front of the max-deque, so it leaves the deque too. The new front maxDQ[0]! = ${maxDQ.length > 0 ? maxDQ[0]! : '—'} becomes the max.`,
          { opLabel: label, output: v },
        );
      } else {
        emit(
          'DEQ_KEEP',
          'max unchanged',
          `${label}: ${v} was not the deque front (max = ${maxDQ.length > 0 ? maxDQ[0]! : '—'}), so the max-deque is untouched.`,
          { opLabel: label, output: v },
        );
      }
    } else {
      const label = 'Max()';
      const m = maxDQ.length > 0 ? maxDQ[0]! : 0;
      emit(
        'MAX',
        `max = ${m}`,
        `${label}: the answer is the front of the max-deque in O(1). Current maximum = ${m}.`,
        { opLabel: label, output: m, currentMax: m },
        'good',
      );
    }
  }

  const finalMax = maxDQ.length > 0 ? maxDQ[0]! : 0;
  emit(
    'DONE',
    `max = ${finalMax}`,
    `All operations replayed. The deque front gives Max() in O(1) amortised time; each value is pushed and popped from the deque at most once, so total work is O(n).`,
    { opLabel: 'done', currentMax: finalMax, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<QueueMaxState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        op: <span className="font-mono text-ink">{s.opLabel || '—'}</span>
        {s.output !== null && (
          <>
            {' · '}returns <span className="font-mono text-good">{s.output}</span>
          </>
        )}
      </div>

      <QueueTape items={s.queue} label="queue · front →" />

      <div className={cn('mt-1 font-mono', vizText.sm)}>
        <QueueTape items={s.maxDQ} label="max-deque · front = max →" />
      </div>

      <div className={cn('mt-1 font-mono', vizText.base, 'text-ink')}>
        max ={' '}
        <span className={s.maxDQ.length > 0 ? 'text-good' : 'text-ink3'}>
          {s.maxDQ.length > 0 ? s.maxDQ[0]! : '—'}
        </span>
      </div>

      {s.poppedTail !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-bad')}>
          dropped deque tail: {s.poppedTail}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<QueueMaxState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="operation" v={s.opLabel || '—'} />
      <InspectorRow k="queue" v={s.queue.length ? `[${s.queue.join(', ')}]` : 'empty'} />
      <InspectorRow k="queue front" v={s.queue.length ? s.queue[0]! : '—'} />
      <InspectorRow k="max-deque" v={s.maxDQ.length ? `[${s.maxDQ.join(', ')}]` : 'empty'} />
      <InspectorRow k="max" v={s.maxDQ.length ? s.maxDQ[0]! : '—'} />
      <InspectorRow k="returns" v={s.output ?? (s.done ? 'done' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-implement-queue-with-max';
export const title = 'Implement queue with max';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Implement queue with max"?',
    choices: [
      {
        label: 'Queue + decreasing max deque — fits this problem',
        correct: true,
      },
      {
        label: 'Dual-stack infix calculator — different approach',
      },
      {
        label: 'Stack with auxiliary min stack — different approach',
      },
      {
        label: 'Stack bracket matching — different approach',
      },
    ],
    explain: 'A decreasing deque shadows the queue; its front is always the max',
  },
  {
    id: 'key-step',
    prompt: 'On the "DEQ_POP" step (→ ), what happens?',
    choices: [
      {
        label: ': remove and return the front — this move caption',
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
    explain: ': remove and return the front value  from the FIFO queue.',
  },
  {
    id: 'state',
    prompt: 'What does the `queue` field track in the visualization state?',
    choices: [
      {
        label: 'FIFO, front at index 0 — updated each frame',
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
    explain: 'The recorder keeps `queue` in sync: FIFO, front at index 0',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Implement queue with max"?',
    choices: [
      {
        label: 'O(1) amortized time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(1) amortized. O(n). enqueue drops smaller tail; dequeue drops front if it leaves',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'All operations replayed. The deque front — final DONE caption',
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
      'All operations replayed. The deque front gives Max() in O(1) amortised time; each value is pushed and popped from the deque at most once, so total work is O(n).',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'qm1',
      label: 'enq 3,1,4,1,5 · max · deq · max',
      value: {
        ops: [
          { kind: 'enq', val: 3 },
          { kind: 'enq', val: 1 },
          { kind: 'enq', val: 4 },
          { kind: 'enq', val: 1 },
          { kind: 'enq', val: 5 },
          { kind: 'max' },
          { kind: 'deq' },
          { kind: 'max' },
        ],
      },
    },
    {
      id: 'qm2',
      label: 'enq 5,2,6 · deq · max · deq · max',
      value: {
        ops: [
          { kind: 'enq', val: 5 },
          { kind: 'enq', val: 2 },
          { kind: 'enq', val: 6 },
          { kind: 'deq' },
          { kind: 'max' },
          { kind: 'deq' },
          { kind: 'max' },
        ],
      },
    },
  ] satisfies SampleInput<QueueMaxInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as QueueMaxState | undefined;
    const m = s && s.maxDQ.length > 0 ? s.maxDQ[0]! : 0;
    return { ok: true, label: `final max = ${m}` };
  },
};

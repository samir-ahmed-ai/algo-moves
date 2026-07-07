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

interface ReverseFileInput {
  content: string;
}

interface ReverseFileState {
  bytes: string[];
  i: number | null;
  j: number | null;
  done: boolean;
}

function record({ content }: ReverseFileInput): Frame<ReverseFileState>[] {
  const bytes = content.split('');
  let i = 0;
  let j = bytes.length - 1;

  const { emit, frames } = createRecorder<ReverseFileState>(() => ({
    bytes: bytes.slice(),
    i,
    j,
    done: false,
  }));

  emit(
    'READ',
    `${bytes.length} bytes`,
    `\`os.ReadFile(path)\` loads all bytes into memory. Two pointers \`i\` (start) and \`j\` (end) will swap toward the center.`,
    { i, j },
  );

  while (i < j) {
    emit(
      'SWAP',
      `'${bytes[i]}'↔'${bytes[j]}'`,
      `Swap bytes at indices ${i} and ${j}: '${bytes[i]}' ↔ '${bytes[j]}', then move i++ and j--.`,
      { i, j },
    );
    [bytes[i], bytes[j]] = [bytes[j], bytes[i]];
    i++;
    j--;
    emit(
      'ADVANCE',
      `i=${i} j=${j}`,
      `Pointers advanced. ${i < j ? 'More swaps remain.' : 'Pointers crossed — reversal complete.'}`,
      { i, j },
    );
  }

  emit(
    'WRITE',
    'WriteFile',
    `\`os.WriteFile(path, data, 0644)\` writes the reversed bytes back to disk in place.`,
    { i, j, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ReverseFileState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null && s.j !== s.i)
    pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'above' });
  const tone = (idx: number) => {
    if (s.i === idx || s.j === idx) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        in-place reversal · i={s.i ?? '—'} j={s.j ?? '—'}
      </div>
      <ArrayRow values={s.bytes} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → &quot;{s.bytes.join('')}&quot;
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ReverseFileState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="j" v={s.j ?? '—'} />
      <InspectorRow k="len" v={s.bytes.length} />
      <InspectorRow k="result" v={s.done ? s.bytes.join('') : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-reverse-content-of-file-in-place';
export const title = 'Reverse content of file in place';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Reverse content of file in place"?',
    choices: [
      {
        label: 'In-place byte reversal — fits this problem',
        correct: true,
      },
      {
        label: 'Filesystem walk with size filter — different approach',
      },
      {
        label: 'Recursive directory walk — different approach',
      },
      {
        label: 'Two heaps median — different approach',
      },
    ],
    explain: 'Read all bytes; swap ends toward the center; write back',
  },
  {
    id: 'key-step',
    prompt: "On the \"SWAP\" step (''↔''), what happens?",
    choices: [
      {
        label: 'Swap bytes at indices and : — this move caption',
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
    explain: "Swap bytes at indices  and : '' ↔ '', then move i++ and j--.",
  },
  {
    id: 'state',
    prompt: 'What does the `bytes` field track in the visualization state?',
    choices: [
      {
        label: 'Field bytes in state — updated each frame',
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
      'The recorder snapshots `bytes` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Reverse content of file in place"?',
    choices: [
      {
        label: 'O(file size) time, O(file size) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log k) time, O(k) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(file size) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(file size). O(file size). ReadFile; reverse slice; WriteFile',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Pointers advanced. — final DONE caption',
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
    explain: 'Pointers advanced. ',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'rc1', label: '"hello"', value: { content: 'hello' } },
    { id: 'rc2', label: '"abcd"', value: { content: 'abcd' } },
  ] satisfies SampleInput<ReverseFileInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ReverseFileState | undefined;
    if (!s?.done) return { ok: false, label: 'incomplete' };
    return { ok: true, label: `"${s.bytes.join('')}"` };
  },
};

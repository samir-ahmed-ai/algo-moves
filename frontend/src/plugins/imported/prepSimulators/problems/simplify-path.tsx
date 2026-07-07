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

interface SimplifyPathInput {
  path: string;
}

interface SimplifyPathState {
  path: string;
  parts: string[]; // path split on '/'
  pi: number | null; // current part index being processed
  part: string | null; // current part text
  stack: string[]; // directory names accumulated so far
  popped: string | null; // directory just removed by '..'
  action: 'skip' | 'pop' | 'push' | 'noop' | null;
  result: string | null; // canonical path, set on DONE
  done: boolean;
}

function canonical(stack: string[]): string {
  return '/' + stack.join('/');
}

function record({ path }: SimplifyPathInput): Frame<SimplifyPathState>[] {
  const parts = path.split('/');
  const stack: string[] = [];

  const { emit, frames } = createRecorder<SimplifyPathState>(() => ({
    path,
    parts,
    pi: null,
    part: null,
    stack: stack.slice(),
    popped: null,
    action: null,
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `split → ${parts.length} parts`,
    `Simplify Path: turn "${path}" into its canonical Unix form. Split on "/" into ${parts.length} parts, then process each with a stack — "" and "." are skipped, ".." pops the last directory, anything else is pushed.`,
    {},
  );

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    if (part === '' || part === '.') {
      emit(
        'SKIP',
        part === '' ? 'empty' : '"."',
        `Part ${pi} is ${part === '' ? 'empty (from a slash)' : '"." (current directory)'}, which carries no meaning — skip it and leave the stack unchanged.`,
        { pi, part, action: 'skip' },
      );
      continue;
    }
    if (part === '..') {
      if (stack.length > 0) {
        const popped = stack.pop()!;
        emit(
          'POP',
          `pop "${popped}"`,
          `Part ${pi} is ".." (parent directory), so go up one level by popping "${popped}" off the stack.`,
          { pi, part, popped, action: 'pop', stack: stack.slice() },
        );
      } else {
        emit(
          'POP',
          'stack empty',
          `Part ${pi} is ".." but the stack is already empty — we are at the root, so ".." has no effect.`,
          { pi, part, action: 'noop' },
        );
      }
      continue;
    }
    stack.push(part);
    emit(
      'PUSH',
      `push "${part}"`,
      `Part ${pi} is a real directory name "${part}", so descend into it by pushing it onto the stack.`,
      { pi, part, action: 'push', stack: stack.slice() },
    );
  }

  const result = canonical(stack);
  emit(
    'DONE',
    result,
    `All parts processed. Join the stack with "/" and prepend a leading "/" to get the canonical path "${result}".`,
    { result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SimplifyPathState>) {
  const s = frame.state;
  const cells = s.stack.length === 0 ? ['/'] : s.stack;
  const empty = s.stack.length === 0;
  const pointers: ArrayPointer[] = [];
  if (!empty && !s.done) {
    pointers.push({ i: s.stack.length - 1, label: 'top', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (empty) return '';
    if (s.done) return 'found';
    if (s.action === 'push' && i === s.stack.length - 1) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        path = <span className="font-mono text-ink">{s.path}</span>
      </div>
      <div className={cn('mt-1 font-mono', vizText.sm)}>
        {s.parts.map((p, i) => (
          <span
            key={i}
            className={cn(s.pi === i ? 'text-accent' : 'text-ink3', s.pi === i && 'font-semibold')}
          >
            {i > 0 && <span className="text-ink3">/</span>}
            {p === '' ? '·' : p}
          </span>
        ))}
      </div>
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>stack · bottom → top</div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      {s.popped !== null && (
        <div className={cn('mt-1 font-mono text-bad', vizText.sm)}>popped "{s.popped}"</div>
      )}
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.result}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<SimplifyPathState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="part index" v={s.pi ?? '—'} />
      <InspectorRow k="part" v={s.part === null ? '—' : s.part === '' ? '""' : `"${s.part}"`} />
      <InspectorRow k="action" v={s.action ?? '—'} />
      <InspectorRow k="popped" v={s.popped === null ? '—' : `"${s.popped}"`} />
      <InspectorRow k="stack depth" v={s.stack.length} />
      <InspectorRow k="canonical" v={s.result ?? (s.done ? canonical(s.stack) : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-simplify-path';
export const title = 'Simplify Path';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Simplify Path"?',
    choices: [
      {
        label: 'Stack — fits this problem',
        correct: true,
      },
      {
        label: 'Dual-stack infix calculator — different approach',
      },
      {
        label: 'Queue + decreasing max deque — different approach',
      },
      {
        label: 'Stack bracket matching — different approach',
      },
    ],
    explain: 'Split by `/`, iterate parts: skip empty and `.`, pop on `..`, push otherwise',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Simplify Path), what strategy is established?',
    choices: [
      {
        label: 'Split by `/`, iterate parts: skip — described in INIT caption',
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
      'Simplify Path: turn "" into its canonical Unix form. Split on "/" into  parts, then process each with a stack — "" and "." are skipped, ".." pops the last directory, anything else is pushed.',
  },
  {
    id: 'key-step',
    prompt: 'On the "PUSH" step (push ""), what happens?',
    choices: [
      {
        label: 'Part is a real directory name — this move caption',
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
    explain: 'Part  is a real directory name "", so descend into it by pushing it onto the stack.',
  },
  {
    id: 'state',
    prompt: 'What does the `parts` field track in the visualization state?',
    choices: [
      {
        label: "path split on '/' — updated each frame",
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
    explain: "The recorder keeps `parts` in sync: path split on '/'",
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Simplify Path"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n·maxK) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      'O(n). O(n). Split by `/`, iterate parts: skip empty and `.`, pop on `..`, push otherwise; Join stack with `/` and prepend `/`',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Part is a real directory name — final DONE caption',
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
    explain: 'Part  is a real directory name "", so descend into it by pushing it onto the stack.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'sp1', label: '"/a/./b/../../c/"', value: { path: '/a/./b/../../c/' } },
    { id: 'sp2', label: '"/home//foo/"', value: { path: '/home//foo/' } },
  ] satisfies SampleInput<SimplifyPathInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SimplifyPathState | undefined;
    return s?.result ? { ok: true, label: s.result } : { ok: false, label: 'no result' };
  },
};

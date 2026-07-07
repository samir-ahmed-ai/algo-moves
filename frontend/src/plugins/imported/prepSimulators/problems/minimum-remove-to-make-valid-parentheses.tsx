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

interface MinRemoveInput {
  s: string;
}

interface MinRemoveState {
  chars: string[]; // current buffer, chars marked for removal show as '*'
  i: number | null; // index being scanned
  stack: number[]; // indices of unmatched '(' seen so far
  removed: number[]; // indices marked '*' (to be removed)
  result: string | null; // final string once every '*' is stripped
  done: boolean;
}

function record({ s }: MinRemoveInput): Frame<MinRemoveState>[] {
  const buf = s.split('');
  const stack: number[] = [];
  const removed: number[] = [];

  const { emit, frames } = createPrepRecorder<MinRemoveState>(() => ({
    chars: buf.slice(),
    i: null,
    stack: stack.slice(),
    removed: removed.slice(),
    result: null,
    done: false,
  }));

  emit(
    'INIT',
    `"${s}"`,
    `Minimum Remove to Make Valid Parentheses: delete the fewest brackets so every "(" has a matching ")". Scan left to right, pushing the index of each unmatched "(" onto a stack; a ")" cancels the newest one, and anything that never matches gets removed.`,
    {},
  );

  for (let i = 0; i < buf.length; i++) {
    const c = buf[i]!;
    if (c === '(') {
      stack.push(i);
      emit(
        'PUSH',
        `push ${i}`,
        `Char ${i} is "(" — it opens a group that still needs a partner. Push index ${i} onto the stack of unmatched opens (depth ${stack.length}).`,
        { i, stack: stack.slice() },
      );
    } else if (c === ')') {
      if (stack.length > 0) {
        const matched = stack[stack.length - 1]!;
        stack.pop();
        emit(
          'MATCH',
          `close ${matched}`,
          `Char ${i} is ")" and the stack has an open at index ${matched} — they pair up. Pop it; both brackets are valid and survive.`,
          { i, stack: stack.slice() },
          'good',
        );
      } else {
        buf[i]! = '*';
        removed.push(i);
        emit(
          'DROP',
          `remove ${i}`,
          `Char ${i} is ")" but the stack is empty — there is no open bracket to match it. Mark index ${i} for removal (shown as *).`,
          { i, removed: removed.slice() },
          'bad',
        );
      }
    } else {
      emit(
        'SKIP',
        `keep '${c}'`,
        `Char ${i} is "${c}" — a normal letter, not a bracket. It is always valid, so leave it untouched.`,
        { i },
      );
    }
  }

  for (const idx of stack) {
    buf[idx]! = '*';
    removed.push(idx);
    emit(
      'DROP',
      `remove ${idx}`,
      `The scan is over but index ${idx} still holds an unmatched "(" — it never found a ")". Mark it for removal (*).`,
      { removed: removed.slice() },
      'bad',
    );
  }

  const result = buf.filter((b) => b !== '*').join('');
  emit(
    'DONE',
    `"${result}"`,
    `Strip every char marked "*". The remaining string "${result}" is valid and we removed the minimum number of brackets (${removed.length}).`,
    { result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MinRemoveState>) {
  const s = frame.state;
  const removedSet = new Set(s.removed);
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const top = s.stack.length > 0 ? s.stack[s.stack.length - 1]! : null;
  if (top !== null) pointers.push({ i: top, label: 'top', tone: 'good', place: 'below' });

  const tone = (i: number) => {
    if (removedSet.has(i)) return 'dead';
    if (s.i === i) return 'match';
    if (s.stack.includes(i)) return 'lo';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        stack (unmatched opens):{' '}
        <span className="font-mono text-ink">
          {s.stack.length ? `[${s.stack.join(', ')}]` : '[]'}
        </span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        removed: {s.removed.length ? `[${s.removed.join(', ')}]` : 'none'}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ "{s.result}"</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MinRemoveState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.i !== null ? s.chars[s.i]! : '—';
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char[i]!" v={cur === '*' ? '(removed)' : cur} />
      <InspectorRow k="stack" v={s.stack.length ? `[${s.stack.join(', ')}]` : '[]'} />
      <InspectorRow k="stack depth" v={s.stack.length} />
      <InspectorRow k="removed" v={s.removed.length} />
      <InspectorRow k="result" v={s.result !== null ? `"${s.result}"` : s.done ? '""' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-minimum-remove-to-make-valid-parentheses';
export const title = 'Minimum Remove to Make Valid Parentheses';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Minimum Remove to Make Valid Parentheses"?',
    choices: [
      {
        label: 'Stack of unmatched indices — fits this problem',
        correct: true,
      },
      {
        label: 'Multi-pointer Buckets — different approach',
      },
      {
        label: 'Single Pass Flags — different approach',
      },
      {
        label: 'Vertical scan — different approach',
      },
    ],
    explain: 'See Minimum Remove To Make Valid Parentheses pattern',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Minimum Remove to Make Valid Parentheses), what strategy is established?',
    choices: [
      {
        label: 'See Minimum Remove To Make Valid — described in INIT caption',
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
      'Minimum Remove to Make Valid Parentheses: delete the fewest brackets so every "(" has a matching ")". Scan left to right, pushing the index of each unmatched "(" onto a stack; a ")" cancels the newest one, and anything that never matches gets removed.',
  },
  {
    id: 'key-step',
    prompt: 'On the "DROP" step (remove ), what happens?',
    choices: [
      {
        label: 'Char is ")" but the stack — this move caption',
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
      'Char  is ")" but the stack is empty — there is no open bracket to match it. Mark index  for removal (shown as *).',
  },
  {
    id: 'state',
    prompt: 'What does the `chars` field track in the visualization state?',
    choices: [
      {
        label: 'current buffer, chars marked — updated each frame',
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
      "The recorder keeps `chars` in sync: current buffer, chars marked for removal show as '*'",
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "Minimum Remove to Make Valid Parentheses"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(a+b+c) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(m+n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(n). Minimum Remove To Make Valid Parentheses',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Strip every char marked "*". — final DONE caption',
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
      'Strip every char marked "*". The remaining string "" is valid and we removed the minimum number of brackets ().',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'mr1', label: '"a)b(c)d"', value: { s: 'a)b(c)d' } },
    { id: 'mr2', label: '"lee(t(c)o)"', value: { s: 'lee(t(c)o)' } },
  ] satisfies SampleInput<MinRemoveInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MinRemoveState | undefined;
    return s?.result != null
      ? { ok: true, label: `"${s.result}"` }
      : { ok: false, label: 'no result' };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ParensInput {
  str: string;
}

interface ParensState {
  chars: string[]; // the bracket string, one char per cell
  i: number | null; // current index being scanned
  stack: string[]; // open brackets seen so far, top = last
  matchAt: number | null; // index of the open bracket popped to match current close
  result: boolean | null; // final verdict once known
  done: boolean;
}

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
const OPENS = new Set(['(', '[', '{']);

function record({ str }: ParensInput): Frame<ParensState>[] {
  const chars = [...str];  const stack: string[] = [];

  const { emit, frames } = createRecorder<ParensState>(() => ({
        chars,
        i: null,
        stack: stack.slice(),
        matchAt: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `"${str}"`,
    `Validate parentheses on "${str}". Scan left to right: push every opening bracket onto a stack; each closing bracket must match the bracket on top of the stack. Time O(n), space O(n).`,
    {},
  );

  // Track which open-index each pushed bracket came from, so the View can ring matches.
  const openIdx: number[] = [];

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];

    if (OPENS.has(c)) {
      stack.push(c);
      openIdx.push(i);
      emit(
        'PUSH',
        `push ${c}`,
        `'${c}' is an opening bracket, so push it onto the stack. The stack now holds ${stack.length} open bracket${stack.length === 1 ? '' : 's'} waiting to be closed.`,
        { i },
      );
      continue;
    }

    const open = PAIRS[c];
    if (open === undefined) {
      // Non-bracket char: solution ignores it.
      emit(
        'SKIP',
        `skip ${c}`,
        `'${c}' is not a bracket, so it is ignored and the scan continues.`,
        { i },
      );
      continue;
    }

    // It is a closing bracket.
    if (stack.length === 0) {
      emit(
        'FAIL',
        'unmatched close',
        `'${c}' is a closing bracket but the stack is empty — there is no opening bracket to match it. Invalid.`,
        { i, result: false, done: true },
        'bad',
      );
      return frames;
    }

    const top = stack[stack.length - 1];
    if (top !== open) {
      emit(
        'FAIL',
        `${top} ≠ ${open}`,
        `'${c}' should close a '${open}', but the top of the stack is '${top}'. The brackets are interleaved wrong, so the string is invalid.`,
        { i, matchAt: openIdx[openIdx.length - 1], result: false, done: true },
        'bad',
      );
      return frames;
    }

    const matchAt = openIdx[openIdx.length - 1];
    stack.pop();
    openIdx.pop();
    emit(
      'POP',
      `match ${open}${c}`,
      `'${c}' matches the '${open}' on top of the stack (opened at index ${matchAt}), so pop it. ${stack.length} open bracket${stack.length === 1 ? '' : 's'} still pending.`,
      { i, matchAt },
      'good',
    );
  }

  const ok = stack.length === 0;
  emit(
    'DONE',
    ok ? 'valid' : 'leftover opens',
    ok
      ? `Reached the end with an empty stack — every opening bracket was closed in the right order. The string is valid.`
      : `Reached the end but ${stack.length} opening bracket${stack.length === 1 ? '' : 's'} were never closed, so the string is invalid.`,
    { result: ok, done: true },
    ok ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<ParensState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'scan', tone: 'accent', place: 'above' });
  if (s.matchAt !== null)
    pointers.push({
      i: s.matchAt,
      label: 'open',
      tone: s.result === false ? 'bad' : 'good',
      place: 'below',
    });

  const tone = (i: number) => {
    if (s.matchAt === i) return s.result === false ? 'dead' : 'found';
    if (s.i === i) return s.result === false ? 'dead' : 'match';
    return '';
  };

  const stackText = s.stack.length === 0 ? 'empty' : s.stack.join(' ');

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        input = <span className="font-mono text-ink">{s.chars.join('') || '""'}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-2 font-mono', vizText.sm, 'text-ink3')}>
        stack (top →) {'['}
        <span className="text-ink">{stackText}</span>
        {']'}
      </div>
      {s.result !== null && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.result ? 'text-good' : 'text-bad',
          )}
        >
          → {s.result ? 'valid' : 'invalid'}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ParensState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.i !== null ? s.chars[s.i] : '—';
  const top = s.stack.length > 0 ? s.stack[s.stack.length - 1] : '—';
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char" v={cur} />
      <InspectorRow k="stack top" v={top} />
      <InspectorRow k="stack size" v={s.stack.length} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : s.result ? 'valid' : 'invalid'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-stacks-queues-validate-parentheses';
export const title = 'Validate parentheses';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'vp1', label: '"([{}])"', value: { str: '([{}])' } },
    { id: 'vp2', label: '"([)]"', value: { str: '([)]' } },
  ] satisfies SampleInput<ParensInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ParensState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'valid' : 'invalid' };
  },
};

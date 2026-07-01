import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
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

function record({ s }: MinRemoveInput): Frame<MinRemoveState>[] {  const buf = s.split('');
  const stack: number[] = [];
  const removed: number[] = [];

  const { emit, frames } = createRecorder<MinRemoveState>(() => ({
        chars: buf.slice(),
        i: null,
        stack: stack.slice(),
        removed: removed.slice(),
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `"${s}"`,
    `Minimum Remove to Make Valid Parentheses: delete the fewest brackets so every "(" has a matching ")". Scan left to right, pushing the index of each unmatched "(" onto a stack; a ")" cancels the newest one, and anything that never matches gets removed.`,
    {},
  );

  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
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
        const matched = stack[stack.length - 1];
        stack.pop();
        emit(
          'MATCH',
          `close ${matched}`,
          `Char ${i} is ")" and the stack has an open at index ${matched} — they pair up. Pop it; both brackets are valid and survive.`,
          { i, stack: stack.slice() },
          'good',
        );
      } else {
        buf[i] = '*';
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
    buf[idx] = '*';
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
  const top = s.stack.length > 0 ? s.stack[s.stack.length - 1] : null;
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
        <span className="font-mono text-ink">{s.stack.length ? `[${s.stack.join(', ')}]` : '[]'}</span>
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
  const cur = s.i !== null ? s.chars[s.i] : '—';
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char[i]" v={cur === '*' ? '(removed)' : cur} />
      <InspectorRow k="stack" v={s.stack.length ? `[${s.stack.join(', ')}]` : '[]'} />
      <InspectorRow k="stack depth" v={s.stack.length} />
      <InspectorRow k="removed" v={s.removed.length} />
      <InspectorRow k="result" v={s.result !== null ? `"${s.result}"` : s.done ? '""' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-minimum-remove-to-make-valid-parentheses';
export const title = 'Minimum Remove to Make Valid Parentheses';

export const simulator: ProblemSimulator = {
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

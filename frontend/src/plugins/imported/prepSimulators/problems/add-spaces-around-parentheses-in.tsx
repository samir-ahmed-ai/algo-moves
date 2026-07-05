import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface AddSpacesInput {
  s: string;
}

interface AddSpacesState {
  chars: string[];
  i: number | null;
  prevSpace: boolean;
  out: string;
  result: string | null;
  done: boolean;
}

function addSpacesAroundParenthesesIn(s: string): string {
  let out = '';
  let prevSpace = true;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(' || ch === ')') {
      if (!prevSpace) out += ' ';
      out += ch + ' ';
      prevSpace = true;
    } else if (ch === ' ') {
      if (!prevSpace) out += ' ';
      prevSpace = true;
    } else {
      out += ch;
      prevSpace = false;
    }
  }
  return out.trim();
}

function record({ s }: AddSpacesInput): Frame<AddSpacesState>[] {
  const chars = s.split('');  let out = '';
  let prevSpace = true;

  const { emit, frames } = createRecorder<AddSpacesState>(() => ({
        chars,
        i: null,
        prevSpace,
        out,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    'prevSpace=true',
    `Add spaces around parentheses: scan left-to-right with a builder. \`prevSpace\` tracks whether the last written character was a space (starts true so we never pad the front).`,
    { prevSpace: true },
  );

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '(' || ch === ')') {
      if (!prevSpace) {
        out += ' ';
        emit(
          'PAD',
          `space before ${ch}`,
          `Index ${i}: '${ch}' is a parenthesis and \`prevSpace\` is false, so write a space before it to separate from the previous token.`,
          { i, prevSpace: false, out },
        );
      }
      out += ch + ' ';
      prevSpace = true;
      emit(
        'PAREN',
        `'${ch}' padded`,
        `Write '${ch}' followed by a trailing space. Set \`prevSpace = true\` so the next non-space char won't double-pad.`,
        { i, prevSpace: true, out },
      );
    } else if (ch === ' ') {
      if (!prevSpace) {
        out += ' ';
        emit(
          'COLLAPSE',
          'collapse space run',
          `Index ${i}: input space when \`prevSpace\` is false — emit one space and collapse the run.`,
          { i, prevSpace: true, out },
        );
      } else {
        emit(
          'SKIP',
          'skip extra space',
          `Index ${i}: input space but \`prevSpace\` is already true — skip (collapse runs).`,
          { i, prevSpace: true, out },
        );
      }
      prevSpace = true;
    } else {
      out += ch;
      prevSpace = false;
      emit(
        'CHAR',
        `write '${ch}'`,
        `Index ${i}: ordinary char '${ch}' — append directly and set \`prevSpace = false\`.`,
        { i, prevSpace: false, out },
      );
    }
  }

  const result = out.trim();
  emit(
    'TRIM',
    'TrimSpace',
    `Scan complete. \`strings.TrimSpace\` removes leading/trailing spaces from the builder output.`,
    { out, result },
  );
  emit(
    'DONE',
    result,
    `Final string: "${result}". Each '(' and ')' is wrapped with single spaces; consecutive spaces are collapsed.`,
    { result, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<AddSpacesState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] =
    s.i !== null ? [{ i: s.i, label: 'i', tone: 'accent', place: 'above' }] : [];
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        prevSpace ={' '}
        <span className="font-mono text-ink">{s.prevSpace ? 'true' : 'false'}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={(i) => (s.i === i ? 'match' : '')} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        out = <span className="text-ink">{s.out || '∅'}</span>
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → &quot;{s.result}&quot;
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<AddSpacesState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="prevSpace" v={s.prevSpace ? 'true' : 'false'} />
      <InspectorRow k="out len" v={s.out.length} />
      <InspectorRow k="result" v={s.result ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-streams-io-add-spaces-around-parentheses-in';
export const title = 'Add spaces around parentheses in';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'asp1', label: '"(a(b)c)"', value: { s: '(a(b)c)' } },
    { id: 'asp2', label: '"hello(world)"', value: { s: 'hello(world)' } },
  ] satisfies SampleInput<AddSpacesInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AddSpacesState | undefined;
    if (!s?.result) return { ok: false, label: 'incomplete' };
    const expected = addSpacesAroundParenthesesIn(s.chars.join(''));
    return { ok: s.result === expected, label: `"${s.result}"` };
  },
};

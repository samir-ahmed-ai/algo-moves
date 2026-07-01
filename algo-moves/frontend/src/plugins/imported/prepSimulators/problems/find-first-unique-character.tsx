import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailStack, RailResult } from '../../../_shared/vizKit';

interface FirstUniqueInput {
  s: string;
}

interface FirstUniqueState {
  chars: string[];
  phase: 'count' | 'scan' | 'done';
  i: number | null; // current index being inspected
  freq: [string, number][]; // frequency map entries so far
  curChar: string | null; // character at index i
  curCount: number | null; // its count (during the scan phase)
  answer: number | null; // first index with count 1, or -1 when finished
  done: boolean;
}

function record({ s }: FirstUniqueInput): Frame<FirstUniqueState>[] {
  const chars = s.split('');
  const cnt = new Map<string, number>();

  const { emit, frames } = createRecorder<FirstUniqueState>(() => ({
    chars,
    phase: 'count',
    i: null,
    freq: [...cnt.entries()],
    curChar: null,
    curCount: null,
    answer: null,
    done: false,
  }));

  emit(
    'INIT',
    `s="${s}"`,
    `Find First Unique Character: return the index of the first character that appears exactly once. We do two passes — first count every character into a frequency map (O(1) space, at most 26/128 keys), then scan the string in original order for the first count of 1.`,
    { phase: 'count' },
  );

  // Pass 1: build the frequency map.
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    cnt.set(c, (cnt.get(c) ?? 0) + 1);
    emit(
      'COUNT',
      `cnt['${c}']=${cnt.get(c)}`,
      `Pass 1, index ${i}: character '${c}'. Increment its tally — cnt['${c}'] is now ${cnt.get(c)}.`,
      { phase: 'count', i, curChar: c },
    );
  }

  emit(
    'COUNTED',
    'counts ready',
    `Pass 1 complete. The frequency map now holds the count of every character. Begin pass 2: walk the string left to right and stop at the first character whose count is 1.`,
    { phase: 'scan' },
  );

  // Pass 2: find the first index whose count is 1.
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const count = cnt.get(c) ?? 0;
    if (count === 1) {
      emit(
        'FOUND',
        `index ${i}`,
        `Pass 2, index ${i}: '${c}' has count ${count} — it is unique. This is the first such character, so return index ${i}.`,
        { phase: 'done', i, curChar: c, curCount: count, answer: i, done: true },
        'good',
      );
      return frames;
    }
    emit(
      'SCAN',
      `'${c}' x${count}`,
      `Pass 2, index ${i}: '${c}' appears ${count} times — not unique. Keep scanning.`,
      { phase: 'scan', i, curChar: c, curCount: count },
    );
  }

  emit(
    'DONE',
    'no unique',
    `Scanned the whole string and every character repeats — there is no unique character, so return -1.`,
    { phase: 'done', answer: -1, done: true },
    'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<FirstUniqueState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  }
  if (s.answer !== null && s.answer >= 0) {
    pointers.push({ i: s.answer, label: 'ans', tone: 'good', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.answer !== null && s.answer >= 0 && i === s.answer) return 'found';
    if (s.i === i) return 'match';
    return '';
  };
  const phaseLabel =
    s.phase === 'count' ? 'Pass 1 · counting' : s.phase === 'scan' ? 'Pass 2 · scanning' : 'done';
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="phase" v={phaseLabel} />
        <RailStat k="i" v={s.i ?? '—'} />
        <RailStat k="char" v={s.curChar !== null ? `'${s.curChar}'` : '—'} tone={s.curChar !== null ? 'accent' : undefined} />
        <RailStat k="count" v={s.curCount ?? '—'} />
      </RailGroup>
      <RailStack label="freq" items={s.freq.map(([c, n]) => `${c}:${n}`)} />
      {s.answer !== null && (
        <RailResult label="answer" value={s.answer} tone={s.answer >= 0 ? 'good' : 'bad'} />
      )}
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<FirstUniqueState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="char" v={s.curChar !== null ? `'${s.curChar}'` : '—'} />
      <InspectorRow k="count" v={s.curCount ?? '—'} />
      <InspectorRow k="distinct chars" v={s.freq.length} />
      <InspectorRow
        k="answer"
        v={s.answer !== null ? s.answer : s.done ? -1 : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-find-first-unique-character';
export const title = 'Find first unique character';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ffu1', label: '"leetcode"', value: { s: 'leetcode' } },
    { id: 'ffu2', label: '"aabb"', value: { s: 'aabb' } },
  ] satisfies SampleInput<FirstUniqueInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as FirstUniqueState | undefined;
    const ans = s?.answer ?? -1;
    return ans >= 0
      ? { ok: true, label: `index ${ans}` }
      : { ok: false, label: 'no unique char' };
  },
};


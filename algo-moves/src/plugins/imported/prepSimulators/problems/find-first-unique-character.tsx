import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  const frames: Frame<FirstUniqueState>[] = [];
  const cnt = new Map<string, number>();

  const emit = (
    type: string,
    note: string,
    caption: string,
    phase: FirstUniqueState['phase'],
    extra: Partial<FirstUniqueState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        chars,
        phase,
        i: null,
        freq: [...cnt.entries()],
        curChar: null,
        curCount: null,
        answer: null,
        done: false,
        ...extra,
      },
    });

  emit(
    'INIT',
    `s="${s}"`,
    `Find First Unique Character: return the index of the first character that appears exactly once. We do two passes — first count every character into a frequency map (O(1) space, at most 26/128 keys), then scan the string in original order for the first count of 1.`,
    'count',
    {},
  );

  // Pass 1: build the frequency map.
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    cnt.set(c, (cnt.get(c) ?? 0) + 1);
    emit(
      'COUNT',
      `cnt['${c}']=${cnt.get(c)}`,
      `Pass 1, index ${i}: character '${c}'. Increment its tally — cnt['${c}'] is now ${cnt.get(c)}.`,
      'count',
      { i, curChar: c },
    );
  }

  emit(
    'COUNTED',
    'counts ready',
    `Pass 1 complete. The frequency map now holds the count of every character. Begin pass 2: walk the string left to right and stop at the first character whose count is 1.`,
    'scan',
    {},
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
        'done',
        { i, curChar: c, curCount: count, answer: i, done: true },
        'good',
      );
      return frames;
    }
    emit(
      'SCAN',
      `'${c}' x${count}`,
      `Pass 2, index ${i}: '${c}' appears ${count} times — not unique. Keep scanning.`,
      'scan',
      { i, curChar: c, curCount: count },
    );
  }

  emit(
    'DONE',
    'no unique',
    `Scanned the whole string and every character repeats — there is no unique character, so return -1.`,
    'done',
    { answer: -1, done: true },
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
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {phaseLabel}
        {s.curChar !== null && (
          <>
            {' · '}char ={' '}
            <span className="font-mono text-ink">'{s.curChar}'</span>
            {s.curCount !== null && (
              <>
                {' '}×<span className="font-mono text-ink">{s.curCount}</span>
              </>
            )}
          </>
        )}
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        cnt {'{'}
        {s.freq.map(([c, n]) => `${c}:${n}`).join(', ')}
        {'}'}
      </div>
      {s.answer !== null && (
        <div
          className={cn(
            'mt-1 font-mono',
            s.answer >= 0 ? 'text-good' : 'text-bad',
            vizText.base,
          )}
        >
          → {s.answer}
        </div>
      )}
    </div>
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


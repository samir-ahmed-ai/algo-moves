import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RansomInput {
  note: string;
  magazine: string;
}

interface RansomState {
  note: string[]; // ransom note chars we must spell
  magazine: string; // original magazine string (for display)
  cnt: [string, number][]; // remaining letters available, char -> count
  i: number | null; // index in the note currently being spent
  cur: string | null; // note[i], the char we are trying to take
  available: number | null; // remaining count of cur before this step
  result: boolean | null; // final verdict once known
  done: boolean;
}

function record({ note, magazine }: RansomInput): Frame<RansomState>[] {
  const frames: Frame<RansomState>[] = [];
  const noteChars = note.split('');
  const cnt = new Map<string, number>();

  const emit = (
    type: string,
    noteText: string,
    caption: string,
    s: Partial<RansomState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note: noteText, caption, tone },
      state: {
        note: noteChars,
        magazine,
        cnt: [...cnt.entries()],
        i: null,
        cur: null,
        available: null,
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `note "${note}"`,
    `Ransom Note: can we spell "${note}" using only the letters in the magazine "${magazine}", each magazine letter used at most once? Count every magazine letter, then spend one per note letter.`,
    {},
  );

  for (let k = 0; k < magazine.length; k++) {
    const ch = magazine[k];
    cnt.set(ch, (cnt.get(ch) ?? 0) + 1);
    emit(
      'COUNT',
      `${ch}:${cnt.get(ch)}`,
      `Tally the magazine: letter '${ch}' now has count ${cnt.get(ch)}. This map is our pool of spendable letters.`,
      {},
    );
  }

  for (let i = 0; i < noteChars.length; i++) {
    const c = noteChars[i];
    const have = cnt.get(c) ?? 0;
    emit(
      'CHECK',
      `need '${c}'`,
      `Note position ${i} needs letter '${c}'. We have ${have} of them left in the pool. Is that at least one?`,
      { i, cur: c, available: have },
    );
    if (have === 0) {
      emit(
        'FAIL',
        `no '${c}'`,
        `The pool has zero '${c}' left, so the note cannot be spelled. Return false.`,
        { i, cur: c, available: 0, result: false, done: true },
        'bad',
      );
      return frames;
    }
    cnt.set(c, have - 1);
    emit(
      'SPEND',
      `${c}:${have - 1}`,
      `Spend one '${c}' from the pool: its count drops ${have} → ${have - 1}. Move to the next note letter.`,
      { i, cur: c, available: have - 1 },
    );
  }

  emit(
    'DONE',
    'true',
    `Every note letter was covered by the magazine pool. The note can be spelled — return true.`,
    { result: true, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<RansomState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    pointers.push({
      i: s.i,
      label: 'i',
      tone: s.result === false ? 'bad' : 'accent',
      place: 'above',
    });
  }
  const tone = (i: number) => {
    if (s.i === null) return '';
    if (i === s.i) return s.result === false ? 'dead' : 'match';
    return i < s.i ? 'found' : '';
  };
  const poolText = s.cnt.length
    ? s.cnt.map(([ch, n]) => `${ch}:${n}`).join('  ')
    : '(empty)';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        magazine = <span className="font-mono text-ink">"{s.magazine}"</span>
      </div>
      <ArrayRow values={s.note} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>pool {'{'} {poolText} {'}'}</div>
      {s.result !== null && (
        <div
          className={cn(
            'mt-1 font-mono',
            vizText.base,
            s.result ? 'text-good' : 'text-bad',
          )}
        >
          → {String(s.result)}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RansomState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="note" v={`"${s.note.join('')}"`} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="need char" v={s.cur ? `'${s.cur}'` : '—'} />
      <InspectorRow k="available" v={s.available ?? '—'} />
      <InspectorRow k="distinct in pool" v={s.cnt.length} />
      <InspectorRow
        k="result"
        v={s.result === null ? (s.done ? 'none' : '…') : String(s.result)}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-ransom-note';
export const title = 'Ransom note';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'rn1', label: '"aab" from "baa" → true', value: { note: 'aab', magazine: 'baa' } },
    { id: 'rn2', label: '"aa" from "ab" → false', value: { note: 'aa', magazine: 'ab' } },
  ] satisfies SampleInput<RansomInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RansomState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'true' : 'false' };
  },
};

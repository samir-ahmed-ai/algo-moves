import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LcpInput {
  strs: string[];
}

interface LcpState {
  strs: string[];
  col: number | null; // char column currently being compared
  row: number | null; // which word (index into strs) we are checking against word 0
  matched: number; // number of leading chars confirmed common so far
  result: string | null; // final common prefix once known
  done: boolean;
}

function record({ strs }: LcpInput): Frame<LcpState>[] {
  const frames: Frame<LcpState>[] = [];
  const base = strs.length > 0 ? strs[0] : '';

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<LcpState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        strs,
        col: null,
        row: null,
        matched: 0,
        result: null,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${strs.length} words`,
    `Longest Common Prefix by vertical scan: fix word 0 ("${base}") as the yardstick and walk its characters column by column. At each column, every other word must have the same character; the first mismatch (or a word that runs out) ends the prefix.`,
    {},
  );

  if (strs.length === 0) {
    emit('DONE', 'empty set', `There are no words at all, so the longest common prefix is the empty string "".`, { result: '', done: true }, 'bad');
    return frames;
  }

  for (let i = 0; i < base.length; i++) {
    const c = base[i];
    emit(
      'COLUMN',
      `col ${i} = '${c}'`,
      `Column ${i}: word 0 has '${c}' here. Check that every other word also has '${c}' at index ${i}.`,
      { col: i, matched: i },
    );

    for (let j = 1; j < strs.length; j++) {
      const w = strs[j];
      if (i >= w.length) {
        emit(
          'MISMATCH',
          `"${w}" too short`,
          `Word ${j} ("${w}") has only ${w.length} character${w.length === 1 ? '' : 's'}, so it has nothing at index ${i}. The common prefix cannot extend past column ${i}. Answer = word0[:${i}] = "${base.slice(0, i)}".`,
          { col: i, row: j, matched: i, result: base.slice(0, i), done: true },
          'bad',
        );
        return frames;
      }
      if (w[i] !== c) {
        emit(
          'MISMATCH',
          `'${w[i]}' ≠ '${c}'`,
          `Word ${j} ("${w}") has '${w[i]}' at index ${i}, which differs from '${c}'. That breaks the prefix here. Answer = word0[:${i}] = "${base.slice(0, i)}".`,
          { col: i, row: j, matched: i, result: base.slice(0, i), done: true },
          'bad',
        );
        return frames;
      }
      emit(
        'MATCH',
        `"${w}"[${i}]='${c}'`,
        `Word ${j} ("${w}") also has '${c}' at index ${i} — still a match. Keep checking the rest of this column.`,
        { col: i, row: j, matched: i },
        'good',
      );
    }

    emit(
      'COLUMN_OK',
      `col ${i} common`,
      `Every word shares '${c}' at column ${i}, so the prefix now includes '${c}'. Confirmed prefix so far: "${base.slice(0, i + 1)}".`,
      { col: i, matched: i + 1 },
      'good',
    );
  }

  emit(
    'DONE',
    `"${base}"`,
    `We consumed all of word 0 without any mismatch, so word 0 itself is a prefix of every word. The longest common prefix is "${base}".`,
    { matched: base.length, result: base, done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LcpState>) {
  const s = frame.state;
  const base = s.strs.length > 0 ? s.strs[0] : '';
  const baseChars = base.split('');
  const pointers: ArrayPointer[] = [];
  if (s.col !== null) pointers.push({ i: s.col, label: 'col', tone: 'accent', place: 'above' });
  const tone = (i: number) => {
    if (i < s.matched) return 'found';
    if (s.col === i) return s.done ? 'dead' : 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        word 0 = <span className="font-mono text-ink">"{base}"</span> · comparing{' '}
        <span className="font-mono text-ink">{s.strs.length}</span> word{s.strs.length === 1 ? '' : 's'}
      </div>
      <ArrayRow values={baseChars} cellTone={tone} pointers={pointers} windowRange={s.matched > 0 ? [0, s.matched - 1] : null} />
      <div className={cn('mt-1 flex flex-col gap-[2px] font-mono', vizText.sm)}>
        {s.strs.map((w, j) => {
          const isActive = s.row === j;
          const chars = w.split('');
          return (
            <div key={j} className={cn(isActive ? 'text-ink' : 'text-ink3')}>
              <span className="text-ink3">w{j}:</span>{' '}
              {chars.map((ch, k) => {
                const inPrefix = k < s.matched;
                const atCol = s.col === k && isActive;
                return (
                  <span
                    key={k}
                    className={cn(inPrefix ? 'text-good' : atCol ? 'text-accent' : undefined)}
                  >
                    {ch}
                  </span>
                );
              })}
              {chars.length === 0 && <span className="text-ink3">∅</span>}
            </div>
          );
        })}
      </div>
      {s.result !== null && (
        <div className={cn('mt-1 font-mono', s.result === '' ? 'text-ink3' : 'text-good', vizText.base)}>
          → prefix = "{s.result}"
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LcpState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const base = s.strs.length > 0 ? s.strs[0] : '';
  return (
    <VarGrid>
      <InspectorRow k="words" v={s.strs.length} />
      <InspectorRow k="word 0" v={`"${base}"`} />
      <InspectorRow k="column (i)" v={s.col ?? '—'} />
      <InspectorRow k="checking word (j)" v={s.row ?? '—'} />
      <InspectorRow k="prefix length" v={s.matched} />
      <InspectorRow k="prefix" v={s.result !== null ? `"${s.result}"` : `"${base.slice(0, s.matched)}"`} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-longest-common-prefix';
export const title = 'Longest common prefix';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'lcp1', label: '["flower","flow","flight"]', value: { strs: ['flower', 'flow', 'flight'] } },
    { id: 'lcp2', label: '["dog","racecar","car"]', value: { strs: ['dog', 'racecar', 'car'] } },
  ] satisfies SampleInput<LcpInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LcpState | undefined;
    const prefix = s?.result ?? '';
    return { ok: prefix.length > 0, label: prefix.length > 0 ? `"${prefix}"` : 'no common prefix' };
  },
};

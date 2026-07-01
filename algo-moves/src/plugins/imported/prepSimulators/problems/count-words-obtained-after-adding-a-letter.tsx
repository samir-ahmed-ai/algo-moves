import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface WordCountInput {
  startWords: string[];
  targetWords: string[];
}

interface WordCountState {
  startWords: string[];
  targetWords: string[];
  startMasks: number[]; // bitmask set built from startWords
  ti: number | null; // index of the target word being examined
  chars: string[]; // current target word split into characters
  mask: number | null; // full bitmask of the current target word
  ci: number | null; // index of the character we try to remove
  probe: number | null; // mask with chars[ci] removed (mask ^ bit)
  hit: boolean; // did this probe land in the start set?
  matched: boolean[]; // per-target-word: did it become obtainable?
  count: number; // running count of obtainable target words
  done: boolean;
}

const toBitmask = (w: string): number => {
  let mask = 0;
  for (const c of w) mask |= 1 << (c.charCodeAt(0) - 97);
  return mask;
};

const maskToLetters = (mask: number): string => {
  let out = '';
  for (let b = 0; b < 26; b++) if (mask & (1 << b)) out += String.fromCharCode(97 + b);
  return out || '∅';
};

function record({ startWords, targetWords }: WordCountInput): Frame<WordCountState>[] {
  const frames: Frame<WordCountState>[] = [];
  const startMasks = startWords.map(toBitmask);
  const set = new Set<number>(startMasks);
  const matched = new Array<boolean>(targetWords.length).fill(false);
  let count = 0;

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<WordCountState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        startWords,
        targetWords,
        startMasks,
        ti: null,
        chars: [],
        mask: null,
        ci: null,
        probe: null,
        hit: false,
        matched: matched.slice(),
        count,
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${startWords.length} start, ${targetWords.length} target`,
    `Each word is reduced to a 26-bit mask (bit k set if letter 'a'+k appears). A target is obtainable when removing exactly one of its letters yields a mask that exists in the start-word set. Build that set first.`,
    {},
  );

  for (let ti = 0; ti < targetWords.length; ti++) {
    const w = targetWords[ti];
    const chars = w.split('');
    const mask = toBitmask(w);
    emit(
      'TARGET',
      `"${w}"`,
      `Target "${w}" has mask {${maskToLetters(mask)}}. Try removing each letter in turn and look the smaller mask up in the start set.`,
      { ti, chars, mask },
    );

    let found = false;
    for (let ci = 0; ci < chars.length; ci++) {
      const bit = 1 << (chars[ci].charCodeAt(0) - 97);
      const probe = mask ^ bit;
      const hit = set.has(probe);
      emit(
        hit ? 'MATCH' : 'PROBE',
        hit ? `drop '${chars[ci]}' ✓` : `drop '${chars[ci]}'`,
        hit
          ? `Removing '${chars[ci]}' gives mask {${maskToLetters(probe)}}, which IS a start word. So "${w}" can be built by adding '${chars[ci]}' — count it and stop scanning this word.`
          : `Removing '${chars[ci]}' gives mask {${maskToLetters(probe)}}, not in the start set. Keep trying other letters.`,
        { ti, chars, mask, ci, probe, hit },
        hit ? 'good' : undefined,
      );
      if (hit) {
        found = true;
        matched[ti] = true;
        count++;
        break;
      }
    }

    if (!found) {
      emit(
        'NONE',
        `"${w}" no`,
        `No single-letter removal of "${w}" matched a start word, so it is not obtainable. Move to the next target.`,
        { ti, chars, mask },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `count = ${count}`,
    `Every target word checked. ${count} of ${targetWords.length} target words can be formed by adding one letter to some start word.`,
    { done: true, count },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<WordCountState>) {
  const s = frame.state;
  const cells = s.chars.length ? s.chars : ['—'];
  const pointers: ArrayPointer[] = [];
  if (s.ci !== null && s.chars.length) {
    pointers.push({ i: s.ci, label: 'drop', tone: s.hit ? 'good' : 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (!s.chars.length) return '';
    if (s.hit && s.ci === i) return 'found';
    if (s.ci === i) return 'match';
    return '';
  };
  const probeLetters =
    s.probe !== null
      ? s.probe === 0
        ? '∅'
        : (() => {
            let out = '';
            for (let b = 0; b < 26; b++) if (s.probe! & (1 << b)) out += String.fromCharCode(97 + b);
            return out;
          })()
      : null;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        start set:{' '}
        <span className="font-mono text-ink">
          {s.startWords.map((w) => `"${w}"`).join(', ')}
        </span>
      </div>
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>
        target{s.ti !== null ? ` ${s.ti + 1}/${s.targetWords.length}` : ''}:{' '}
        <span className="font-mono text-ink">
          {s.ti !== null ? `"${s.targetWords[s.ti]}"` : '—'}
        </span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      {probeLetters !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, s.hit ? 'text-good' : 'text-ink3')}>
          probe mask = {'{'}
          {probeLetters}
          {'}'} {s.hit ? '→ in start set ✓' : '→ not found'}
        </div>
      )}
      <div className={cn('mt-1 font-mono', vizText.base, 'text-ink')}>count = {s.count}</div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<WordCountState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="start words" v={s.startWords.length} />
      <InspectorRow k="target words" v={s.targetWords.length} />
      <InspectorRow k="ti (target idx)" v={s.ti ?? '—'} />
      <InspectorRow k="target" v={s.ti !== null ? `"${s.targetWords[s.ti]}"` : '—'} />
      <InspectorRow k="drop char" v={s.ci !== null && s.chars[s.ci] ? `'${s.chars[s.ci]}'` : '—'} />
      <InspectorRow k="probe in set?" v={s.ci === null ? '—' : s.hit ? 'yes' : 'no'} />
      <InspectorRow k="count" v={s.count} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-count-words-obtained-after-adding-a-letter';
export const title = 'Count Words Obtained After Adding a Letter';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'cw1',
      label: 'start[ant,act,tack] → 2',
      value: { startWords: ['ant', 'act', 'tack'], targetWords: ['tack', 'act', 'acti'] },
    },
    {
      id: 'cw2',
      label: 'start[ab,a] → 1',
      value: { startWords: ['ab', 'a'], targetWords: ['abc', 'abcd'] },
    },
  ] satisfies SampleInput<WordCountInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WordCountState | undefined;
    const v = s?.count ?? 0;
    return { ok: true, label: `${v} word${v === 1 ? '' : 's'}` };
  },
};

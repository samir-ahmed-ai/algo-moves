import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface AnagramInput {
  s: string;
  p: string;
}

interface AnagramState {
  chars: string[]; // s split into characters
  p: string;
  pLen: number;
  diff: number[]; // 26-letter diff count (need[c] - have[c]); all-zero => anagram
  r: number | null; // right edge just added
  dropped: number | null; // index dropped out of the window (s[r-pLen])
  winLo: number | null; // window start
  winHi: number | null; // window end (inclusive)
  nonZero: number; // how many letters still off-balance
  found: number[]; // start indices recorded so far
  done: boolean;
}

const A = 'a'.charCodeAt(0);

function record({ s, p }: AnagramInput): Frame<AnagramState>[] {
  const chars = s.split('');
  const pLen = p.length;
  const frames: Frame<AnagramState>[] = [];
  const diff = new Array<number>(26).fill(0);
  const found: number[] = [];

  const countNonZero = () => diff.reduce((acc, d) => acc + (d === 0 ? 0 : 1), 0);

  const emit = (
    type: string,
    note: string,
    caption: string,
    over: Partial<AnagramState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        chars,
        p,
        pLen,
        diff: diff.slice(),
        r: null,
        dropped: null,
        winLo: null,
        winHi: null,
        nonZero: countNonZero(),
        found: found.slice(),
        done: false,
        ...over,
      },
    });

  if (pLen > s.length) {
    emit(
      'INIT',
      'p longer than s',
      `Pattern "${p}" (length ${pLen}) is longer than text "${s}" (length ${s.length}), so no window can hold it. The answer is the empty list.`,
      { done: true },
      'bad',
    );
    return frames;
  }

  // Seed diff with the pattern's letter counts (positive = still needed).
  for (let i = 0; i < pLen; i++) diff[p.charCodeAt(i) - A]++;
  emit(
    'SEED',
    `count "${p}"`,
    `Build a 26-letter balance from the pattern: each letter of "${p}" adds +1, meaning the window still "owes" that letter. A window is an anagram exactly when every count returns to 0.`,
    {},
  );

  for (let i = 0; i < chars.length; i++) {
    const inCh = chars[i];
    diff[inCh.charCodeAt(0) - A]--;
    emit(
      'ADD',
      `+ '${inCh}'`,
      `Stretch the window right to index ${i}: consume '${inCh}', so its balance drops by 1 (we just paid off one owed letter, or went into surplus).`,
      { r: i, winLo: Math.max(0, i - pLen + 1), winHi: i },
    );

    if (i >= pLen) {
      const outIdx = i - pLen;
      const outCh = chars[outIdx];
      diff[outCh.charCodeAt(0) - A]++;
      emit(
        'DROP',
        `- '${outCh}'`,
        `Window now exceeds length ${pLen}, so bite off the left letter '${outCh}' at index ${outIdx}: undo its effect by adding 1 back. The window stays exactly ${pLen} wide.`,
        { r: i, dropped: outIdx, winLo: i - pLen + 1, winHi: i },
      );
    }

    if (i >= pLen - 1) {
      const lo = i - pLen + 1;
      const nz = countNonZero();
      if (nz === 0) {
        found.push(lo);
        emit(
          'MATCH',
          `start ${lo}`,
          `Every letter count is 0 — the window s[${lo}..${i}] = "${s.slice(lo, i + 1)}" is an anagram of "${p}". Record start index ${lo}.`,
          { r: i, winLo: lo, winHi: i },
          'good',
        );
      } else {
        emit(
          'CHECK',
          `${nz} off`,
          `Check window s[${lo}..${i}] = "${s.slice(lo, i + 1)}": ${nz} letter${nz === 1 ? '' : 's'} still off-balance, so it is not an anagram. Slide on.`,
          { r: i, winLo: lo, winHi: i },
        );
      }
    }
  }

  emit(
    'DONE',
    found.length ? `[${found.join(', ')}]` : 'none',
    `Scan complete. Anagram start indices: ${found.length ? `[${found.join(', ')}]` : 'none'}. Time O(n), Space O(1) — a fixed 26-slot count regardless of input size.`,
    { done: true },
    found.length ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<AnagramState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'accent', place: 'above' });
  if (s.winLo !== null) pointers.push({ i: s.winLo, label: 'lo', tone: 'good', place: 'below' });
  if (s.dropped !== null) pointers.push({ i: s.dropped, label: 'drop', tone: 'bad', place: 'below' });

  const foundSet = new Set(s.found);
  const tone = (i: number) => {
    // Light up every cell that begins a recorded anagram window.
    if (foundSet.has(i)) return 'found';
    if (s.winLo !== null && s.winHi !== null && i >= s.winLo && i <= s.winHi) return 'match';
    return '';
  };

  const window: [number, number] | null =
    s.winLo !== null && s.winHi !== null ? [s.winLo, s.winHi] : null;

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        pattern p = <span className="font-mono text-ink">"{s.p}"</span> (len {s.pLen}) · off-balance ={' '}
        <span className="font-mono text-ink">{s.nonZero}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={window} />
      <div className={cn('mt-1 font-mono', vizText.sm, s.found.length ? 'text-good' : 'text-ink3')}>
        → starts [{s.found.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<AnagramState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const win =
    s.winLo !== null && s.winHi !== null
      ? `"${s.chars.slice(s.winLo, s.winHi + 1).join('')}"`
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="p" v={`"${s.p}"`} />
      <InspectorRow k="window len" v={s.pLen} />
      <InspectorRow k="r (right)" v={s.r ?? '—'} />
      <InspectorRow k="window" v={win} />
      <InspectorRow k="letters off" v={s.nonZero} />
      <InspectorRow k="matches" v={s.found.length ? `[${s.found.join(', ')}]` : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-find-anagram-substring-indices';
export const title = 'Find anagram substring indices';

function compute(s: string, p: string): number[] {
  if (p.length > s.length) return [];
  const diff = new Array<number>(26).fill(0);
  for (let i = 0; i < p.length; i++) diff[p.charCodeAt(i) - A]++;
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    diff[s.charCodeAt(i) - A]--;
    if (i >= p.length) diff[s.charCodeAt(i - p.length) - A]++;
    if (i >= p.length - 1 && diff.every((d) => d === 0)) out.push(i - p.length + 1);
  }
  return out;
}

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'aa1', label: 's="cbaebabacd", p="abc"', value: { s: 'cbaebabacd', p: 'abc' } },
    { id: 'aa2', label: 's="abab", p="ab"', value: { s: 'abab', p: 'ab' } },
  ] satisfies SampleInput<AnagramInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AnagramState | undefined;
    const result = s ? compute(s.chars.join(''), s.p) : [];
    return result.length
      ? { ok: true, label: `starts [${result.join(',')}]` }
      : { ok: false, label: 'no anagram' };
  },
};

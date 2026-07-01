import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayBars, type BarTone } from '../../../../components/ArrayBars';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MinDelInput {
  s: string;
}

interface MinDelState {
  s: string;
  // Sorted (ascending) frequency bars we actually animate. Each entry keeps the
  // letter it came from so the caption can name it; only positive counts survive.
  bars: number[]; // current freq value of each bar (mutates as we delete)
  letters: string[]; // letter label aligned with bars[]
  active: number | null; // bar index currently being processed
  used: number[]; // distinct counts already claimed (sorted for display)
  dels: number; // running deletion count
  done: boolean;
}

interface Bucket {
  letter: string;
  freq: number;
}

function record({ s }: MinDelInput): Frame<MinDelState>[] {
  // 1) Count frequencies over 26 letters (Space O(1)).
  const freq = new Array<number>(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i) - 97;
    if (c >= 0 && c < 26) freq[c]++;
  }

  // Build buckets for letters that actually appear, then sort ascending by
  // frequency (mirrors Go's sort.Ints on the freq slice, ignoring the zeros).
  const buckets: Bucket[] = [];
  for (let c = 0; c < 26; c++) {
    if (freq[c] > 0) buckets.push({ letter: String.fromCharCode(97 + c), freq: freq[c] });
  }
  buckets.sort((a, b) => a.freq - b.freq);

  const bars = buckets.map((b) => b.freq);
  const letters = buckets.map((b) => b.letter);

  const used = new Set<number>();
  let dels = 0;

  const { emit, frames } = createRecorder<MinDelState>(() => ({
        s: s,
        bars: bars.slice(),
        letters: letters,
        used: [...used].sort((a, b) => a - b),
        dels: dels,
        active: null,
        done: false
      }));

  const freqList = buckets.map((b) => `${b.letter}:${b.freq}`).join(', ') || '(none)';
  emit('INIT', `${buckets.length} letters`, `Minimum Deletions: every distinct letter's frequency must be unique. We count each letter's frequency and sort the counts ascending — ${freqList} — then process the tallest bars first, shrinking any count that collides with one we've already claimed.`, { active: null });

  // 2) Walk the sorted bars from the largest (rightmost) to the smallest. For
  //    each, while its count is positive and already claimed, delete one
  //    occurrence (decrement) and bump the deletion counter; then claim it.
  for (let i = bars.length - 1; i >= 0; i--) {
    const letter = letters[i];
    emit('VISIT', `${letter} = ${bars[i]}`, `Process letter '${letter}' with frequency ${bars[i]}. It is the largest count not yet handled, so it gets first pick — any earlier bar must dodge whatever count this one keeps.`, { active: i });

    while (bars[i] > 0 && used.has(bars[i])) {
      const before = bars[i];
      bars[i]--;
      dels++;
      emit('DELETE', `${letter} ${before}→${bars[i]}`, `Count ${before} is already taken by another letter, so delete one '${letter}': ${before} → ${bars[i]}. That is +1 deletion (total ${dels}). Keep shrinking until '${letter}' lands on a free count (or 0).`, { active: i }, 'bad');
    }

    if (bars[i] > 0) {
      used.add(bars[i]);
      emit('CLAIM', `claim ${bars[i]}`, `Frequency ${bars[i]} for '${letter}' is free, so claim it — no other letter may use ${bars[i]} now.`, { active: i }, 'good');
    } else {
      emit('ZERO', `${letter} → 0`, `'${letter}' shrank all the way to 0, meaning every occurrence was deleted. A count of 0 needs no claim — the letter simply disappears.`, { active: i });
    }
  }

  emit('DONE', `${dels} deletions`, `All counts are now unique. The minimum number of deletions to make every character frequency unique is ${dels}.`, { active: null , done: true }, 'good');

  return frames;
}

function View({ frame }: PluginViewProps<MinDelState>) {
  const s = frame.state;
  const tone = (i: number): BarTone => {
    if (s.active === i) {
      if (s.bars[i] === 0) return 'min';
      return s.used.includes(s.bars[i]) ? 'swap' : 'compare';
    }
    if (s.bars[i] > 0 && s.used.includes(s.bars[i])) return 'sorted';
    return 'idle';
  };
  const label = (i: number) => s.letters[i] ?? String(i);
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">&quot;{s.s}&quot;</span>
        {' · '}deletions ={' '}
        <span className={cn('font-mono', s.dels > 0 ? 'text-bad' : 'text-ink')}>{s.dels}</span>
      </div>
      {s.bars.length === 0 ? (
        <div className={cn('py-3 font-mono', vizText.sm, 'text-ink3')}>(no letters)</div>
      ) : (
        <ArrayBars values={s.bars} tone={tone} label={label} />
      )}
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        claimed {'{'}
        {s.used.join(', ')}
        {'}'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MinDelState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const activeLetter = s.active !== null ? s.letters[s.active] : null;
  return (
    <VarGrid>
      <InspectorRow k="bars (sorted)" v={s.bars.length ? s.bars.join(', ') : '—'} />
      <InspectorRow k="active" v={activeLetter ?? '—'} />
      <InspectorRow k="active count" v={s.active !== null ? s.bars[s.active] : '—'} />
      <InspectorRow k="claimed" v={s.used.length ? `{${s.used.join(', ')}}` : '∅'} />
      <InspectorRow k="deletions" v={s.dels} />
    </VarGrid>
  );
}

export const manifestId = 'prep-sorting-minimum-deletions-to-make-character-frequencies-unique';
export const title = 'Minimum Deletions to Make Character Frequencies Unique';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'md1', label: '"aab"', value: { s: 'aab' } },
    { id: 'md2', label: '"aaabbbcc"', value: { s: 'aaabbbcc' } },
  ] satisfies SampleInput<MinDelInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MinDelState | undefined;
    const d = s?.dels ?? 0;
    return { ok: true, label: `${d} deletion${d === 1 ? '' : 's'}` };
  },
};

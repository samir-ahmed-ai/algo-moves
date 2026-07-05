import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface HappyInput {
  a: number;
  b: number;
  c: number;
}

interface CountEntry {
  ch: string;
  cnt: number;
}

interface HappyState {
  res: string[]; // characters chosen so far, in order
  counts: CountEntry[]; // sorted-by-remaining view of the three letters
  pickIdx: number | null; // index into `counts` we just chose (in sorted order)
  skipIdx: number | null; // index we had to skip (would make 3-in-a-row)
  done: boolean;
}

const CHARS = ['a', 'b', 'c'] as const;

function record({ a, b, c }: HappyInput): Frame<HappyState>[] {  const res: string[] = [];
  // Mutable counts keyed by char; we re-sort a copy every round like the Go code.
  const counts: CountEntry[] = [
    { ch: 'a', cnt: a },
    { ch: 'b', cnt: b },
    { ch: 'c', cnt: c },
  ];

  const { emit, frames } = createRecorder<HappyState>(() => ({
        res: res.slice(),
        counts: [],
        pickIdx: null,
        skipIdx: null,
        done: false
      }));

  const sortedView = () => counts.slice().sort((x, y) => y.cnt - x.cnt);

  emit('INIT', `a=${a} b=${b} c=${c}`, `Longest Happy String: build the longest string using a=${a} 'a', b=${b} 'b', c=${c} 'c' with no three of the same letter in a row. Greedily, each round we try the letter with the most remaining.`, { counts: sortedView().map((e) => ({ ...e })), pickIdx: null, skipIdx: null, done: false });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const sorted = sortedView();
    let pick = -1;
    let skip: number | null = null;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].cnt === 0) continue;
      const n = res.length;
      if (n >= 2 && res[n - 1] === sorted[i].ch && res[n - 2] === sorted[i].ch) {
        // Would create three-in-a-row; remember the first such skip for teaching.
        if (skip === null) skip = i;
        continue;
      }
      pick = i;
      break;
    }

    if (pick === -1) {
      emit('DONE', `len=${res.length}`, `No letter can be appended — either everything is used up, or the only letters left would form three in a row. The happy string is "${res.join('')}" (length ${res.length}).`, { counts: sorted.map((e) => ({ ...e })), pickIdx: null, skipIdx: null, done: true }, 'good');
      break;
    }

    const chosen = sorted[pick].ch;
    if (skip !== null) {
      emit('SKIP', `skip ${sorted[skip].ch}`, `The highest-remaining letter '${sorted[skip].ch}' already sits at the tail twice ("${res
          .slice(-2)
          .join('')}"), so using it again would make three in a row. Skip it and drop to the next-best letter.`, { counts: sorted.map((e) => ({ ...e })), pickIdx: pick, skipIdx: skip, done: false });
    }

    // Append the chosen char and decrement its real count.
    res.push(chosen);
    const real = counts.find((e) => e.ch === chosen)!;
    real.cnt--;
    const after = sortedView();
    emit('PICK', `+${chosen}`, `Append '${chosen}' (the letter with the most remaining that is still legal here). It now has ${real.cnt} left. String so far: "${res.join('')}".`, { counts: after.map((e) => ({ ...e })), pickIdx: // locate the chosen char in the freshly-sorted view for the pointer
      after.findIndex((e) => e.ch === chosen), skipIdx: null, done: false });
  }

  return frames;
}

function View({ frame }: PluginViewProps<HappyState>) {
  const s = frame.state;
  const chars = s.res.length > 0 ? s.res : ['·'];
  // Colour the tail pair so the "no 3-in-a-row" rule is visible.
  const n = s.res.length;
  const tone = (i: number) => {
    if (s.res.length === 0) return '';
    if (s.done) return 'found';
    if (i === n - 1) return 'match';
    if (i === n - 2) return 'in-window';
    return '';
  };
  const pointers: ArrayPointer[] = [];
  if (n > 0) pointers.push({ i: n - 1, label: 'tail', tone: 'accent', place: 'above' });

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        remaining:{' '}
        {s.counts.map((e, k) => (
          <span key={e.ch} className="font-mono text-ink">
            {k > 0 ? ' · ' : ''}
            {e.ch}={e.cnt}
          </span>
        ))}
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.base, s.done ? 'text-good' : 'text-ink3')}>
        {s.done ? '→ ' : ''}"{s.res.join('')}"{s.done ? ` (len ${s.res.length})` : ''}
      </div>
      {!s.done && s.skipIdx !== null && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-bad')}>
          skip {s.counts[s.skipIdx]?.ch} (would be 3 in a row)
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<HappyState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const byChar = (ch: string) => s.counts.find((e) => e.ch === ch)?.cnt ?? 0;
  const tail = s.res.slice(-2).join('') || '—';
  return (
    <VarGrid>
      <InspectorRow k="remaining a" v={byChar('a')} />
      <InspectorRow k="remaining b" v={byChar('b')} />
      <InspectorRow k="remaining c" v={byChar('c')} />
      <InspectorRow k="length" v={s.res.length} />
      <InspectorRow k="tail (last 2)" v={tail} />
      <InspectorRow k="result" v={s.done ? `"${s.res.join('')}"` : '…'} />
    </VarGrid>
  );
}

function solve(a: number, b: number, c: number): string {
  const res: string[] = [];
  const counts: CountEntry[] = [
    { ch: 'a', cnt: a },
    { ch: 'b', cnt: b },
    { ch: 'c', cnt: c },
  ];
  for (;;) {
    const sorted = counts.slice().sort((x, y) => y.cnt - x.cnt);
    let pick = -1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].cnt === 0) continue;
      const n = res.length;
      if (n >= 2 && res[n - 1] === sorted[i].ch && res[n - 2] === sorted[i].ch) continue;
      pick = i;
      break;
    }
    if (pick === -1) break;
    const chosen = sorted[pick].ch;
    res.push(chosen);
    counts.find((e) => e.ch === chosen)!.cnt--;
  }
  return res.join('');
}

export const manifestId = 'prep-strings-longest-happy-string';
export const title = 'Longest Happy String';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'lhs1', label: 'a=1 b=1 c=7', value: { a: 1, b: 1, c: 7 } },
    { id: 'lhs2', label: 'a=2 b=2 c=1', value: { a: 2, b: 2, c: 1 } },
  ] satisfies SampleInput<HappyInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    void CHARS;
    const s = frames[frames.length - 1]?.state as HappyState | undefined;
    const str = s ? s.res.join('') : '';
    return { ok: str.length > 0, label: `"${str}" (len ${str.length})` };
  },
};

// Local reference implementation kept for parity/testing with the Go solution.
void solve;

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface RepeatedSubsInput {
  s: string;
  k: number;
}

interface RepeatedSubsState {
  chars: string[]; // the string split into characters, one per array cell
  k: number;
  i: number | null; // window start index (window is [i, i+k-1])
  sub: string | null; // the current length-k substring
  count: number | null; // seen[sub] after incrementing on this step
  seen: [string, number][]; // substring -> occurrence count so far
  out: string[]; // repeated substrings collected (emitted when count first hits 2)
  justEmitted: boolean; // this step pushed sub into out
  done: boolean;
}

function record({ s, k }: RepeatedSubsInput): Frame<RepeatedSubsState>[] {
  const chars = s.split('');
  const frames: Frame<RepeatedSubsState>[] = [];
  const seen = new Map<string, number>();
  const out: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    st: Partial<RepeatedSubsState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        chars,
        k,
        i: null,
        sub: null,
        count: null,
        seen: [...seen.entries()],
        out: out.slice(),
        justEmitted: false,
        done: false,
        ...st,
      },
    });

  emit(
    'INIT',
    `k=${k}`,
    `Find repeated substrings of size ${k}: slide a length-${k} window across "${s}", tally each substring in a hash map, and collect a substring the moment its count first reaches 2.`,
    {},
  );

  if (k === 0 || s.length < k) {
    emit(
      'DONE',
      'no windows',
      k === 0
        ? `k is 0, so there are no length-k substrings to scan. The answer is empty.`
        : `The string has length ${s.length}, which is shorter than k=${k}, so no window fits. The answer is empty.`,
      { done: true },
      'bad',
    );
    return frames;
  }

  for (let i = 0; i + k <= s.length; i++) {
    const sub = s.slice(i, i + k);
    emit(
      'WINDOW',
      `"${sub}"`,
      `Slide the window to start at index ${i}: the substring is s[${i}..${i + k - 1}] = "${sub}". Look it up in the map.`,
      { i, sub },
    );
    const next = (seen.get(sub) ?? 0) + 1;
    seen.set(sub, next);
    if (next === 2) {
      out.push(sub);
      emit(
        'REPEAT',
        `"${sub}" x2`,
        `seen["${sub}"] just went from 1 to 2 — this is the first time "${sub}" repeats, so add it to the result once.`,
        { i, sub, count: next, justEmitted: true },
        'good',
      );
    } else {
      emit(
        'TALLY',
        `count ${next}`,
        next === 1
          ? `First time we have seen "${sub}"; store seen["${sub}"] = 1 and keep sliding.`
          : `"${sub}" already counted (now ${next}); we only emit on the first repeat, so skip it and keep sliding.`,
        { i, sub, count: next },
      );
    }
  }

  emit(
    'DONE',
    out.length ? out.map((w) => `"${w}"`).join(', ') : 'none',
    out.length
      ? `Window reached the end. The substrings that repeated at least once are: ${out.map((w) => `"${w}"`).join(', ')}.`
      : `Window reached the end and no length-${k} substring ever repeated, so the result is empty.`,
    { done: true },
    out.length ? 'good' : undefined,
  );
  return frames;
}

function View({ frame }: PluginViewProps<RepeatedSubsState>) {
  const s = frame.state;
  const winEnd = s.i !== null ? s.i + s.k - 1 : -1;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
    if (winEnd !== s.i) pointers.push({ i: winEnd, label: 'i+k−1', tone: 'warn', place: 'below' });
  }
  const tone = (i: number) =>
    s.i !== null && i >= s.i && i <= winEnd ? (s.justEmitted ? 'found' : 'match') : '';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {s.sub !== null && !s.done && (
          <>
            {' · '}window ={' '}
            <span className="font-mono text-ink">"{s.sub}"</span>
            {s.count !== null && (
              <>
                {' · '}count ={' '}
                <span className="font-mono text-ink">{s.count}</span>
              </>
            )}
          </>
        )}
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={s.i !== null ? [s.i, winEnd] : null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        seen {'{'}
        {s.seen.map(([sub, c]) => `"${sub}":${c}`).join(', ')}
        {'}'}
      </div>
      <div className={cn('mt-1 font-mono', vizText.base, s.out.length ? 'text-good' : 'text-ink3')}>
        → [{s.out.map((w) => `"${w}"`).join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RepeatedSubsState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="i (window start)" v={s.i ?? '—'} />
      <InspectorRow k="substring" v={s.sub !== null ? `"${s.sub}"` : '—'} />
      <InspectorRow k="seen[sub]" v={s.count ?? '—'} />
      <InspectorRow k="distinct seen" v={s.seen.length} />
      <InspectorRow k="repeated found" v={s.out.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-find-repeated-substrings-size-k';
export const title = 'Find repeated substrings size K';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'frs1', label: '"banana", k=3', value: { s: 'banana', k: 3 } },
    { id: 'frs2', label: '"abcabc", k=2', value: { s: 'abcabc', k: 2 } },
  ] satisfies SampleInput<RepeatedSubsInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RepeatedSubsState | undefined;
    const out = s?.out ?? [];
    return out.length
      ? { ok: true, label: `[${out.map((w) => `"${w}"`).join(', ')}]` }
      : { ok: false, label: 'none' };
  },
};

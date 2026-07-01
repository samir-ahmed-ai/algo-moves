import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface AnagramInput {
  s: string;
  t: string;
}

interface AnagramState {
  s: string;
  t: string;
  i: number | null; // current index scanned in both strings
  cnt: [string, number][]; // shared tally: ++ for s, -- for t
  lenOk: boolean; // did the length precheck pass
  checkKey: string | null; // key being verified in the zero-check pass
  result: boolean | null; // final answer, null until decided
  done: boolean;
}

function record({ s, t }: AnagramInput): Frame<AnagramState>[] {  const cnt = new Map<string, number>();

  const { emit, frames } = createRecorder<AnagramState>(() => ({
        s,
        t,
        i: null,
        cnt: [...cnt.entries()],
        lenOk: s.length === t.length,
        checkKey: null,
        result: null,
        done: false
      }));

  emit(
    'INIT',
    `"${s}" vs "${t}"`,
    `Is Anagram: two strings are anagrams if they use exactly the same letters the same number of times. We keep one shared tally: ++ for every letter of s and -- for every letter of t. If every count cancels to zero, they match.`,
    {},
  );

  // Length precheck (Go: if len(s) != len(t) return false).
  if (s.length !== t.length) {
    emit(
      'LEN',
      `${s.length} ≠ ${t.length}`,
      `Length precheck: len(s) = ${s.length} but len(t) = ${t.length}. Different lengths can never be anagrams, so return false immediately.`,
      { result: false, done: true },
      'bad',
    );
    return frames;
  }

  emit(
    'LEN',
    `${s.length} = ${t.length}`,
    `Length precheck passed: both strings have length ${s.length}, so it is still possible for them to be anagrams. Now tally the letters.`,
    {},
  );

  // Single pass: ++cnt[s[i]], --cnt[t[i]].
  for (let i = 0; i < s.length; i++) {
    const cs = s[i];
    const ct = t[i];
    cnt.set(cs, (cnt.get(cs) ?? 0) + 1);
    cnt.set(ct, (cnt.get(ct) ?? 0) - 1);
    emit(
      'TALLY',
      `+${cs} −${ct}`,
      `Index ${i}: add s[${i}]='${cs}' (++) and subtract t[${i}]='${ct}' (−−). The tally now reads ${cnt.get(cs)! >= 0 ? '+' : ''}${cnt.get(cs)} for '${cs}' and ${cnt.get(ct)! >= 0 ? '+' : ''}${cnt.get(ct)} for '${ct}'.`,
      { i },
    );
  }

  // Verify every count is zero (Go: for _, v := range cnt).
  for (const [k, v] of cnt.entries()) {
    if (v !== 0) {
      emit(
        'CHECK',
        `${k}=${v}`,
        `Zero-check: letter '${k}' has a leftover count of ${v} (not zero), meaning s and t use it a different number of times. They are not anagrams — return false.`,
        { checkKey: k, result: false, done: true },
        'bad',
      );
      return frames;
    }
    emit(
      'CHECK',
      `${k}=0`,
      `Zero-check: letter '${k}' cancelled to 0 — s and t use it equally often. Keep checking the remaining letters.`,
      { checkKey: k },
    );
  }

  emit(
    'DONE',
    'anagram',
    `Every letter cancelled to zero, so s and t are made of exactly the same letters. They are anagrams — return true.`,
    { result: true, done: true },
    'good',
  );
  return frames;
}

function StrRow({
  label,
  str,
  active,
  tone,
}: {
  label: string;
  str: string;
  active: number | null;
  tone: 'accent' | 'good';
}) {
  const chars = str.split('');
  const cellTone = (i: number) => (active === i ? 'match' : '');
  const pointers: ArrayPointer[] =
    active !== null ? [{ i: active, label, tone, place: 'above' }] : [];
  return <ArrayRow values={chars} cellTone={cellTone} pointers={pointers} windowRange={null} />;
}

function View({ frame }: PluginViewProps<AnagramState>) {
  const s = frame.state;
  const tallyColor = (v: number) => (v === 0 ? 'text-ink3' : v > 0 ? 'text-accent' : 'text-bad');
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">"{s.s}"</span>
        {' · '}t = <span className="font-mono text-ink">"{s.t}"</span>
      </div>
      <div className={cn('mb-1', vizText.xs, 'text-ink3')}>s (++)</div>
      <StrRow label="i" str={s.s} active={s.i} tone="accent" />
      <div className={cn('mb-1 mt-2', vizText.xs, 'text-ink3')}>t (−−)</div>
      <StrRow label="i" str={s.t} active={s.i} tone="good" />
      <div className={cn('mt-2 flex flex-wrap gap-2 font-mono', vizText.sm)}>
        {s.cnt.length === 0 ? (
          <span className="text-ink3">tally {'{}'}</span>
        ) : (
          s.cnt.map(([k, v]) => (
            <span
              key={k}
              className={cn(
                'rounded px-1',
                s.checkKey === k && 'ring-1 ring-accent',
                tallyColor(v),
              )}
            >
              {k}:{v >= 0 ? `+${v}` : v}
            </span>
          ))
        )}
      </div>
      {s.result !== null && (
        <div className={cn('mt-2 font-mono', vizText.base, s.result ? 'text-good' : 'text-bad')}>
          → {String(s.result)}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<AnagramState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const nonZero = s.cnt.filter(([, v]) => v !== 0).length;
  return (
    <VarGrid>
      <InspectorRow k="len(s)" v={s.s.length} />
      <InspectorRow k="len(t)" v={s.t.length} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="s[i]" v={s.i !== null ? s.s[s.i] : '—'} />
      <InspectorRow k="t[i]" v={s.i !== null ? s.t[s.i] : '—'} />
      <InspectorRow k="nonzero counts" v={nonZero} />
      <InspectorRow k="result" v={s.result === null ? (s.done ? 'none' : '…') : String(s.result)} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-is-anagram';
export const title = 'Is anagram';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'ia1', label: '"anagram" vs "nagaram"', value: { s: 'anagram', t: 'nagaram' } },
    { id: 'ia2', label: '"rat" vs "car"', value: { s: 'rat', t: 'car' } },
  ] satisfies SampleInput<AnagramInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AnagramState | undefined;
    const ok = s?.result === true;
    return { ok, label: ok ? 'true (anagram)' : 'false (not anagram)' };
  },
};

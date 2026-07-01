import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText, VizStage, RailStack, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

interface CustomSortInput {
  order: string;
  s: string;
}

interface CountEntry {
  ch: string;
  n: number;
}

interface CustomSortState {
  order: string;
  s: string;
  counts: CountEntry[]; // remaining count for every distinct char (in stable display order)
  phase: 'init' | 'count' | 'order' | 'tail' | 'done';
  orderIdx: number | null; // index into `order` currently being emitted
  takeChar: string | null; // char just appended to result this step
  result: string;
  done: boolean;
}

const idx = (ch: string) => ch.charCodeAt(0) - 97;

function record({ order, s }: CustomSortInput): Frame<CustomSortState>[] {  const cnt = new Array<number>(26).fill(0);
  // Stable display order of distinct chars: order chars first, then any leftover chars from s.
  const display: string[] = [];
  const seen = new Set<string>();
  for (const c of order) {
    if (!seen.has(c)) {
      seen.add(c);
      display.push(c);
    }
  }
  for (const c of s) {
    if (!seen.has(c)) {
      seen.add(c);
      display.push(c);
    }
  }

  const snapshotCounts = (): CountEntry[] => display.map((ch) => ({ ch, n: cnt[idx(ch)] }));

  let result = '';

  const { emit, frames } = createRecorder<CustomSortState>(() => ({
        order: order,
        s: s,
        phase: 'count',
        orderIdx: null,
        takeChar: null,
        result: result,
        counts: snapshotCounts(),
        done: false
      }), {
    merge: (base, partial) => ({ ...base, counts: snapshotCounts(), ...partial }),
  });

  emit(
    'INIT',
    `order=${order}`,
    `Custom Sort String: rearrange "${s}" so its characters follow the precedence given by "${order}". Characters of s that don't appear in order keep any relative position, appended at the end. We do this by counting, not comparing.`,
    { phase: 'init' },
  );

  // Phase 1: count characters of s.
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    cnt[idx(c)]++;
    emit(
      'COUNT',
      `cnt[${c}]=${cnt[idx(c)]}`,
      `Tally character '${c}' from s. We now know there are ${cnt[idx(c)]} '${c}'(s) to place. Counting is O(1) space because there are at most 26 lowercase letters.`,
      { phase: 'count' },
    );
  }

  // Phase 2: emit chars in `order` precedence, draining their counts.
  for (let oi = 0; oi < order.length; oi++) {
    const c = order[oi];
    if (cnt[idx(c)] === 0) {
      emit(
        'SKIP',
        `'${c}' x0`,
        `'${c}' is next in the order but appears 0 times in s, so there is nothing to place. Move to the next ordered character.`,
        { phase: 'order', orderIdx: oi },
      );
      continue;
    }
    while (cnt[idx(c)] > 0) {
      result += c;
      cnt[idx(c)]--;
      emit(
        'TAKE',
        `+${c}`,
        `'${c}' comes next in the order and still has ${cnt[idx(c)] + 1} left, so append one '${c}' to the result and decrement its count to ${cnt[idx(c)]}. Result is now "${result}".`,
        { phase: 'order', orderIdx: oi, takeChar: c },
      );
    }
  }

  // Phase 3: append remaining chars (not in order) in alphabetical order.
  for (let i = 0; i < 26; i++) {
    while (cnt[i] > 0) {
      const c = String.fromCharCode(97 + i);
      result += c;
      cnt[i]--;
      emit(
        'TAIL',
        `+${c}`,
        `'${c}' never appeared in the order, so it goes after the ordered characters. Append one '${c}' (count → ${cnt[i]}). Result is now "${result}".`,
        { phase: 'tail', takeChar: c },
      );
    }
  }

  emit(
    'DONE',
    result || '(empty)',
    `Every counted character has been placed. The final string "${result}" follows the precedence in "${order}", with any unordered characters trailing. O(n) time, O(1) extra space.`,
    { phase: 'done', result, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<CustomSortState>) {
  const s = frame.state;
  const chars = s.s.split('');
  const pointers: ArrayPointer[] = [];
  if (s.phase === 'count') {
    const counted = s.counts.reduce((acc, e) => acc + e.n, 0);
    if (counted > 0 && counted <= chars.length) {
      pointers.push({ i: counted - 1, label: 'count', tone: 'accent', place: 'above' });
    }
  }
  const tone = (i: number) => {
    if (s.phase === 'count') {
      const counted = s.counts.reduce((acc, e) => acc + e.n, 0);
      return i < counted ? 'match' : '';
    }
    if (s.done) return 'found';
    return '';
  };
  const orderChars = s.order.split('');
  const remaining = s.counts.reduce((acc, e) => acc + e.n, 0);
  const countItems = s.counts.filter((e) => e.n > 0).map((e) => `${e.ch}:${e.n}`);
  const rail = (
    <>
      <RailStack label="counts" items={countItems.length ? countItems : []} />
      <RailGroup label="scan">
        <RailStat k="phase" v={s.phase} />
        <RailStat k="cur" v={s.orderIdx !== null ? s.order[s.orderIdx] : '—'} tone="accent" />
        <RailStat k="+char" v={s.takeChar ?? '—'} tone={s.takeChar ? 'accent' : undefined} />
        <RailStat k="left" v={remaining} />
      </RailGroup>
      <RailResult label="result" value={s.result ? `"${s.result}"` : s.done ? '""' : '…'} tone={s.done ? 'good' : 'accent'} />
    </>
  );
  return (
    <VizStage rail={rail}>
      <div className={cn(vizText.sm, 'text-ink3')}>
        order = <span className="font-mono text-ink">{s.order}</span> · s ={' '}
        <span className="font-mono text-ink">{s.s}</span>
      </div>
      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>
        order:{' '}
        {orderChars.map((c, oi) => (
          <span
            key={oi}
            className={cn(
              'font-mono',
              s.orderIdx === oi ? 'text-accent' : 'text-ink',
            )}
          >
            {c}
          </span>
        ))}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<CustomSortState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const remaining = s.counts.reduce((acc, e) => acc + e.n, 0);
  return (
    <VarGrid>
      <InspectorRow k="order" v={s.order} />
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="order[idx]" v={s.orderIdx !== null ? s.order[s.orderIdx] : '—'} />
      <InspectorRow k="just placed" v={s.takeChar ?? '—'} />
      <InspectorRow k="remaining" v={remaining} />
      <InspectorRow k="result" v={s.result ? `"${s.result}"` : s.done ? '""' : '…'} />
    </VarGrid>
  );
}

function computeAnswer({ order, s }: CustomSortInput): string {
  const cnt = new Array<number>(26).fill(0);
  for (const c of s) cnt[idx(c)]++;
  let res = '';
  for (const c of order) {
    while (cnt[idx(c)] > 0) {
      res += c;
      cnt[idx(c)]--;
    }
  }
  for (let i = 0; i < 26; i++) {
    while (cnt[i] > 0) {
      res += String.fromCharCode(97 + i);
      cnt[i]--;
    }
  }
  return res;
}

export const manifestId = 'prep-strings-custom-sort-string';
export const title = 'Custom Sort String';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'css1', label: 'order="cba", s="abcd"', value: { order: 'cba', s: 'abcd' } },
    { id: 'css2', label: 'order="bcafg", s="abcd"', value: { order: 'bcafg', s: 'abcd' } },
  ] satisfies SampleInput<CustomSortInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CustomSortState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    const expected = computeAnswer({ order: s.order, s: s.s });
    return { ok: s.result === expected, label: `"${s.result}"` };
  },
};

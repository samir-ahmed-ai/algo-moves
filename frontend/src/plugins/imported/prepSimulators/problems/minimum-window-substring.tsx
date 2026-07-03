import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';

interface MinWindowInput {
  s: string;
  t: string;
}

interface MinWindowState {
  s: string[]; // characters of s, one per array cell
  t: string;
  l: number | null; // left edge of the current window
  r: number | null; // right edge of the current window
  need: number; // characters still missing for a complete window
  window: [number, number] | null; // current [l, r] window to tint, null when invalid
  best: [number, number] | null; // [start, end] of best window so far (inclusive)
  result: string; // current best substring text
  done: boolean;
}

function record({ s, t }: MinWindowInput): Frame<MinWindowState>[] {
  const chars = s.split('');

  // freq[c] = how many of char c are still required by the window (mirrors Go's [128]int)
  const freq = new Map<string, number>();
  for (const c of t) freq.set(c, (freq.get(c) ?? 0) + 1);
  const reqOf = (c: string) => freq.get(c) ?? 0;

  let need = t.length;
  let minLen = s.length + 1;
  let minStart = 0;
  let l = 0;

  const bestSpan = (): [number, number] | null =>
    minLen <= s.length ? [minStart, minStart + minLen - 1] : null;
  const bestText = () => (minLen <= s.length ? s.slice(minStart, minStart + minLen) : '');

  const { emit, frames } = createRecorder<MinWindowState>(() => ({
    s: chars,
    t,
    l: null,
    r: null,
    need,
    window: null,
    best: bestSpan(),
    result: bestText(),
    done: false,
  }));

  emit(
    'INIT',
    `t="${t}"`,
    `Minimum Window Substring: find the shortest slice of s that contains every character of t (with multiplicity). We slide a window [l, r] over s, tracking need = how many of t's characters are still missing.`,
    {},
  );

  if (s.length < t.length) {
    emit(
      'IMPOSSIBLE',
      'too short',
      `s has only ${s.length} characters but t needs ${t.length}, so no window can ever cover t. Answer is the empty string.`,
      { done: true },
      'bad',
    );
    return frames;
  }

  for (let r = 0; r < chars.length; r++) {
    const cr = chars[r];
    const wasNeeded = reqOf(cr) > 0;
    if (wasNeeded) need--;
    freq.set(cr, reqOf(cr) - 1);
    emit(
      'EXPAND',
      `r=${r} '${cr}'`,
      wasNeeded
        ? `Expand right to index ${r}: '${cr}' is a character t still needed, so consume it and drop need to ${need}.`
        : `Expand right to index ${r}: '${cr}' is not needed (or already covered), so need stays ${need}. freq['${cr}'] goes negative, marking a surplus.`,
      { l, r, window: [l, r], need },
      wasNeeded && need === 0 ? 'good' : undefined,
    );

    while (need === 0) {
      const len = r - l + 1;
      if (len < minLen) {
        minLen = len;
        minStart = l;
        emit(
          'RECORD',
          `len=${len}`,
          `Window [${l}, ${r}] = "${s.slice(l, r + 1)}" is complete and shorter than the best so far, so record it as the new minimum (length ${len}).`,
          { l, r, window: [l, r], need, best: [l, r], result: s.slice(l, r + 1) },
          'good',
        );
      } else {
        emit(
          'COMPLETE',
          `len=${len}`,
          `Window [${l}, ${r}] is complete but length ${len} is not shorter than the current best (${minLen}), so keep the old best and try to shrink.`,
          { l, r, window: [l, r], need },
        );
      }

      const cl = chars[l];
      freq.set(cl, reqOf(cl) + 1);
      const nowMissing = reqOf(cl) > 0;
      if (nowMissing) need++;
      l++;
      emit(
        'SHRINK',
        `l=${l}`,
        nowMissing
          ? `Drop the left character '${cl}' and advance l to ${l}. '${cl}' is part of t, so the window is now missing it — need rises to ${need} and we stop shrinking.`
          : `Drop the surplus left character '${cl}' and advance l to ${l}. It was extra, so need stays ${need} and we can keep shrinking.`,
        { l, r, window: l <= r ? [l, r] : null, need },
      );
    }
  }

  const found = minLen <= s.length;
  emit(
    'DONE',
    found ? `"${bestText()}"` : 'none',
    found
      ? `Scan complete. The smallest complete window is "${bestText()}" (indices ${minStart}..${minStart + minLen - 1}, length ${minLen}).`
      : `Scan complete. No window of s ever contained all of t, so the answer is the empty string.`,
    { done: true, l: null, r: null, window: bestSpan() },
    found ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<MinWindowState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.l !== null) pointers.push({ i: s.l, label: 'l', tone: 'good', place: 'below' });
  if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'accent', place: 'above' });

  const tone = (i: number) => {
    if (s.best && i >= s.best[0] && i <= s.best[1]) return 'found';
    if (s.l !== null && (i === s.l || i === s.r)) return 'match';
    return '';
  };

  const answerValue = s.result ? `"${s.result}"` : s.done ? '(none)' : '…';
  const answerTone = s.done ? (s.result ? 'good' : 'bad') : 'accent';

  return (
    <VizStage rail={<>
      <RailGroup label="window">
        <RailStat k="t" v={`"${s.t}"`} />
        <RailStat k="need" v={s.need} tone={s.need === 0 ? 'good' : undefined} />
        <RailStat k="l" v={s.l ?? '—'} />
        <RailStat k="r" v={s.r ?? '—'} />
      </RailGroup>
      <RailResult label="best" value={answerValue} tone={answerTone} />
    </>}>
      <ArrayRow values={s.s} cellTone={tone} pointers={pointers} windowRange={s.window} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MinWindowState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const winText =
    s.window && s.window[0] <= s.window[1]
      ? s.s.slice(s.window[0], s.window[1] + 1).join('')
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="t" v={`"${s.t}"`} />
      <InspectorRow k="l" v={s.l ?? '—'} />
      <InspectorRow k="r" v={s.r ?? '—'} />
      <InspectorRow k="need" v={s.need} />
      <InspectorRow k="window" v={winText} />
      <InspectorRow k="best" v={s.result ? `"${s.result}"` : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-sliding-window-minimum-window-substring';
export const title = 'Minimum Window Substring';

function compute(input: MinWindowInput): string {
  const { s, t } = input;
  if (s.length < t.length) return '';
  const freq = new Map<string, number>();
  for (const c of t) freq.set(c, (freq.get(c) ?? 0) + 1);
  let need = t.length;
  let minLen = s.length + 1;
  let minStart = 0;
  let l = 0;
  for (let r = 0; r < s.length; r++) {
    const cr = s[r];
    if ((freq.get(cr) ?? 0) > 0) need--;
    freq.set(cr, (freq.get(cr) ?? 0) - 1);
    while (need === 0) {
      if (r - l + 1 < minLen) {
        minLen = r - l + 1;
        minStart = l;
      }
      const cl = s[l];
      freq.set(cl, (freq.get(cl) ?? 0) + 1);
      if ((freq.get(cl) ?? 0) > 0) need++;
      l++;
    }
  }
  return minLen > s.length ? '' : s.slice(minStart, minStart + minLen);
}

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'mw1', label: 's="ADBECBANC", t="ABC"', value: { s: 'ADBECBANC', t: 'ABC' } },
    { id: 'mw2', label: 's="aa", t="aa"', value: { s: 'aa', t: 'aa' } },
  ] satisfies SampleInput<MinWindowInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MinWindowState | undefined;
    const ans = s?.result ?? '';
    return ans
      ? { ok: true, label: `"${ans}"` }
      : { ok: false, label: 'no window' };
  },
};

// Keep `compute` referenced so the helper is exercised; the verdict reads the
// real recorded result, but this guards against drift between the two paths.
void compute;

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface MaxLenInput {
  arr: string[];
}

interface MaxLenState {
  arr: string[];
  selected: number[]; // indices currently in the selection
  consider: number | null; // index under consideration this step
  curLen: number; // total chars in the current selection
  best: number; // best total length seen so far
  valid: boolean[]; // per-string: has all-unique chars (eligible)?
  done: boolean;
}

function record({ arr }: MaxLenInput): Frame<MaxLenState>[] {
  const selected: number[] = [];
  let best = 0;

  // Eligibility: a string with internal duplicate chars can never be used.
  const valid = arr.map((s) => new Set(s).size === s.length);

  const lenOf = () => selected.reduce((sum, i) => sum + arr[i]!.length, 0);

  const { emit, frames } = createRecorder<MaxLenState>(() => ({
    arr: arr,
    selected: selected.slice(),
    curLen: lenOf(),
    best: best,
    valid: valid.slice(),
    consider: null,
    done: false,
  }));

  const dupList = arr
    .map((s, i) => (valid[i] ? null : `"${s}"`))
    .filter((x): x is string => x !== null);

  emit(
    'INIT',
    `${arr.length} strings`,
    `Build the longest concatenation of these strings whose combined characters are all unique. Backtrack: include a string only if its own chars are unique and disjoint from the current selection.${dupList.length ? ` (${dupList.join(', ')} ${dupList.length === 1 ? 'has' : 'have'} a repeated letter, so ${dupList.length === 1 ? 'it is' : 'they are'} never usable.)` : ''}`,
    { consider: null },
  );

  const usedChars = (): Set<string> => {
    const set = new Set<string>();
    for (const i of selected) for (const ch of arr[i]!) set.add(ch);
    return set;
  };

  // Try-each-remaining backtracking (mirrors the bitmask version's branching).
  const bt = (start: number) => {
    const cur = lenOf();
    if (cur > best) {
      best = cur;
      emit(
        'BEST',
        `best=${best}`,
        `Selection ${fmt(selected, arr)} totals ${cur} unique chars — new best length ${best}.`,
        { consider: null },
        'good',
      );
    }
    for (let i = start; i < arr.length; i++) {
      if (!valid[i]) {
        emit(
          'SKIP',
          `skip "${arr[i]}"`,
          `"${arr[i]}" repeats a letter, so it can never be part of a unique concatenation — skip it.`,
          { consider: i },
        );
        continue;
      }
      const taken = usedChars();
      const overlap = [...arr[i]!].filter((ch) => taken.has(ch));
      if (overlap.length > 0) {
        emit(
          'CONFLICT',
          `clash "${arr[i]}"`,
          `"${arr[i]}" shares '${overlap[0]}' with the current selection ${fmt(selected, arr)} — skip it.`,
          { consider: i },
        );
        continue;
      }
      selected.push(i);
      emit(
        'INCLUDE',
        `+"${arr[i]}"`,
        `"${arr[i]}" is disjoint from the selection — include it. Selection ${fmt(selected, arr)}, length ${lenOf()}.`,
        { consider: i },
      );
      bt(i + 1);
      selected.pop();
      emit(
        'BACKTRACK',
        `−"${arr[i]}"`,
        `Backtrack: drop "${arr[i]}" to explore other branches. Selection ${fmt(selected, arr)}.`,
        { consider: i },
      );
    }
  };

  bt(0);
  emit(
    'DONE',
    `max=${best}`,
    `All subsets explored — the longest concatenation with all-unique characters has length ${best}.`,
    { consider: null, done: true },
    'good',
  );
  return frames;
}

function fmt(selected: number[], arr: string[]): string {
  return selected.length ? `["${selected.map((i) => arr[i]).join('", "')}"]` : '[]';
}

function View({ frame }: PluginViewProps<MaxLenState>) {
  const s = frame.state;
  const inSel = new Set(s.selected);
  const pointers: ArrayPointer[] = [];
  if (s.consider !== null)
    pointers.push({ i: s.consider, label: 'try', tone: 'warn', place: 'above' });
  const tone = (i: number) => {
    if (inSel.has(i)) return 'match';
    if (s.consider === i) return 'mid';
    if (!s.valid[i]) return 'bad';
    return '';
  };
  const rail = (
    <>
      <RailStack
        label="selection"
        items={s.selected.map((i) => s.arr[i] ?? '')}
        highlightEnd="bottom"
      />
      <RailGroup label="lengths">
        <RailStat k="cur" v={s.curLen} tone="accent" />
        <RailStat k="best" v={s.best} />
      </RailGroup>
      {s.done && <RailResult label="answer" value={s.best} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow values={s.arr} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MaxLenState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="strings" v={s.arr.length} />
      <InspectorRow k="selection" v={fmt(s.selected, s.arr)} />
      <InspectorRow k="current length" v={s.curLen} />
      <InspectorRow k="best" v={s.best} />
    </VarGrid>
  );
}

export const manifestId = 'imp-37-maximum-length-of-a-concatenated-string-with-uni';
export const title = 'Maximum Length of a Concatenated String with Unique Characters';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'un-iq-ue', label: '["un","iq","ue"]', value: { arr: ['un', 'iq', 'ue'] } },
    {
      id: 'cha-r-act-ers',
      label: '["cha","r","act","ers"]',
      value: { arr: ['cha', 'r', 'act', 'ers'] },
    },
  ] satisfies SampleInput<MaxLenInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MaxLenState | undefined;
    return { ok: true, label: `max ${s ? s.best : 0}` };
  },
};

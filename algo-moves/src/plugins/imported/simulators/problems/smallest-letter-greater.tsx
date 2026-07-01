import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { InspectorRow, VarGrid, VizEmpty, VizStage, RailGroup, RailStat, RailResult } from '../../../_shared/vizKit';

interface LetterInput {
  letters: string[];
  target: string;
}

interface LetterState {
  letters: string[];
  target: string;
  lo: number;
  hi: number;
  mid: number | null;
  res: number | null;
  result: string | null;
  dead: boolean[];
  done: boolean;
}

function record({ letters, target }: LetterInput): Frame<LetterState>[] {
  const frames: Frame<LetterState>[] = [];
  const dead = new Array<boolean>(letters.length).fill(false);
  let lo = 0;
  let hi = letters.length - 1;
  let res: number | null = null;
  let result: string | null = null;

  const emit = (
    type: string,
    note: string,
    caption: string,
    mid: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { letters, target, lo, hi, mid, res, result, dead: dead.slice(), done: tone != null },
    });

  emit(
    'INIT',
    `lo=0 hi=${hi}`,
    `Upper-bound search over sorted letters for the smallest one strictly greater than '${target}'. Whenever letters[mid] > '${target}' we remember mid as a candidate and keep looking left for something even smaller.`,
    null,
  );

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    emit('MID', `mid=${mid}`, `Middle of the live window: mid=${mid}, letter '${letters[mid]}'.`, mid);
    if (letters[mid] > target) {
      res = mid;
      for (let i = mid; i <= hi; i++) dead[i] = true;
      hi = mid - 1;
      emit(
        'LEFT',
        `res=${mid} hi=${hi}`,
        `'${letters[mid]}' > '${target}', so it is a candidate — record res=${mid} and search the left half for an even smaller letter. Set hi = ${hi}.`,
        mid,
      );
    } else {
      for (let i = lo; i <= mid; i++) dead[i] = true;
      lo = mid + 1;
      emit(
        'RIGHT',
        `lo=${lo}`,
        `'${letters[mid]}' ≤ '${target}', so nothing here or to the left can beat it — search the right half. Set lo = ${lo}.`,
        mid,
      );
    }
  }

  if (res === null) {
    result = letters[0];
    emit(
      'WRAP',
      `wrap → '${result}'`,
      `No letter is greater than '${target}', so wrap around to the first letter '${result}'.`,
      null,
      'good',
    );
  } else {
    result = letters[res];
    emit(
      'DONE',
      `'${result}'`,
      `The smallest letter strictly greater than '${target}' is letters[${res}] = '${result}'.`,
      res,
      'good',
    );
  }
  return frames;
}

function View({ frame }: PluginViewProps<LetterState>) {
  const s = frame.state;
  const live = s.lo <= s.hi;
  const pointers: ArrayPointer[] = [];
  if (s.mid !== null) pointers.push({ i: s.mid, label: 'mid', tone: 'warn', place: 'above' });
  if (live) {
    pointers.push({ i: s.lo, label: 'lo', tone: 'accent', place: 'below' });
    pointers.push({ i: s.hi, label: 'hi', tone: 'bad', place: 'below' });
  }
  const winnerIdx = s.done && s.res !== null ? s.res : null;
  const tone = (i: number) => {
    if (winnerIdx === i) return 'found';
    if (s.mid === i) return 'mid';
    if (s.dead[i]) return 'dead';
    return '';
  };
  return (
    <VizStage rail={<>
      <RailGroup label="search">
        <RailStat k="target" v={`'${s.target}'`} />
        <RailStat k="lo" v={s.lo} tone="accent" />
        <RailStat k="hi" v={s.hi} tone="bad" />
        <RailStat k="mid" v={s.mid ?? '—'} tone="warn" />
        <RailStat k="res" v={s.res ?? '—'} />
      </RailGroup>
      {s.result !== null && (
        <RailResult label="answer" value={`'${s.result}'`} tone="good" />
      )}
    </>}>
      <ArrayRow values={s.letters} cellTone={tone} pointers={pointers} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LetterState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="target" v={`'${s.target}'`} />
      <InspectorRow k="lo" v={s.lo} />
      <InspectorRow k="hi" v={s.hi} />
      <InspectorRow k="mid" v={s.mid ?? '—'} />
      <InspectorRow k="candidate res" v={s.res ?? '—'} />
      <InspectorRow k="result" v={s.result !== null ? `'${s.result}'` : '…searching'} />
    </VarGrid>
  );
}

export const manifestId = 'imp-48-find-smallest-letter-greater-than-target';
export const title = 'Find Smallest Letter Greater Than Target';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'l1', label: "['c','f','j'], t='a'", value: { letters: ['c', 'f', 'j'], target: 'a' } },
    { id: 'l2', label: "['c','f','j'], t='c'", value: { letters: ['c', 'f', 'j'], target: 'c' } },
    { id: 'l3', label: "['c','f','j'], t='j' (wrap)", value: { letters: ['c', 'f', 'j'], target: 'j' } },
  ] satisfies SampleInput<LetterInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LetterState | undefined;
    return s && s.result !== null
      ? { ok: true, label: `'${s.result}'` }
      : { ok: false, label: '—' };
  },
};

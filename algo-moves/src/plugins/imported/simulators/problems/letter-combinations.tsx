import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, PathDisplay } from '../../../_shared/vizKit';

interface LettersInput {
  digits: string;
}

interface LettersState {
  digits: string;
  idx: number; // digit index currently being expanded
  path: string; // letters chosen so far
  results: string[];
  done: boolean;
}

const PHONE_PAD = ['0', '1', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];

function record({ digits }: LettersInput): Frame<LettersState>[] {
  const frames: Frame<LettersState>[] = [];
  const results: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    idx: number,
    path: string,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: { digits, idx, path, results: results.slice(), done: type === 'DONE' },
    });

  const mapping = digits
    .split('')
    .map((d) => `${d}→${PHONE_PAD[Number(d)]}`)
    .join('  ');

  emit(
    'INIT',
    `"${digits}"`,
    `Each digit maps to keypad letters (${mapping}). Take the Cartesian product: for each letter of the current digit, recurse to the next digit; when all ${digits.length} digits are placed, record the word.`,
    0,
    '',
  );

  const bt = (idx: number, path: string) => {
    if (idx === digits.length) {
      results.push(path);
      emit(
        'RECORD',
        `+"${path}"`,
        `All ${digits.length} digits placed — record the combination "${path}" (${results.length} so far).`,
        idx,
        path,
        'good',
      );
      return;
    }
    const letters = PHONE_PAD[Number(digits[idx])];
    for (let i = 0; i < letters.length; i++) {
      const ch = letters[i];
      emit(
        'CHOOSE',
        `'${ch}'`,
        `Digit ${digits[idx]} offers "${letters}". Pick '${ch}' and move to digit index ${idx + 1}. path = "${path + ch}".`,
        idx,
        path + ch,
      );
      bt(idx + 1, path + ch);
    }
  };

  bt(0, '');
  emit(
    'DONE',
    `${results.length} combos`,
    `Every letter at every digit explored — ${results.length} combinations for "${digits}".`,
    digits.length,
    '',
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LettersState>) {
  const s = frame.state;
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="idx" v={s.done ? '—' : s.idx} />
        <RailStat k="path" v={s.path ? `"${s.path}"` : '""'} tone="accent" />
      </RailGroup>
      <RailStack label="combinations" items={s.results} />
      {s.done && (
        <RailResult label="count" value={s.results.length} tone={s.results.length > 0 ? 'good' : 'bad'} />
      )}
    </>
  );
  return (
    <VizStage rail={rail} railWidth={150}>
      <PathDisplay value={s.path || '·'} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LettersState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const target = s.digits.split('').reduce((acc, d) => acc * PHONE_PAD[Number(d)].length, 1);
  return (
    <VarGrid>
      <InspectorRow k="digits" v={`"${s.digits}"`} />
      <InspectorRow k="digit idx" v={s.idx} />
      <InspectorRow k="path" v={`"${s.path}"`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target product" v={target} />
    </VarGrid>
  );
}

export const manifestId = 'imp-36-letter-combinations-of-a-phone-number';
export const title = 'Letter Combinations of a Phone Number';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'd23', label: 'digits = "23"', value: { digits: '23' } },
    { id: 'd2', label: 'digits = "2"', value: { digits: '2' } },
  ] satisfies SampleInput<LettersInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LettersState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} combos` };
  },
};

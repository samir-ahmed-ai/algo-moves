import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, PathDisplay, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

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
  return (
    <div className="board-area board-area--text">
      <div className={cn(vizText.sm, 'text-ink3')}>
        keypad ·{' '}
        {s.digits.split('').map((d, i) => (
          <span key={i} className="mr-2 font-mono text-ink2">
            {d}→{PHONE_PAD[Number(d)]}
          </span>
        ))}
      </div>
      <PathDisplay value={s.path || '·'} />
      <div className={cn(vizText.sm, 'text-ink2')}>
        {s.done ? `digits "${s.digits}" complete` : `expanding digit index ${s.idx} of ${s.digits.length}`}
      </div>
      <div className={cn('mt-3 text-ink3', vizText.sm)}>
        combinations found ({s.results.length})
        <div className="mt-1 flex flex-wrap gap-1.5">
          {s.results.map((r, i) => (
            <span key={i} className={cn('chip font-mono text-ink', vizText.sm)}>
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
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

export const simulator: DpSimulator = {
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

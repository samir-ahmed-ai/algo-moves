import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface LongestUniqueInput {
  s: string;
}

interface LongestUniqueState {
  chars: string[];
  l: number; // left edge of the current window
  r: number | null; // right edge (index just read); null before the scan
  jumped: number | null; // index left jumped past (the old duplicate), else null
  last: [string, number][]; // last-seen index per character stored so far
  windowLen: number | null; // r - l + 1 for the current window
  best: number; // best window length seen so far
  done: boolean;
}

function record({ s }: LongestUniqueInput): Frame<LongestUniqueState>[] {
  const chars = s.split('');
  const last = new Map<string, number>();
  let l = 0;
  let best = 0;

  const { emit, frames } = createPrepRecorder<LongestUniqueState>(() => ({
    chars,
    l,
    r: null,
    jumped: null,
    last: [...last.entries()],
    windowLen: null,
    best,
    done: false,
  }));

  emit(
    'INIT',
    `"${s}"`,
    `Longest substring with all-unique characters. Slide a window over "${s}" with left edge l and right edge r, remembering the last index each character appeared at. Whenever the incoming character was already inside the window, jump l past that old copy so the window stays duplicate-free.`,
    {},
  );

  for (let r = 0; r < chars.length; r++) {
    const c = chars[r]!;
    const idx = last.has(c!) ? last.get(c!)! : undefined;
    let jumped: number | null = null;

    if (idx !== undefined && idx >= l) {
      jumped = idx;
      l = idx + 1;
      emit(
        'JUMP',
        `l→${l}`,
        `'${c}' at index ${r} was last seen at index ${idx}, which is inside the window (index ${idx} ≥ l). That is a duplicate, so slide l to ${idx} + 1 = ${l} to drop the old '${c}' and keep every character unique.`,
        { r, jumped, l },
      );
    } else {
      emit(
        'READ',
        `read '${c}'`,
        `Read '${c}' at index ${r}. It is not present in the current window [${l}..${r}], so the window is still all-unique — no need to move l.`,
        { r },
      );
    }

    last.set(c!, r);
    const windowLen = r - l + 1;
    const improved = windowLen > best;
    if (improved) best = windowLen;
    emit(
      improved ? 'BEST' : 'RECORD',
      improved ? `best=${best}` : `len=${windowLen}`,
      improved
        ? `Record last['${c}']! = ${r}. The window [${l}..${r}] has length ${windowLen}, which beats the previous best, so best = ${windowLen}.`
        : `Record last['${c}']! = ${r}. The window [${l}..${r}] has length ${windowLen}, which does not beat the current best of ${best}.`,
      { r, windowLen, l, best },
      improved ? 'good' : undefined,
    );
  }

  emit(
    'DONE',
    `${best}`,
    `Scanned the whole string. The longest window that stayed all-unique had length ${best}.`,
    { done: true, best },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<LongestUniqueState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.r !== null && s.chars.length > 0) {
    pointers.push({ i: s.l, label: 'l', tone: 'accent', place: 'above' });
    pointers.push({ i: s.r, label: 'r', tone: 'good', place: 'below' });
  }
  const win: [number, number] | null = s.r !== null && s.r >= s.l ? [s.l, s.r] : null;
  const tone = (i: number) => {
    if (s.jumped !== null && i === s.jumped) return 'dead';
    if (win && i >= win[0]! && i <= win[1]!) return 'in-window';
    return '';
  };
  const lenLabel = s.windowLen !== null ? s.windowLen : s.r === null ? '—' : '…';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        best = <span className="font-mono text-ink">{s.best}</span>
        {' · '}window len = <span className="font-mono text-ink">{lenLabel}</span>
      </div>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={win} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        last {'{'}
        {s.last.map(([c, idx]) => `${c}:${idx}`).join(', ')}
        {'}'}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → longest unique = {s.best}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<LongestUniqueState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.r !== null && s.r >= 0 && s.r < s.chars.length ? s.chars[s.r]! : '—';
  return (
    <VarGrid>
      <InspectorRow k="l (left)" v={s.l} />
      <InspectorRow k="r (right)" v={s.r ?? '—'} />
      <InspectorRow k="char[r]!" v={cur} />
      <InspectorRow k="window len" v={s.windowLen ?? '—'} />
      <InspectorRow k="map size" v={s.last.length} />
      <InspectorRow k="best" v={s.best} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-longest-substring-with-unique';
export const title = 'Longest substring with unique';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Longest substring with unique"?',
    choices: [
      {
        label: 'Sliding window — fits this problem',
        correct: true,
      },
      {
        label: 'Split + Reverse — different approach',
      },
      {
        label: 'Sliding window freq — different approach',
      },
      {
        label: 'Counter — different approach',
      },
    ],
    explain: 'Window jumps its left edge past the last duplicate',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Longest substring with unique), what strategy is established?',
    choices: [
      {
        label: 'Window jumps its left edge past — described in INIT caption',
        correct: true,
      },
      {
        label: 'Precomputed final answer — before scanning input',
      },
      {
        label: 'Descending sort required — as mandatory first step',
      },
      {
        label: 'Every element visited upfront — marked from the start',
      },
    ],
    explain:
      'Longest substring with all-unique characters. Slide a window over "" with left edge l and right edge r, remembering the last index each character appeared at. Whenever the incoming character was already inside the window, jump l past that old copy so the window stays duplicate-free.',
  },
  {
    id: 'key-step',
    prompt: 'On the "READ" step (read \'\'), what happens?',
    choices: [
      {
        label: "Read '' at index . — this move caption",
        correct: true,
      },
      {
        label: 'Run terminates immediately — no further frames',
      },
      {
        label: 'Pointers reset to zero — restart scan',
      },
      {
        label: 'Remaining input skipped — early return path',
      },
    ],
    explain:
      "Read '' at index . It is not present in the current window [..], so the window is still all-unique — no need to move l.",
  },
  {
    id: 'state',
    prompt: 'What does the `l` field track in the visualization state?',
    choices: [
      {
        label: 'left edge of the current — updated each frame',
        correct: true,
      },
      {
        label: 'Fixed display label — unchanged each frame',
      },
      {
        label: 'Shuffle seed value — for random ordering',
      },
      {
        label: 'Failure error code — set once at end',
      },
    ],
    explain: 'The recorder keeps `l` in sync: left edge of the current window',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Longest substring with unique"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O( time, O(words) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). last[c]!>=l -> l=last[c]!+1; track r-l+1',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Scanned the whole string. The longest — final DONE caption',
        correct: true,
      },
      {
        label: 'Incomplete partial result — more steps needed',
      },
      {
        label: 'Input left unchanged — no mutations applied',
      },
      {
        label: 'Aborted run on failure — infinite loop detected',
      },
    ],
    explain: 'Scanned the whole string. The longest window that stayed all-unique had length .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'lsu1', label: '"abcabcbb" → 3', value: { s: 'abcabcbb' } },
    { id: 'lsu2', label: '"pwwkew" → 3', value: { s: 'pwwkew' } },
  ] satisfies SampleInput<LongestUniqueInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LongestUniqueState | undefined;
    const best = s ? s.best : 0;
    return { ok: true, label: `${best}` };
  },
};

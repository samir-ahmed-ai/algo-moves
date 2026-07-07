import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
} from '../../../_shared/vizKit';

interface AnagramInput {
  s: string;
  p: string;
}

interface AnagramState {
  chars: string[]; // s split into characters
  p: string;
  pLen: number;
  diff: number[]; // 26-letter diff count (need[c] - have[c]); all-zero => anagram
  r: number | null; // right edge just added
  dropped: number | null; // index dropped out of the window (s[r-pLen])
  winLo: number | null; // window start
  winHi: number | null; // window end (inclusive)
  nonZero: number; // how many letters still off-balance
  found: number[]; // start indices recorded so far
  done: boolean;
}

const A = 'a'.charCodeAt(0);

function record({ s, p }: AnagramInput): Frame<AnagramState>[] {
  const chars = s.split('');
  const pLen = p.length;
  const diff = new Array<number>(26).fill(0);
  const found: number[] = [];

  const countNonZero = () => diff.reduce((acc, d) => acc + (d === 0 ? 0 : 1), 0);

  const { emit, frames } = createRecorder<AnagramState>(() => ({
    chars,
    p,
    pLen,
    diff: diff.slice(),
    r: null,
    dropped: null,
    winLo: null,
    winHi: null,
    nonZero: countNonZero(),
    found: found.slice(),
    done: false,
  }));

  if (pLen > s.length) {
    emit(
      'INIT',
      'p longer than s',
      `Pattern "${p}" (length ${pLen}) is longer than text "${s}" (length ${s.length}), so no window can hold it. The answer is the empty list.`,
      { done: true },
      'bad',
    );
    return frames;
  }

  // Seed diff with the pattern's letter counts (positive = still needed).
  for (let i = 0; i < pLen; i++) diff[p.charCodeAt(i) - A]++;
  emit(
    'SEED',
    `count "${p}"`,
    `Build a 26-letter balance from the pattern: each letter of "${p}" adds +1, meaning the window still "owes" that letter. A window is an anagram exactly when every count returns to 0.`,
    {},
  );

  for (let i = 0; i < chars.length; i++) {
    const inCh = chars[i];
    diff[inCh.charCodeAt(0) - A]--;
    emit(
      'ADD',
      `+ '${inCh}'`,
      `Stretch the window right to index ${i}: consume '${inCh}', so its balance drops by 1 (we just paid off one owed letter, or went into surplus).`,
      { r: i, winLo: Math.max(0, i - pLen + 1), winHi: i },
    );

    if (i >= pLen) {
      const outIdx = i - pLen;
      const outCh = chars[outIdx];
      diff[outCh.charCodeAt(0) - A]++;
      emit(
        'DROP',
        `- '${outCh}'`,
        `Window now exceeds length ${pLen}, so bite off the left letter '${outCh}' at index ${outIdx}: undo its effect by adding 1 back. The window stays exactly ${pLen} wide.`,
        { r: i, dropped: outIdx, winLo: i - pLen + 1, winHi: i },
      );
    }

    if (i >= pLen - 1) {
      const lo = i - pLen + 1;
      const nz = countNonZero();
      if (nz === 0) {
        found.push(lo);
        emit(
          'MATCH',
          `start ${lo}`,
          `Every letter count is 0 — the window s[${lo}..${i}] = "${s.slice(lo, i + 1)}" is an anagram of "${p}". Record start index ${lo}.`,
          { r: i, winLo: lo, winHi: i },
          'good',
        );
      } else {
        emit(
          'CHECK',
          `${nz} off`,
          `Check window s[${lo}..${i}] = "${s.slice(lo, i + 1)}": ${nz} letter${nz === 1 ? '' : 's'} still off-balance, so it is not an anagram. Slide on.`,
          { r: i, winLo: lo, winHi: i },
        );
      }
    }
  }

  emit(
    'DONE',
    found.length ? `[${found.join(', ')}]` : 'none',
    `Scan complete. Anagram start indices: ${found.length ? `[${found.join(', ')}]` : 'none'}. Time O(n), Space O(1) — a fixed 26-slot count regardless of input size.`,
    { done: true },
    found.length ? 'good' : 'bad',
  );
  return frames;
}

function View({ frame }: PluginViewProps<AnagramState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.r !== null) pointers.push({ i: s.r, label: 'r', tone: 'accent', place: 'above' });
  if (s.winLo !== null) pointers.push({ i: s.winLo, label: 'lo', tone: 'good', place: 'below' });
  if (s.dropped !== null)
    pointers.push({ i: s.dropped, label: 'drop', tone: 'bad', place: 'below' });

  const foundSet = new Set(s.found);
  const tone = (i: number) => {
    if (foundSet.has(i)) return 'found';
    if (s.winLo !== null && s.winHi !== null && i >= s.winLo && i <= s.winHi) return 'match';
    return '';
  };

  const window: [number, number] | null =
    s.winLo !== null && s.winHi !== null ? [s.winLo, s.winHi] : null;

  const rail = (
    <>
      <RailGroup label="pattern">
        <RailStat k="p" v={`"${s.p}"`} />
        <RailStat k="len" v={s.pLen} />
      </RailGroup>
      <RailGroup label="window">
        <RailStat
          k="off"
          v={s.nonZero}
          tone={s.nonZero === 0 && s.r !== null ? 'good' : 'accent'}
        />
      </RailGroup>
      <RailResult
        label="starts"
        value={s.found.length ? `[${s.found.join(', ')}]` : s.done ? 'none' : '…'}
        tone={s.done ? (s.found.length ? 'good' : 'bad') : 'accent'}
      />
    </>
  );

  return (
    <VizStage rail={rail} railWidth={150}>
      <ArrayRow values={s.chars} cellTone={tone} pointers={pointers} windowRange={window} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<AnagramState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const win =
    s.winLo !== null && s.winHi !== null
      ? `"${s.chars.slice(s.winLo, s.winHi + 1).join('')}"`
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="p" v={`"${s.p}"`} />
      <InspectorRow k="window len" v={s.pLen} />
      <InspectorRow k="r (right)" v={s.r ?? '—'} />
      <InspectorRow k="window" v={win} />
      <InspectorRow k="letters off" v={s.nonZero} />
      <InspectorRow
        k="matches"
        v={s.found.length ? `[${s.found.join(', ')}]` : s.done ? 'none' : '…'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-find-anagram-substring-indices';
export const title = 'Find anagram substring indices';

function compute(s: string, p: string): number[] {
  if (p.length > s.length) return [];
  const diff = new Array<number>(26).fill(0);
  for (let i = 0; i < p.length; i++) diff[p.charCodeAt(i) - A]++;
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    diff[s.charCodeAt(i) - A]--;
    if (i >= p.length) diff[s.charCodeAt(i - p.length) - A]++;
    if (i >= p.length - 1 && diff.every((d) => d === 0)) out.push(i - p.length + 1);
  }
  return out;
}

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find anagram substring indices"?',
    choices: [
      {
        label: 'Sliding window freq — fits this problem',
        correct: true,
      },
      {
        label: 'Greedy Line Packing — different approach',
      },
      {
        label: 'Vertical scan — different approach',
      },
      {
        label: 'Split + Reverse — different approach',
      },
    ],
    explain: '26-count window slides; all-zero counts means anagram here',
  },
  {
    id: 'key-step',
    prompt: 'On the "DROP" step (- \'\'), what happens?',
    choices: [
      {
        label: 'Window now exceeds length  — this move caption',
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
      "Window now exceeds length , so bite off the left letter '' at index : undo its effect by adding 1 back. The window stays exactly  wide.",
  },
  {
    id: 'state',
    prompt: 'What does the `chars` field track in the visualization state?',
    choices: [
      {
        label: 's split into characters — updated each frame',
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
    explain: 'The recorder keeps `chars` in sync: s split into characters',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find anagram substring indices"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n*m) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(m·n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O( time, O(words) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). add s[r], drop s[r-len(p)]; all-zero -> record start',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Check window s[..] = "": letter — final DONE caption',
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
    explain:
      'Check window s[..] = "":  letter still off-balance, so it is not an anagram. Slide on.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'aa1', label: 's="cbaebabacd", p="abc"', value: { s: 'cbaebabacd', p: 'abc' } },
    { id: 'aa2', label: 's="abab", p="ab"', value: { s: 'abab', p: 'ab' } },
  ] satisfies SampleInput<AnagramInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as AnagramState | undefined;
    const result = s ? compute(s.chars.join(''), s.p) : [];
    return result.length
      ? { ok: true, label: `starts [${result.join(',')}]` }
      : { ok: false, label: 'no anagram' };
  },
};

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface GuessInput {
  secret: string;
  words: string[];
}

interface GuessState {
  secret: string;
  cands: string[];
  guess: string;
  matches: number;
  round: number;
  found: boolean;
  op: string;
  done: boolean;
}

function matchCount(a: string, b: string): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) if (a[i]! === b[i]!) c++;
  return c;
}

function record({ secret, words }: GuessInput): Frame<GuessState>[] {
  let cands = [...words];
  let found = false;

  const { emit, frames } = createPrepRecorder<GuessState>(() => ({
    secret,
    cands: cands.slice(),
    guess: '',
    matches: 0,
    round: 0,
    found,
    op: '',
    done: false,
  }));

  emit(
    'INIT',
    `${words.length} words`,
    `Guess the Word: filter candidates by match count with each guess. Master returns positions where guess[i]!==secret[i]!.`,
    {},
  );

  for (let round = 0; round < 10 && cands.length > 0; round++) {
    const guess = cands[0]!;
    const m = matchCount(guess!, secret);
    if (m === guess!.length) {
      found = true;
      emit(
        'WIN',
        guess!,
        `Guess "${guess}": ${m}/${guess!.length} matches → secret found!`,
        { guess, matches: m, round: round + 1, found: true, op: guess },
        'good',
      );
      break;
    }
    emit(
      'GUESS',
      `${guess} → ${m}`,
      `Round ${round + 1}: guess "${guess}", master returns ${m} match(es). Filter words with same overlap.`,
      { guess, matches: m, round: round + 1, op: guess },
    );
    cands = cands.filter((w) => w !== guess && matchCount(w, guess!) === m);
    emit(
      'FILTER',
      `${cands.length} left`,
      `Keep words w≠guess where match(w, guess)=${m}. ${cands.length} candidate(s) remain.`,
      { guess, matches: m, round: round + 1, cands: cands.slice(), op: `${cands.length} cands` },
    );
  }

  emit(
    'DONE',
    found ? 'found' : `${cands.length} left`,
    found ? `Secret "${secret}" found.` : `Stopped with ${cands.length} candidate(s).`,
    { op: 'done', done: true, found },
    found ? 'good' : undefined,
  );
  return frames;
}

function View({ frame }: PluginViewProps<GuessState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.op || '—'}
        {s.found && <span className="ml-2 font-mono text-good">found!</span>}
      </div>
      {s.guess && (
        <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink')}>
          guess: {s.guess} · matches: {s.matches}
        </div>
      )}
      <div className={cn('mt-2', vizText.sm, 'text-ink3')}>{s.cands.length} candidate(s)</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {s.cands.slice(0, 12).map((w) => (
          <span
            key={w}
            className={cn(
              'rounded border px-2 py-0.5 font-mono',
              vizText.sm,
              w === s.guess ? 'border-accent bg-accentbg' : 'border-edge',
            )}
          >
            {w}
          </span>
        ))}
        {s.cands.length > 12 && <span className={cn(vizText.sm, 'text-ink3')}>…</span>}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<GuessState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="round" v={s.round || '—'} />
      <InspectorRow k="guess" v={s.guess || '—'} />
      <InspectorRow k="matches" v={s.matches || '—'} />
      <InspectorRow k="candidates" v={s.cands.length} />
      <InspectorRow k="found" v={s.found ? 'yes' : 'no'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-design-guess-the-word';
export const title = 'Guess the Word';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Guess the Word"?',
    choices: [
      {
        label: 'Design — fits this problem',
        correct: true,
      },
      {
        label: 'Heap + Sorted Available Set — different approach',
      },
      {
        label: 'Trie phone directory autocomplete — different approach',
      },
      {
        label: 'Jump Array — different approach',
      },
    ],
    explain: 'See Guess The Word pattern',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Guess the Word), what strategy is established?',
    choices: [
      {
        label: 'See Guess The Word pattern — described in INIT caption',
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
      'Guess the Word: filter candidates by match count with each guess. Master returns positions where guess[i]!==secret[i]!.',
  },
  {
    id: 'key-step',
    prompt: 'On the "FILTER" step ( left), what happens?',
    choices: [
      {
        label: 'Keep words w≠guess where match(w, guess)=. — this move caption',
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
    explain: 'Keep words w≠guess where match(w, guess)=.  candidate(s) remain.',
  },
  {
    id: 'state',
    prompt: 'What does the `secret` field track in the visualization state?',
    choices: [
      {
        label: 'Field secret in state — updated each frame',
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
    explain:
      'The recorder snapshots `secret` on every emit so each frame shows the algorithm mid-step.',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Keep words w≠guess where match(w, guess)=. — final DONE caption',
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
    explain: 'Keep words w≠guess where match(w, guess)=.  candidate(s) remain.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'gw1',
      label: '6-letter word list',
      value: {
        secret: 'acckzz',
        words: ['acckzz', 'ccbazz', 'eiowzz', 'abcczz'],
      },
    },
  ] satisfies SampleInput<GuessInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as GuessState | undefined;
    return s?.done
      ? { ok: true, label: s.found ? 'found' : `${s.cands.length} left` }
      : { ok: false, label: 'incomplete' };
  },
};

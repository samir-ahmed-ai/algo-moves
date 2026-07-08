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
import {
  InspectorRow,
  VarGrid,
  VizEmpty,
  VizStage,
  RailGroup,
  RailStat,
  vizText,
} from '../../../_shared/vizKit';

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
  const rail = (
    <>
      <RailGroup label="op">
        <RailStat k="cmd" v={s.op || '—'} tone="accent" />
        {s.found && <RailStat k="status" v="found!" tone="good" />}
      </RailGroup>
      {s.guess && (
        <RailGroup label="guess">
          <RailStat k="word" v={s.guess} />
          <RailStat k="match" v={s.matches} />
        </RailGroup>
      )}
      <RailGroup label="cands">
        <RailStat k="count" v={s.cands.length} />
      </RailGroup>
    </>
  );
  return (
    <VizStage rail={rail} railWidth={168}>
      <div className="flex flex-wrap gap-1">
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
    </VizStage>
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
    prompt: 'How does Guess the Word narrow the secret?',
    choices: [
      {
        label: 'Filter candidates — keep words matching master overlap count',
        correct: true,
      },
      {
        label: 'Digit trie autocomplete — prefix walk returns names',
      },
      {
        label: 'Merge-walk sparse pairs — multiply matching indices',
      },
      {
        label: 'Call stack timing — credit elapsed to active function',
      },
    ],
    explain:
      'Each guess compares position matches with the secret; survivors must share that same count.',
  },
  {
    id: 'key-step',
    prompt: 'On the FILTER step after a guess, which words remain?',
    choices: [
      {
        label: 'w ≠ guess and match(w, guess) equals master count — shrink pool',
        correct: true,
      },
      {
        label: 'Only the guessed word — discard every other candidate',
      },
      {
        label: 'Words longer than guess — drop shorter candidates first',
      },
      {
        label: 'Alphabetical first half — binary partition by lex order',
      },
    ],
    explain:
      'The filter removes the guessed word and keeps words whose overlap with it equals the reported matches.',
  },
  {
    id: 'complexity',
    prompt: 'What are typical bounds for Guess the Word?',
    choices: [
      {
        label: 'O(rounds × words × len) time, O(words) space — scan and filter',
        correct: true,
      },
      {
        label: 'O(1) per guess, O(1) space — constant candidate pool',
      },
      {
        label: 'O(log n) pick, O(n) space — prefix-sum binary search',
      },
      {
        label: 'O(total painted) time, O(max coord) space — jump array walk',
      },
    ],
    explain:
      'Each round scans candidates comparing every character position against the current guess.',
  },
  {
    id: 'edge',
    prompt: 'When does the simulation stop early with a WIN frame?',
    choices: [
      {
        label: 'All positions match guess length — secret equals current guess',
        correct: true,
      },
      {
        label: 'Candidate list empty — no words left after filtering',
      },
      {
        label: 'Ten rounds elapsed — always stop regardless of matches',
      },
      {
        label: 'First guess chosen — win declared before master responds',
      },
    ],
    explain:
      'When matchCount equals guess.length, the recorder emits WIN and breaks out of the round loop.',
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

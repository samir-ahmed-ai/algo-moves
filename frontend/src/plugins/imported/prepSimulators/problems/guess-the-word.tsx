import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
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
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) c++;
  return c;
}

function record({ secret, words }: GuessInput): Frame<GuessState>[] {  let cands = [...words];
  let found = false;

  const { emit, frames } = createRecorder<GuessState>(() => ({
        secret,
        cands: cands.slice(),
        guess: '',
        matches: 0,
        round: 0,
        found,
        op: '',
        done: false
      }));

  emit(
    'INIT',
    `${words.length} words`,
    `Guess the Word: filter candidates by match count with each guess. Master returns positions where guess[i]==secret[i].`,
    {},
  );

  for (let round = 0; round < 10 && cands.length > 0; round++) {
    const guess = cands[0];
    const m = matchCount(guess, secret);
    if (m === guess.length) {
      found = true;
      emit(
        'WIN',
        guess,
        `Guess "${guess}": ${m}/${guess.length} matches → secret found!`,
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
    cands = cands.filter((w) => w !== guess && matchCount(w, guess) === m);
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

export const simulator: ProblemSimulator = {
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
    return s?.done ? { ok: true, label: s.found ? 'found' : `${s.cands.length} left` } : { ok: false, label: 'incomplete' };
  },
};

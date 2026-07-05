import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MatchInput {
  s: string;
  words: string[];
}

/** A word still being matched, plus how far it has advanced. */
interface WordCursor {
  word: string;
  idx: number; // index of the next char this word still needs
}

/** Buckets keyed by "next needed char" → list of waiting word cursors. */
type Buckets = Record<string, WordCursor[]>;

interface MatchState {
  s: string; // the source string, one char per array cell
  i: number | null; // current scan index into s
  ch: string | null; // character s[i] we are handling
  buckets: Buckets; // snapshot of every "next char" → waiting words
  pulled: WordCursor[]; // cursors pulled out of bucket[ch] this step
  active: WordCursor | null; // the cursor being advanced right now
  matched: string[]; // words that completed (became subsequences)
  count: number; // matched.length — the running answer
  done: boolean;
}

/** Deep-copy the bucket map so each frame holds an independent snapshot. */
function snapshot(buckets: Buckets): Buckets {
  const out: Buckets = {};
  for (const key of Object.keys(buckets)) {
    out[key] = buckets[key].map((c) => ({ word: c.word, idx: c.idx }));
  }
  return out;
}

function record({ s, words }: MatchInput): Frame<MatchState>[] {  const buckets: Buckets = {};
  const matched: string[] = [];

  const { emit, frames } = createRecorder<MatchState>(() => ({
        s,
        i: null,
        ch: null,
        buckets: snapshot(buckets),
        pulled: [],
        active: null,
        matched: matched.slice(),
        count: matched.length,
        done: false
      }));

  // Seed each word into the bucket keyed by its first character.
  for (const w of words) {
    const first = w[0];
    (buckets[first] ??= []).push({ word: w, idx: 0 });
  }
  emit(
    'INIT',
    `${words.length} words`,
    `Number of Matching Subsequences: count how many of the ${words.length} words are subsequences of "${s}". Each word waits in the bucket of the next character it needs; every word starts in the bucket of its first letter.`,
    {},
  );

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const nodes = buckets[ch] ?? [];
    // Match the Go `delete(buckets, s[i])`: pull the whole bucket out.
    delete buckets[ch];

    if (nodes.length === 0) {
      emit(
        'SKIP',
        `'${ch}' empty`,
        `s[${i}] = '${ch}'. No word is currently waiting on '${ch}', so nothing advances here — just move to the next character.`,
        { i, ch, pulled: [] },
      );
      continue;
    }

    emit(
      'PULL',
      `'${ch}' ×${nodes.length}`,
      `s[${i}] = '${ch}'. Pull every word waiting on '${ch}' out of its bucket — ${nodes.length} word(s): ${nodes
        .map((c) => `"${c.word}"`)
        .join(', ')}. Each one gets to advance past its '${ch}'.`,
      { i, ch, pulled: nodes.map((c) => ({ word: c.word, idx: c.idx })) },
    );

    for (const nd of nodes) {
      const advanced: WordCursor = { word: nd.word, idx: nd.idx + 1 };
      if (advanced.idx === advanced.word.length) {
        matched.push(advanced.word);
        emit(
          'MATCH',
          `"${advanced.word}"`,
          `"${advanced.word}" consumed its last character '${ch}' — it is a full subsequence of "${s}". Count it. Total so far: ${matched.length}.`,
          {
            i,
            ch,
            pulled: nodes.map((c) => ({ word: c.word, idx: c.idx })),
            active: advanced,
          },
          'good',
        );
      } else {
        const next = advanced.word[advanced.idx];
        (buckets[next] ??= []).push(advanced);
        emit(
          'REBUCKET',
          `"${advanced.word}"→'${next}'`,
          `"${advanced.word}" advanced past '${ch}'; the next character it needs is '${next}'. Re-file it into the '${next}' bucket to wait for a later match.`,
          {
            i,
            ch,
            pulled: nodes.map((c) => ({ word: c.word, idx: c.idx })),
            active: advanced,
          },
        );
      }
    }
  }

  emit(
    'DONE',
    `${matched.length} matched`,
    `Finished scanning "${s}". ${matched.length} of ${words.length} word(s) were subsequences${
      matched.length ? `: ${matched.map((w) => `"${w}"`).join(', ')}` : ''
    }.`,
    { done: true },
    matched.length > 0 ? 'good' : 'bad',
  );
  return frames;
}

function bucketEntries(buckets: Buckets): [string, WordCursor[]][] {
  return Object.keys(buckets)
    .sort()
    .map((k) => [k, buckets[k]] as [string, WordCursor[]]);
}

function View({ frame }: PluginViewProps<MatchState>) {
  const s = frame.state;
  const chars = s.s.split('');
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');
  const entries = bucketEntries(s.buckets);

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        s = <span className="font-mono text-ink">"{s.s}"</span>
        {s.ch !== null && !s.done && (
          <>
            {' · '}scanning{' '}
            <span className="font-mono text-ink">'{s.ch}'</span>
          </>
        )}
      </div>

      <ArrayRow values={chars} cellTone={tone} pointers={pointers} windowRange={null} />

      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>waiting buckets (next char → words)</div>
      <div className="mt-0.5 flex flex-col gap-0.5">
        {entries.length === 0 ? (
          <div className={cn('font-mono', vizText.xs, 'text-ink3')}>· empty ·</div>
        ) : (
          entries.map(([key, list]) => (
            <div key={key} className={cn('font-mono', vizText.xs)}>
              <span
                className={cn(
                  s.ch === key && !s.done ? 'text-accent' : 'text-ink2',
                )}
              >
                '{key}'
              </span>
              <span className="text-ink3">{' → '}</span>
              <span className="text-ink">
                {list
                  .map((c) => `"${c.word}"@${c.idx}`)
                  .join(', ')}
              </span>
            </div>
          ))
        )}
      </div>

      {s.pulled.length > 0 && (
        <div className={cn('mt-1 font-mono', vizText.xs, 'text-ink2')}>
          pulled: {s.pulled.map((c) => `"${c.word}"`).join(', ')}
        </div>
      )}

      <div className={cn('mt-1 font-mono', vizText.base, s.count > 0 ? 'text-good' : 'text-ink2')}>
        matched = {s.count}
        {s.matched.length > 0 && (
          <span className={cn(vizText.sm, 'text-ink3')}> [{s.matched.join(', ')}]</span>
        )}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<MatchState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const waiting = Object.values(s.buckets).reduce((n, list) => n + list.length, 0);
  return (
    <VarGrid>
      <InspectorRow k="s" v={`"${s.s}"`} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="s[i]" v={s.ch ? `'${s.ch}'` : '—'} />
      <InspectorRow k="pulled this step" v={s.pulled.length} />
      <InspectorRow k="active word" v={s.active ? `"${s.active.word}"` : '—'} />
      <InspectorRow k="words still waiting" v={waiting} />
      <InspectorRow k="matched (answer)" v={s.count} />
    </VarGrid>
  );
}

export const manifestId = 'prep-strings-number-of-matching-subsequences';
export const title = 'Number of Matching Subsequences';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Number of Matching Subsequences\"?",
    choices: [
      {
        label: "Multi-pointer Buckets — fits this problem",
        correct: true
      },
      {
        label: "Expand center — different approach"
      },
      {
        label: "Two Pointers Greedy — different approach"
      },
      {
        label: "Hash set substrings — different approach"
      }
    ],
    explain: "See Number Of Matching Subsequences pattern"
  },
  {
    id: "init",
    prompt: "At the start of a run (Number of Matching Subsequences), what strategy is established?",
    choices: [
      {
        label: "See Number Of Matching Subsequences — described in INIT caption",
        correct: true
      },
      {
        label: "Precomputed final answer — before scanning input"
      },
      {
        label: "Descending sort required — as mandatory first step"
      },
      {
        label: "Every element visited upfront — marked from the start"
      }
    ],
    explain: "Number of Matching Subsequences: count how many of the  words are subsequences of \"\". Each word waits in the bucket of the next character it needs; every word starts in the bucket of its first letter."
  },
  {
    id: "key-step",
    prompt: "On the \"MATCH\" step (\"\"), what happens?",
    choices: [
      {
        label: "\"\" consumed its last character '' — this move caption",
        correct: true
      },
      {
        label: "Run terminates immediately — no further frames"
      },
      {
        label: "Pointers reset to zero — restart scan"
      },
      {
        label: "Remaining input skipped — early return path"
      }
    ],
    explain: "\"\" consumed its last character '' — it is a full subsequence of \"\". Count it. Total so far: ."
  },
  {
    id: "state",
    prompt: "What does the `s` field track in the visualization state?",
    choices: [
      {
        label: "the source string, one char — updated each frame",
        correct: true
      },
      {
        label: "Fixed display label — unchanged each frame"
      },
      {
        label: "Shuffle seed value — for random ordering"
      },
      {
        label: "Failure error code — set once at end"
      }
    ],
    explain: "The recorder keeps `s` in sync: the source string, one char per array cell"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Number of Matching Subsequences\"?",
    choices: [
      {
        label: "O( time, O(words) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n^2) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(1) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n·L) time, O(n·L) space — wrong order of growth"
      }
    ],
    explain: "O(. O(words). Number Of Matching Subsequences"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Finished scanning \"\". of word(s) — final DONE caption",
        correct: true
      },
      {
        label: "Incomplete partial result — more steps needed"
      },
      {
        label: "Input left unchanged — no mutations applied"
      },
      {
        label: "Aborted run on failure — infinite loop detected"
      }
    ],
    explain: "Finished scanning \"\".  of  word(s) were subsequences${\n      matched.length ? "
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'nms1', label: 's="abcde", words=[a,bb,acd,ace]', value: { s: 'abcde', words: ['a', 'bb', 'acd', 'ace'] } },
    { id: 'nms2', label: 's="dsahjpjauf", words=[ahjpjau,ja,ahbwzgqnuk,tnmlanowax]', value: { s: 'dsahjpjauf', words: ['ahjpjau', 'ja', 'ahbwzgqnuk', 'tnmlanowax'] } },
  ] satisfies SampleInput<MatchInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MatchState | undefined;
    const n = s?.count ?? 0;
    return { ok: true, label: `${n} matching` };
  },
};

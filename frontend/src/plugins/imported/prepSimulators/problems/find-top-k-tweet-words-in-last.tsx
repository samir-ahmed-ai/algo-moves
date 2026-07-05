import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Tweet {
  word: string;
  time: number;
}

interface TopKInput {
  tweets: Tweet[];
  now: number;
  window: number;
  k: number;
}

interface TopKState {
  tweets: Tweet[];
  now: number;
  window: number;
  k: number;
  lo: number; // earliest time still inside the window (now - window)
  i: number | null; // tweet currently being inspected
  inWindow: number | null; // index range start of the contiguous kept block (display only)
  counts: [string, number][]; // running word -> count entries
  ranked: [string, number][] | null; // counts sorted desc once we sort
  result: string[] | null; // top-k words
  phase: 'scan' | 'count' | 'sort' | 'done';
}

function record({ tweets, now, window, k }: TopKInput): Frame<TopKState>[] {  const counts = new Map<string, number>();
  const lo = now - window;

  const { emit, frames } = createRecorder<TopKState>(() => ({
        tweets,
        now,
        window,
        k,
        lo,
        i: null,
        inWindow: null,
        counts: [...counts.entries()],
        ranked: null,
        result: null,
        phase: 'scan'
      }));

  emit(
    'INIT',
    `now=${now}, window=${window}, k=${k}`,
    `Find the top ${k} tweet words within the last ${window} time units. A tweet at time t is kept only when ${lo} ≤ t ≤ ${now} (inside the window now − window … now). We count words inside that window, then rank by frequency.`,
    { phase: 'scan' },
  );

  for (let i = 0; i < tweets.length; i++) {
    const tw = tweets[i];
    const tooNew = tw.time > now;
    const tooOld = now - tw.time > window;
    if (tooNew || tooOld) {
      const why = tooNew
        ? `t=${tw.time} is after now=${now}`
        : `now − t = ${now} − ${tw.time} = ${now - tw.time} > window ${window}`;
      emit(
        'SKIP',
        `skip "${tw.word}"`,
        `Tweet ${i} ("${tw.word}", t=${tw.time}) is outside the window because ${why}. Ignore it.`,
        { i, phase: 'scan' },
        'bad',
      );
      continue;
    }
    const next = (counts.get(tw.word) ?? 0) + 1;
    counts.set(tw.word, next);
    emit(
      'COUNT',
      `${tw.word} → ${next}`,
      `Tweet ${i} ("${tw.word}", t=${tw.time}) sits inside ${lo} … ${now}, so it counts. counts["${tw.word}"] = ${next}.`,
      { i, phase: 'count', counts: [...counts.entries()] },
      'good',
    );
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  emit(
    'SORT',
    'rank by count',
    `Every kept tweet is counted. Sort the ${ranked.length} distinct word(s) by count, highest first: ${
      ranked.map(([w, c]) => `${w}=${c}`).join(', ') || '(none)'
    }.`,
    { phase: 'sort', ranked },
  );

  const take = Math.min(k, ranked.length);
  const result = ranked.slice(0, take).map(([w]) => w);
  emit(
    'DONE',
    result.length ? `[${result.join(', ')}]` : 'empty',
    `Take the first ${take} word(s) from the ranked list → [${result.join(', ')}]. These are the top ${take} word(s) tweeted in the last ${window} units.`,
    { phase: 'done', ranked, result },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<TopKState>) {
  const s = frame.state;
  const cells = s.tweets.map((t) => t.word);
  const inWindow = (i: number) => {
    const t = s.tweets[i].time;
    return t <= s.now && s.now - t <= s.window;
  };
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) {
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
    pointers.push({ i: s.i, label: `t=${s.tweets[s.i].time}`, tone: 'warn', place: 'below' });
  }
  const tone = (i: number) => {
    if (s.phase === 'done' && s.result && s.result.includes(s.tweets[i].word)) return 'found';
    if (s.i === i) return 'match';
    if (inWindow(i)) return 'in-window';
    return 'dead';
  };

  const ranked = s.ranked ?? s.counts;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        window = <span className="font-mono text-ink">[{s.lo} … {s.now}]</span>
        {' · '}k = <span className="font-mono text-ink">{s.k}</span>
      </div>
      <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        counts {'{'}
        {ranked.map(([w, c]) => `${w}:${c}`).join(', ')}
        {'}'}
      </div>
      {s.result && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          → [{s.result.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<TopKState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="now" v={s.now} />
      <InspectorRow k="window [lo…hi]" v={`[${s.lo}…${s.now}]`} />
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="i (tweet)" v={s.i ?? '—'} />
      <InspectorRow k="word @ i" v={s.i !== null ? s.tweets[s.i].word : '—'} />
      <InspectorRow k="distinct words" v={s.counts.length} />
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="result" v={s.result ? `[${s.result.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-find-top-k-tweet-words-in-last';
export const title = 'Find top K tweet words in last';

function computeResult(input: TopKInput): string[] {
  const counts = new Map<string, number>();
  for (const tw of input.tweets) {
    if (tw.time > input.now || input.now - tw.time > input.window) continue;
    counts.set(tw.word, (counts.get(tw.word) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked.slice(0, Math.min(input.k, ranked.length)).map(([w]) => w);
}






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Find top K tweet words in last\"?",
    choices: [
      {
        label: "Sliding window + frequency map — fits this problem",
        correct: true
      },
      {
        label: "Frequency map + bucket sort — different approach"
      },
      {
        label: "Union-find via email index — different approach"
      },
      {
        label: "Sort by distance to origin — different approach"
      }
    ],
    explain: "Keep tweets inside [now-window, now], count words, take top k"
  },
  {
    id: "init",
    prompt: "At the start of a run (Find top K tweet words in last), what strategy is established?",
    choices: [
      {
        label: "Keep tweets inside [now-window, now] — described in INIT caption",
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
    explain: "Find the top  tweet words within the last  time units. A tweet at time t is kept only when  ≤ t ≤  (inside the window now − window … now). We count words inside that window, then rank by frequency."
  },
  {
    id: "key-step",
    prompt: "On the \"COUNT\" step ( → ), what happens?",
    choices: [
      {
        label: "Tweet (\"\", t=) sits inside — this move caption",
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
    explain: "Tweet  (\"\", t=) sits inside  … , so it counts. counts[\"\"] = ."
  },
  {
    id: "state",
    prompt: "What does the `lo` field track in the visualization state?",
    choices: [
      {
        label: "earliest time still inside — updated each frame",
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
    explain: "The recorder keeps `lo` in sync: earliest time still inside the window (now - window)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Find top K tweet words in last\"?",
    choices: [
      {
        label: "O(t log t) time, O(t) space — standard bounds here",
        correct: true
      },
      {
        label: "O(1) per op time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n³) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n) average time, O(1) space — wrong order of growth"
      }
    ],
    explain: "O(t log t). O(t). filter by time; count; sort desc by cnt; first k words"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Tweet (\"\", t=) sits inside — final DONE caption",
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
    explain: "Tweet  (\"\", t=) sits inside  … , so it counts. counts[\"\"] = ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'tk1',
      label: 'now=10, win=5, k=2',
      value: {
        tweets: [
          { word: 'cat', time: 3 },
          { word: 'dog', time: 6 },
          { word: 'cat', time: 7 },
          { word: 'fox', time: 9 },
          { word: 'cat', time: 10 },
          { word: 'dog', time: 12 },
        ],
        now: 10,
        window: 5,
        k: 2,
      },
    },
    {
      id: 'tk2',
      label: 'now=8, win=4, k=1',
      value: {
        tweets: [
          { word: 'hi', time: 2 },
          { word: 'go', time: 5 },
          { word: 'hi', time: 6 },
          { word: 'go', time: 8 },
        ],
        now: 8,
        window: 4,
        k: 1,
      },
    },
  ] satisfies SampleInput<TopKInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TopKState | undefined;
    const res = s?.result ?? [];
    return res.length
      ? { ok: true, label: `[${res.join(', ')}]` }
      : { ok: false, label: 'no words' };
  },
};

// Reference used by sample-input authoring / sanity checks.
void computeResult;

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface TopKInput {
  a: number[];
  k: number;
}

type Phase = 'count' | 'bucket' | 'collect';

interface TopKState {
  a: number[];
  k: number;
  phase: Phase;
  scan: number | null; // index in `a` being read while counting
  freq: [number, number][]; // value -> count entries so far
  buckets: [number, number[]][]; // count -> values placed in that bucket
  bucketAt: number | null; // bucket index (count) currently in focus during bucket/collect
  pickValue: number | null; // value just appended to result
  result: number[];
  done: boolean;
}

function record({ a, k }: TopKInput): Frame<TopKState>[] {
  const freq = new Map<number, number>();
  const buckets: number[][] = Array.from({ length: a.length + 1 }, () => []);
  const result: number[] = [];

  const bucketEntries = (): [number, number[]][] =>
    buckets
      .map((vals, cnt) => [cnt, vals.slice()] as [number, number[]])
      .filter(([, vals]) => vals.length > 0);

  const { emit, frames } = createRecorder<TopKState>(() => ({
    a,
    k,
    phase: 'count',
    scan: null,
    freq: [...freq.entries()],
    buckets: bucketEntries(),
    bucketAt: null,
    pickValue: null,
    result: result.slice(),
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `Top K Frequent: return the ${k} values that appear most often in the array. Plan: count every value, drop each value into a bucket keyed by its count, then sweep buckets from highest count down — that is O(n) time and O(n) space, no sorting needed.`,
    { phase: 'count' },
  );

  // Phase 1 — frequency map.
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const next = (freq.get(x) ?? 0) + 1;
    freq.set(x, next);
    emit(
      'COUNT',
      `freq[${x}]=${next}`,
      `Read a[${i}] = ${x} and tally it: freq[${x}] is now ${next}. One linear pass fills the whole frequency map.`,
      { phase: 'count', scan: i },
    );
  }

  // Phase 2 — bucket by count.
  for (const [num, cnt] of freq.entries()) {
    buckets[cnt].push(num);
    emit(
      'BUCKET',
      `bucket[${cnt}] += ${num}`,
      `Value ${num} occurs ${cnt} time(s), so place it in bucket ${cnt}. Index = frequency, so values that share a count land in the same bucket.`,
      { phase: 'bucket', bucketAt: cnt },
    );
  }

  // Phase 3 — collect from the highest count down until we have k values.
  for (let cnt = buckets.length - 1; cnt >= 0 && result.length < k; cnt--) {
    if (buckets[cnt].length === 0) continue;
    emit(
      'SWEEP',
      `bucket[${cnt}]`,
      `Sweeping from the top: bucket ${cnt} holds the values seen ${cnt} time(s). Anything here is at least as frequent as anything in lower buckets, so pull from it first.`,
      { phase: 'collect', bucketAt: cnt },
    );
    for (const num of buckets[cnt]) {
      result.push(num);
      emit(
        'PICK',
        `take ${num}`,
        `Take ${num} (count ${cnt}) into the answer — result is now [${result.join(', ')}], ${result.length}/${k}.`,
        { phase: 'collect', bucketAt: cnt, pickValue: num },
        'good',
      );
      if (result.length === k) break;
    }
  }

  emit(
    'DONE',
    `[${result.join(',')}]`,
    `Collected ${k} value(s) from the densest buckets first, so the answer is [${result.join(', ')}] — the ${k} most frequent elements.`,
    { phase: 'collect', done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<TopKState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.scan !== null) pointers.push({ i: s.scan, label: 'i', tone: 'accent', place: 'above' });
  const cellTone = (i: number) => (s.scan === i ? 'match' : '');
  const freqStr = s.freq.length ? s.freq.map(([v, c]) => `${v}:${c}`).join(', ') : '∅';

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span>
        {' · '}phase = <span className="font-mono text-ink">{s.phase}</span>
      </div>
      <ArrayRow values={s.a} cellTone={cellTone} pointers={pointers} windowRange={null} />

      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        freq {'{'}
        {freqStr}
        {'}'}
      </div>

      <div className="mt-1 flex flex-col gap-[2px]">
        {s.buckets.length === 0 ? (
          <div className={cn('font-mono', vizText.sm, 'text-ink3')}>buckets: ∅</div>
        ) : (
          s.buckets.map(([cnt, vals]) => (
            <div
              key={cnt}
              className={cn(
                'font-mono',
                vizText.sm,
                s.bucketAt === cnt ? 'text-accent' : 'text-ink3',
              )}
            >
              bucket[{cnt}] = [{vals.join(', ')}]
            </div>
          ))
        )}
      </div>

      <div
        className={cn('mt-1 font-mono', vizText.base, s.result.length ? 'text-good' : 'text-ink3')}
      >
        → result [{s.result.join(', ')}]
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<TopKState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="scan a[i]" v={s.scan !== null ? `[${s.scan}] = ${s.a[s.scan]}` : '—'} />
      <InspectorRow k="distinct values" v={s.freq.length} />
      <InspectorRow k="bucket in focus" v={s.bucketAt !== null ? `count ${s.bucketAt}` : '—'} />
      <InspectorRow k="picked" v={s.pickValue ?? '—'} />
      <InspectorRow k="result" v={s.result.length ? `[${s.result.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-find-top-k-frequent-elements';
export const title = 'Find top K frequent elements';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Find top K frequent elements"?',
    choices: [
      {
        label: 'Frequency map + bucket sort — fits this problem',
        correct: true,
      },
      {
        label: 'Sliding window + frequency map — different approach',
      },
      {
        label: 'Union-find via email index — different approach',
      },
      {
        label: 'Sort by distance to origin — different approach',
      },
    ],
    explain: 'Bucket numbers by their frequency, then scan buckets high to low',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Find top K frequent elements), what strategy is established?',
    choices: [
      {
        label: 'Bucket numbers by their frequency, then — described in INIT caption',
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
      'Top K Frequent: return the  values that appear most often in the array. Plan: count every value, drop each value into a bucket keyed by its count, then sweep buckets from highest count down — that is O(n) time and O(n) space, no sorting needed.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SWEEP" step (bucket[]), what happens?',
    choices: [
      {
        label: 'Sweeping from the top: bucket holds — this move caption',
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
      'Sweeping from the top: bucket  holds the values seen  time(s). Anything here is at least as frequent as anything in lower buckets, so pull from it first.',
  },
  {
    id: 'state',
    prompt: 'What does the `scan` field track in the visualization state?',
    choices: [
      {
        label: 'index in `a` being read — updated each frame',
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
    explain: 'The recorder keeps `scan` in sync: index in `a` being read while counting',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Find top K frequent elements"?',
    choices: [
      {
        label: 'O(n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) per op time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) average time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(n). freq map; buckets[cnt]; collect from top until k',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Collected value(s) from the densest — final DONE caption',
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
      'Collected  value(s) from the densest buckets first, so the answer is [] — the  most frequent elements.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'tk1', label: '[1,1,1,2,2,3], k=2', value: { a: [1, 1, 1, 2, 2, 3], k: 2 } },
    { id: 'tk2', label: '[4,4,5,5,5,6], k=2', value: { a: [4, 4, 5, 5, 5, 6], k: 2 } },
  ] satisfies SampleInput<TopKInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TopKState | undefined;
    if (!s) return { ok: false, label: 'no result' };
    return { ok: s.result.length > 0, label: `[${s.result.join(', ')}]` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { ArrayBars, type BarTone } from '../../../../components/board/ArrayBars';
import type { ProblemSimulator } from '../types';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface TopKInput {
  nums: number[];
  k: number;
}

interface TopKState {
  nums: number[];
  k: number;
  // distinct elements (stable order of first appearance) and their counts
  elements: number[];
  counts: number[];
  // bucket index currently being scanned (freq level), null when not scanning
  scanFreq: number | null;
  // element index (into elements[]) currently highlighted, null otherwise
  active: number | null;
  // elements indices already collected into the result
  collected: number[];
  result: number[];
  done: boolean;
}

function record({ nums, k }: TopKInput): Frame<TopKState>[] {
  // Stable order of distinct elements by first appearance — used for the bars.
  const order: number[] = [];
  const freq = new Map<number, number>();
  for (const num of nums) {
    if (!freq.has(num)) order.push(num);
    freq.set(num, (freq.get(num) ?? 0) + 1);
  }
  const counts = order.map((e) => freq.get(e) ?? 0);
  const indexOfEl = new Map<number, number>();
  order.forEach((e, idx) => indexOfEl.set(e, idx));

  const collected: number[] = [];
  const result: number[] = [];

  const { emit, frames } = createRecorder<TopKState>(() => ({
    nums,
    k,
    elements: order,
    counts,
    scanFreq: null,
    active: null,
    collected: [...collected],
    result: [...result],
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `Top K Frequent Elements: return the ${k} value${k === 1 ? '' : 's'} that appear most often in the array. We count frequencies in O(n), then bucket-sort by count so we never need to sort the values themselves.`,
    {},
  );

  // Phase 1: build frequency counts (already computed; replay per distinct value).
  for (let idx = 0; idx < order.length; idx++) {
    emit(
      'COUNT',
      `freq[${order[idx]}]=${counts[idx]}`,
      `Counting pass: value ${order[idx]} appears ${counts[idx]} time${counts[idx] === 1 ? '' : 's'} in the array. Each bar's height is that element's frequency.`,
      { active: idx },
    );
  }

  // Phase 2: bucket sort by frequency. buckets[f] = elements with frequency f.
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (let idx = 0; idx < order.length; idx++) {
    buckets[counts[idx]].push(order[idx]);
  }
  emit(
    'BUCKETS',
    `0..${nums.length}`,
    `Bucket sort: place each element into buckets[freq], where the index is its frequency. There are at most n+1 = ${nums.length + 1} buckets, so this is O(n) — no comparison sort needed.`,
    {},
  );

  // Phase 3: walk buckets from highest frequency down, collecting up to k.
  for (let f = buckets.length - 1; f >= 0 && result.length < k; f--) {
    if (buckets[f].length === 0) continue;
    for (const num of buckets[f]) {
      const idx = indexOfEl.get(num) ?? -1;
      collected.push(idx);
      result.push(num);
      const reachedK = result.length === k;
      emit(
        'COLLECT',
        `take ${num}`,
        `Scanning buckets high → low at frequency ${f}: collect element ${num} (count ${f}). Result so far: [${result.join(', ')}]${reachedK ? ` — that's k = ${k}, stop.` : `, need ${k - result.length} more.`}`,
        { scanFreq: f, active: idx, done: reachedK },
        'good',
      );
      if (reachedK) {
        return frames;
      }
    }
  }

  emit(
    'DONE',
    `[${result.join(',')}]`,
    `Walked every bucket. Fewer than k distinct values existed, so the answer is everything collected: [${result.join(', ')}].`,
    { done: true },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<TopKState>) {
  const s = frame.state;
  const collectedSet = new Set(s.collected);
  const tone = (i: number): BarTone => {
    if (collectedSet.has(i)) return 'sorted';
    if (s.active === i) return 'compare';
    return 'idle';
  };
  const rail = (
    <>
      <RailGroup label="scan">
        <RailStat k="k" v={s.k} />
        <RailStat k="freq" v={s.scanFreq ?? '—'} tone={s.scanFreq !== null && !s.done ? 'accent' : undefined} />
      </RailGroup>
      <RailStack label="result" items={s.result.map(String)} />
      {s.done && <RailResult label="answer" value={`[${s.result.join(', ')}]`} tone="good" />}
    </>
  );
  return (
    <VizStage rail={rail}>
      <ArrayBars
        values={s.counts}
        tone={tone}
        label={(i) => s.elements[i]}
        max={Math.max(1, ...s.counts)}
      />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<TopKState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const el = s.active !== null && s.active >= 0 ? s.elements[s.active] : null;
  const cnt = s.active !== null && s.active >= 0 ? s.counts[s.active] : null;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="distinct" v={s.elements.length} />
      <InspectorRow k="current element" v={el ?? '—'} />
      <InspectorRow k="its frequency" v={cnt ?? '—'} />
      <InspectorRow k="scanning freq" v={s.scanFreq ?? '—'} />
      <InspectorRow k="collected" v={s.result.length} />
      <InspectorRow k="result" v={s.result.length ? `[${s.result.join(', ')}]` : '…'} />
    </VarGrid>
  );
}

function computeAnswer(nums: number[], k: number): number[] {
  const freq = new Map<number, number>();
  const order: number[] = [];
  for (const num of nums) {
    if (!freq.has(num)) order.push(num);
    freq.set(num, (freq.get(num) ?? 0) + 1);
  }
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const num of order) buckets[freq.get(num) ?? 0].push(num);
  const res: number[] = [];
  for (let f = buckets.length - 1; f >= 0 && res.length < k; f--) {
    for (const num of buckets[f]) {
      res.push(num);
      if (res.length === k) return res;
    }
  }
  return res;
}

export const manifestId = 'prep-sorting-top-k-frequent-elements';
export const title = 'Top K Frequent Elements';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Top K Frequent Elements\"?",
    choices: [
      {
        label: "Bucket Sort — fits this problem",
        correct: true
      },
      {
        label: "Sort Frequencies + Greedy — different approach"
      },
      {
        label: "Sort + Two Pointers — different approach"
      },
      {
        label: "Sort (attack desc, defense asc) + Max — different approach"
      }
    ],
    explain: "Count frequencies with a map, then use **bucket sort**: `buckets[freq]` holds elements with that frequency"
  },
  {
    id: "init",
    prompt: "At the start of a run (Top K Frequent Elements), what strategy is established?",
    choices: [
      {
        label: "Count frequencies with a map, then — described in INIT caption",
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
    explain: "Top K Frequent Elements: return the  value that appear most often in the array. We count frequencies in O(n), then bucket-sort by count so we never need to sort the values themselves."
  },
  {
    id: "key-step",
    prompt: "On the \"BUCKETS\" step (0..), what happens?",
    choices: [
      {
        label: "Bucket sort: place each element — this move caption",
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
    explain: "Bucket sort: place each element into buckets[freq], where the index is its frequency. There are at most n+1 =  buckets, so this is O(n) — no comparison sort needed."
  },
  {
    id: "state",
    prompt: "What does the `nums` field track in the visualization state?",
    choices: [
      {
        label: "Field nums in state — updated each frame",
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
    explain: "The recorder snapshots `nums` on every emit so each frame shows the algorithm mid-step."
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Top K Frequent Elements\"?",
    choices: [
      {
        label: "O(n) time, O(n) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n log n) time, O(1) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). Count frequencies with a map, then use **bucket sort**: `buckets[freq]` holds elements with that frequency; Iterate buckets from highest to lowest, collect unti"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Walked every bucket. Fewer than k — final DONE caption",
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
    explain: "Walked every bucket. Fewer than k distinct values existed, so the answer is everything collected: []."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'tk1', label: '[1,1,1,2,2,3], k=2', value: { nums: [1, 1, 1, 2, 2, 3], k: 2 } },
    { id: 'tk2', label: '[4,1,4,2,2,2], k=1', value: { nums: [4, 1, 4, 2, 2, 2], k: 1 } },
  ] satisfies SampleInput<TopKInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as TopKState | undefined;
    if (!s) return { ok: false, label: 'no frames' };
    const expected = computeAnswer(s.nums, s.k);
    const got = s.result;
    const ok = got.length === expected.length && got.every((v, i) => v === expected[i]);
    return { ok, label: `[${got.join(',')}]` };
  },
};

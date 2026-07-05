import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface SubarraySumInput {
  nums: number[];
  k: number;
}

interface SubarraySumState {
  nums: number[];
  k: number;
  i: number | null; // current index being processed
  sum: number; // running prefix sum up to and including i
  need: number | null; // sum - k, the earlier prefix we look up
  prefix: [number, number][]; // prefixSum value -> count of times it has occurred
  added: number | null; // how many subarrays this step contributed
  cnt: number; // total subarrays found so far
  done: boolean;
}

function record({ nums, k }: SubarraySumInput): Frame<SubarraySumState>[] {  const prefixMap = new Map<number, number>([[0, 1]]);
  let sum = 0;
  let cnt = 0;

  const { emit, frames } = createRecorder<SubarraySumState>(() => ({
        nums,
        k,
        i: null,
        sum,
        need: null,
        prefix: [...prefixMap.entries()],
        added: null,
        cnt,
        done: false
      }));

  emit(
    'INIT',
    `k=${k}`,
    `Subarray Sum Equals K: count subarrays summing to ${k}. Key idea — if prefix[j] − prefix[i] = ${k}, then the slice (i+1 .. j) sums to ${k}. We scan once, keeping a map of how many times each running prefix sum has occurred. Seed it with {0: 1} so a whole-prefix match counts.`,
    { sum: 0 },
  );

  for (let i = 0; i < nums.length; i++) {
    sum += nums[i];
    const need = sum - k;
    emit(
      'SCAN',
      `sum=${sum}`,
      `At index ${i} (value ${nums[i]}) the running prefix sum becomes ${sum}. A subarray ending here sums to ${k} exactly when an earlier prefix equalled sum − k = ${sum} − ${k} = ${need}. Look up ${need} in the map.`,
      { i, sum, need },
    );

    const c = prefixMap.get(need) ?? 0;
    if (c > 0) {
      cnt += c;
      emit(
        'MATCH',
        `+${c}`,
        `${need} has appeared ${c} time${c === 1 ? '' : 's'} before, so there ${c === 1 ? 'is' : 'are'} ${c} subarray${c === 1 ? '' : 's'} ending at index ${i} that sum to ${k}. Add ${c} to the count → ${cnt}.`,
        { i, sum, need, added: c, cnt },
        'good',
      );
    } else {
      emit(
        'MISS',
        `+0`,
        `${need} is not in the map, so no subarray ending at index ${i} sums to ${k}. The count stays ${cnt}.`,
        { i, sum, need, added: 0, cnt },
      );
    }

    prefixMap.set(sum, (prefixMap.get(sum) ?? 0) + 1);
    emit(
      'STORE',
      `prefix[${sum}]=${prefixMap.get(sum)}`,
      `Record the current prefix sum so future indices can match against it: prefix[${sum}] is now ${prefixMap.get(sum)}.`,
      { i, sum },
    );
  }

  emit(
    'DONE',
    `${cnt} subarrays`,
    `Scan complete. ${cnt} subarray${cnt === 1 ? '' : 's'} sum to ${k}.`,
    { done: true, cnt },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<SubarraySumState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  const tone = (i: number) => (s.i === i ? 'match' : '');
  const prefixItems = s.prefix.map(([v, c]) => `${v}:${c}`);
  return (
    <VizStage rail={<>
      <RailGroup label="scan">
        <RailStat k="k" v={s.k} />
        <RailStat k="i" v={s.i ?? '—'} />
        <RailStat k="sum" v={s.sum} tone="accent" />
        <RailStat k="need" v={s.need ?? '—'} />
      </RailGroup>
      <RailStack label="prefix map" items={prefixItems} topLabel="latest" />
      <RailResult label="count" value={s.cnt} tone={s.done ? 'good' : s.added !== null && s.added > 0 ? 'accent' : undefined} />
    </>}>
      <ArrayRow values={s.nums} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<SubarraySumState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="prefix sum" v={s.sum} />
      <InspectorRow k="need (sum−k)" v={s.need ?? '—'} />
      <InspectorRow k="map[need]" v={s.added ?? '—'} />
      <InspectorRow k="map size" v={s.prefix.length} />
      <InspectorRow k="count" v={s.cnt} />
    </VarGrid>
  );
}

export const manifestId = 'prep-prefix-sum-subarray-sum-equals-k';
export const title = 'Subarray Sum Equals K';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Subarray Sum Equals K\"?",
    choices: [
      {
        label: "Prefix Sum Map — fits this problem",
        correct: true
      },
      {
        label: "Difference Array + Prefix Sum — different approach"
      },
      {
        label: "Prefix Sum Mod Map — different approach"
      }
    ],
    explain: "If `prefix[j] - prefix[i] == k`, then subarray `[i+1..j]` sums to `k`"
  },
  {
    id: "init",
    prompt: "At the start of a run (Subarray Sum Equals K), what strategy is established?",
    choices: [
      {
        label: "If `prefix[j] - prefix[i] == k` — described in INIT caption",
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
    explain: "Subarray Sum Equals K: count subarrays summing to . Key idea — if prefix[j] − prefix[i] = , then the slice (i+1 .. j) sums to . We scan once, keeping a map of how many times each running prefix sum has occurred. Seed it with {0: 1} so a whole-prefix match counts."
  },
  {
    id: "key-step",
    prompt: "On the \"MISS\" step (+0), what happens?",
    choices: [
      {
        label: "is not in the map — this move caption",
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
    explain: " is not in the map, so no subarray ending at index  sums to . The count stays ."
  },
  {
    id: "state",
    prompt: "What does the `i` field track in the visualization state?",
    choices: [
      {
        label: "current index being processed — updated each frame",
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
    explain: "The recorder keeps `i` in sync: current index being processed"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Subarray Sum Equals K\"?",
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
        label: "O(n) time, O(min(n,k)) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(n). If `prefix[j] - prefix[i] == k`, then subarray `[i+1..j]` sums to `k`; Use a hashmap counting how many times each prefix sum has occurred"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Scan complete. subarray sum to . — final DONE caption",
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
    explain: "Scan complete.  subarray sum to ."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'ssk1', label: '[1,1,1], k=2', value: { nums: [1, 1, 1], k: 2 } },
    { id: 'ssk2', label: '[3,4,7,2,-3,1,4,2], k=7', value: { nums: [3, 4, 7, 2, -3, 1, 4, 2], k: 7 } },
  ] satisfies SampleInput<SubarraySumInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as SubarraySumState | undefined;
    const cnt = s?.cnt ?? 0;
    return { ok: true, label: `${cnt} subarray${cnt === 1 ? '' : 's'}` };
  },
};

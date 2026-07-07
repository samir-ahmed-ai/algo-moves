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

interface KGroupInput {
  values: number[];
  k: number;
}

interface KGroupState {
  // Current order of the chain, including the leading dummy at index 0.
  // chain[0]! is always the dummy (shown as 'D').
  chain: (number | string)[];
  k: number;
  // Pointer indices into `chain` (or null when not applicable).
  groupPrev: number | null; // node before the group being processed
  kth: number | null; // kth node of the current group (the new group head)
  groupNext: number | null; // first node after the group (reversal sentinel)
  prev: number | null; // reversal: prev finger
  cur: number | null; // reversal: cur finger
  done: boolean;
}

const DUMMY = 'D';

function record({ values, k }: KGroupInput): Frame<KGroupState>[] {
  // chain holds the live order of node values; index 0 is the dummy.
  const chain: (number | string)[] = [DUMMY, ...values];

  const { emit, frames } = createPrepRecorder<KGroupState>(() => ({
    chain: chain.slice(),
    k,
    groupPrev: null,
    kth: null,
    groupNext: null,
    prev: null,
    cur: null,
    done: false,
  }));

  emit(
    'INIT',
    `k=${k}`,
    `Reverse Nodes in k-Group: walk the list and reverse every block of ${k} consecutive nodes, leaving any final block shorter than ${k} untouched. A dummy node (D) sits before the head so the first group has a stable predecessor.`,
    { groupPrev: 0 },
  );

  // groupPrev is the index (into chain) of the node before the current group.
  let groupPrev = 0;

  for (;;) {
    // Walk k steps from groupPrev to find the kth node of this group.
    let kth = groupPrev;
    let broke = false;
    for (let i = 0; i < k; i++) {
      kth += 1;
      emit(
        'COUNT',
        `step ${i + 1}/${k}`,
        `Counting out a group of ${k}: advance ${i + 1} node(s) past the anchor. The kth node will become the new head of this reversed block.`,
        { groupPrev, kth },
      );
      if (kth >= chain.length) {
        broke = true;
        break;
      }
    }
    if (broke) {
      emit(
        'STOP',
        'tail < k',
        `Fewer than ${k} nodes remain after the anchor, so this leftover tail is left as-is. The list is fully processed.`,
        { groupPrev, done: true },
        'good',
      );
      break;
    }

    // groupNext is the node right after the kth node.
    const groupNext = kth + 1 < chain.length ? kth + 1 : null;
    emit(
      'GROUP',
      `[${groupPrev + 1}..${kth}]`,
      `Found a full group: nodes at positions ${groupPrev + 1}..${kth}. The node after it (groupNext) is the sentinel that tells us when reversal is done.`,
      { groupPrev, kth, groupNext },
    );

    // Reverse the slice chain[groupPrev+1 .. kth]! in place.
    // Mirrors the Go pointer dance (prev,cur fingers) but on the array model:
    // after reversal the group's values are flipped and re-linked.
    const start = groupPrev + 1;
    const end = kth; // inclusive
    let lo = start;
    let hi = end;
    while (lo < hi) {
      emit(
        'REVERSE',
        `swap ${lo}↔${hi}`,
        `Reversing the group with the prev/cur finger dance: flip the order of the values at the two ends of the remaining slice (positions ${lo} and ${hi}).`,
        { groupPrev, kth, groupNext, cur: lo, prev: hi },
      );
      const tmp = chain[lo]!;
      chain[lo]! = chain[hi]!;
      chain[hi]! = tmp;
      lo += 1;
      hi -= 1;
    }

    emit(
      'RELINK',
      `head→${chain[start]!}`,
      `Group reversed. The anchor now points at the old kth node (value ${chain[start]!}), and the old group head (value ${chain[end]!}) becomes the anchor for the next group.`,
      { groupPrev, kth, groupNext, prev: end },
    );

    // In Go, groupPrev advances to the tail of the just-reversed group, which
    // is now at index `end` (the old head, now last in the block).
    groupPrev = end;
  }

  return frames;
}

function View({ frame }: PluginViewProps<KGroupState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.groupPrev !== null)
    pointers.push({ i: s.groupPrev, label: 'gPrev', tone: 'accent', place: 'above' });
  if (s.kth !== null && s.kth < s.chain.length)
    pointers.push({ i: s.kth, label: 'kth', tone: 'warn', place: 'above' });
  if (s.groupNext !== null)
    pointers.push({ i: s.groupNext, label: 'gNext', tone: 'bad', place: 'below' });
  if (s.cur !== null) pointers.push({ i: s.cur, label: 'cur', tone: 'good', place: 'below' });
  if (s.prev !== null && s.prev !== s.groupNext)
    pointers.push({ i: s.prev, label: 'prev', tone: 'warn', place: 'below' });

  const inGroup = (i: number) =>
    s.groupPrev !== null &&
    s.kth !== null &&
    i > s.groupPrev &&
    i <= s.kth &&
    s.kth < s.chain.length;
  const tone = (i: number) => {
    if (i === 0) return '';
    if (s.done) return 'found';
    if (inGroup(i)) return 'match';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        k = <span className="font-mono text-ink">{s.k}</span> · D = dummy head
      </div>
      <ArrayRow values={s.chain} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        → {s.chain.filter((_, i) => i > 0).join(' → ')}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>
          final: [{s.chain.filter((_, i) => i > 0).join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<KGroupState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (i: number | null) =>
    i !== null && i >= 0 && i < s.chain.length ? `${s.chain[i]!}@${i}` : '—';
  return (
    <VarGrid>
      <InspectorRow k="k" v={s.k} />
      <InspectorRow k="groupPrev" v={at(s.groupPrev)} />
      <InspectorRow k="kth" v={at(s.kth)} />
      <InspectorRow k="groupNext" v={at(s.groupNext)} />
      <InspectorRow k="prev / cur" v={`${at(s.prev)} / ${at(s.cur)}`} />
      <InspectorRow k="chain" v={s.chain.filter((_, i) => i > 0).join(' ')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-reverse-nodes-in-k-group';
export const title = 'Reverse Nodes in k-Group';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Reverse Nodes in k-Group"?',
    choices: [
      {
        label: 'Iterative Group Reversal — fits this problem',
        correct: true,
      },
      {
        label: 'Iterative reverse — different approach',
      },
      {
        label: 'Two pointers reset — different approach',
      },
      {
        label: 'Min-heap merge — different approach',
      },
    ],
    explain: 'Use a dummy node before head. For each group:',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Reverse Nodes in k-Group), what strategy is established?',
    choices: [
      {
        label: 'Use a dummy node before head. — described in INIT caption',
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
      'Reverse Nodes in k-Group: walk the list and reverse every block of  consecutive nodes, leaving any final block shorter than  untouched. A dummy node (D) sits before the head so the first group has a stable predecessor.',
  },
  {
    id: 'key-step',
    prompt: 'On the "REVERSE" step (swap ↔), what happens?',
    choices: [
      {
        label: 'Reversing the group with the prev/cur — this move caption',
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
      'Reversing the group with the prev/cur finger dance: flip the order of the values at the two ends of the remaining slice (positions  and ).',
  },
  {
    id: 'state',
    prompt: 'What does the `groupPrev` field track in the visualization state?',
    choices: [
      {
        label: 'node before the group — updated each frame',
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
    explain: 'The recorder keeps `groupPrev` in sync: node before the group being processed',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Reverse Nodes in k-Group"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n*k) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). Use a dummy node before head. For each group:',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Group reversed. The anchor now points — final DONE caption',
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
      'Group reversed. The anchor now points at the old kth node (value ), and the old group head (value ) becomes the anchor for the next group.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'kg1', label: '[1,2,3,4,5], k=2', value: { values: [1, 2, 3, 4, 5], k: 2 } },
    { id: 'kg2', label: '[1,2,3,4,5], k=3', value: { values: [1, 2, 3, 4, 5], k: 3 } },
  ] satisfies SampleInput<KGroupInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const last = frames[frames.length - 1]?.state as KGroupState | undefined;
    const got = last ? last.chain.filter((_, i) => i > 0) : [];
    return { ok: true, label: `[${got.join(',')}]` };
  },
};

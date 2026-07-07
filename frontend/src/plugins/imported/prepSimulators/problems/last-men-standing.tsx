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
import {
  VizStage,
  RailGroup,
  RailStat,
  RailResult,
  RailStack,
  InspectorRow,
  VarGrid,
  VizEmpty,
} from '../../../_shared/vizKit';

interface LastMenInput {
  n: number; // people standing in the circle, numbered 1..n
  k: number; // every k-th person is eliminated
}

interface LastMenState {
  n: number;
  k: number;
  // ring of person labels still alive, in walking order. ringOrder[curIdx]! is `cur`.
  ring: number[];
  curIdx: number | null; // position of `cur` within ring
  doomedIdx: number | null; // position of cur.Next (the person about to be removed)
  eliminated: number[]; // person labels dropped so far, in order
  survivor: number | null; // final answer once known
  done: boolean;
}

function record({ n, k }: LastMenInput): Frame<LastMenState>[] {
  const { emit, frames } = createPrepRecorder<LastMenState>(() => ({
    n: n,
    k: k,
    ring: [],
    curIdx: null,
    doomedIdx: null,
    eliminated: [],
    survivor: null,
    done: false,
  }));

  // Build the initial circle 1..n (mirrors the linked-list construction in Go).
  const ring: number[] = [];
  for (let i = 1; i <= n; i++) ring.push(i);
  const eliminated: number[] = [];

  emit(
    'INIT',
    `n=${n}, k=${k}`,
    `Josephus circle: ${n} people stand in a ring numbered 1..${n}. Starting the count, every ${k}-th person is eliminated; repeat until one survivor remains. We simulate a circular linked list where cur walks k−1 steps then drops cur.Next.`,
    { ring: ring, curIdx: null, doomedIdx: null, eliminated: eliminated, survivor: null },
  );

  // Edge case from the Go: a single person is the survivor immediately.
  if (n === 1) {
    emit(
      'DONE',
      'survivor 1',
      `Only one person stands, so person 1 is the last one standing without any elimination.`,
      { ring: ring, curIdx: 0, doomedIdx: null, eliminated: eliminated, survivor: 1, done: true },
      'good',
    );
    return frames;
  }

  // cur starts at the head (person 1), index 0 in the ring array.
  let cur = 0;
  emit(
    'START',
    'cur = 1',
    `Place cur on person 1 (the head of the ring). Each round we advance cur by k−1 = ${k - 1} step(s), landing just before the victim, then splice out cur.Next.`,
    { ring: ring, curIdx: cur, doomedIdx: null, eliminated: eliminated, survivor: null },
  );

  // Loop while more than one person remains (Go: for cur.Next != cur).
  while (ring.length > 1) {
    // Advance cur by k-1 steps around the ring (Go inner loop i=1; i<k).
    for (let i = 1; i < k; i++) {
      cur = (cur + 1) % ring.length;
      emit(
        'WALK',
        `step ${i}/${k - 1} → ${ring[cur]!}`,
        `Counting: advance cur one position to person ${ring[cur]!} (step ${i} of ${k - 1}). After all k−1 steps, cur.Next will be the person we eliminate.`,
        { ring: ring, curIdx: cur, doomedIdx: null, eliminated: eliminated, survivor: null },
      );
    }

    // cur.Next is the victim — the next person clockwise.
    const doomedIdx = (cur + 1) % ring.length;
    const victim = ring[doomedIdx]!;
    emit(
      'MARK',
      `drop ${victim}`,
      `cur is on person ${ring[cur]!}; the very next person, ${victim}, is the k-th in this count and gets eliminated. In the list this is cur.Next = cur.Next.Next.`,
      { ring: ring, curIdx: cur, doomedIdx: doomedIdx, eliminated: eliminated, survivor: null },
      'bad',
    );

    // Splice the victim out (Go: cur.Next = cur.Next.Next).
    eliminated.push(victim!);
    ring.splice(doomedIdx, 1);
    // Removing an element before/at cur shifts cur's index; victim was after cur
    // unless it wrapped to index 0. Recompute cur's position by its label.
    cur = ring.indexOf(curLabelAfterSplice(ring, cur, doomedIdx));

    emit(
      'REMOVE',
      `${ring.length} left`,
      `Person ${victim} leaves the circle. ${ring.length} ${ring.length === 1 ? 'person remains' : 'people remain'}. Counting resumes from cur, which stays on its current person.`,
      {
        ring: ring,
        curIdx: cur,
        doomedIdx: null,
        eliminated: eliminated,
        survivor: ring.length === 1 ? ring[0]! : null,
      },
    );
  }

  const survivor = ring[0]!;
  emit(
    'DONE',
    `survivor ${survivor}`,
    `One person is left: person ${survivor} is the last one standing. With n=${n}, k=${k} the answer is ${survivor}.`,
    {
      ring: ring,
      curIdx: 0,
      doomedIdx: null,
      eliminated: eliminated,
      survivor: survivor,
      done: true,
    },
    'good',
  );
  return frames;
}

// After splicing out doomedIdx, find where cur ended up. cur was at index `curIdx`
// in the pre-splice ring. If the removed index was <= curIdx, cur shifts left by 1;
// otherwise it is unchanged. (doomedIdx == 0 happens only when the victim wrapped.)
function curLabelAfterSplice(postRing: number[], curIdxPre: number, doomedIdxPre: number): number {
  const adjusted = doomedIdxPre <= curIdxPre ? curIdxPre - 1 : curIdxPre;
  const clamped = ((adjusted % postRing.length) + postRing.length) % postRing.length;
  return postRing[clamped]!;
}

function View({ frame }: PluginViewProps<LastMenState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.curIdx !== null)
    pointers.push({ i: s.curIdx, label: 'cur', tone: 'accent', place: 'above' });
  if (s.doomedIdx !== null)
    pointers.push({ i: s.doomedIdx, label: 'drop', tone: 'bad', place: 'below' });

  const tone = (i: number) => {
    if (s.survivor !== null && s.ring[i]! === s.survivor) return 'found';
    if (s.doomedIdx === i) return 'dead';
    if (s.curIdx === i) return 'match';
    return '';
  };

  const cur = s.curIdx !== null ? s.ring[s.curIdx]! : null;
  const doomed = s.doomedIdx !== null ? s.ring[s.doomedIdx]! : null;

  const rail = (
    <>
      <RailGroup label="ring">
        <RailStat k="alive" v={s.ring.length} />
        <RailStat k="cur" v={cur ?? '—'} tone="accent" />
        <RailStat k="drop" v={doomed ?? '—'} tone={doomed !== null ? 'bad' : undefined} />
      </RailGroup>
      <RailStack
        label="eliminated"
        items={s.eliminated.map(String)}
        highlightEnd="bottom"
        topLabel="first"
      />
      {s.survivor !== null && <RailResult label="survivor" value={s.survivor} tone="good" />}
    </>
  );

  return (
    <VizStage rail={rail}>
      <ArrayRow values={s.ring} cellTone={tone} pointers={pointers} windowRange={null} />
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<LastMenState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const cur = s.curIdx !== null ? s.ring[s.curIdx]! : null;
  const doomed = s.doomedIdx !== null ? s.ring[s.doomedIdx]! : null;
  return (
    <VarGrid>
      <InspectorRow k="n (people)" v={s.n} />
      <InspectorRow k="k (count)" v={s.k} />
      <InspectorRow k="alive" v={s.ring.length} />
      <InspectorRow k="cur" v={cur ?? '—'} />
      <InspectorRow k="next (drop)" v={doomed ?? '—'} />
      <InspectorRow k="eliminated" v={s.eliminated.length} />
      <InspectorRow k="survivor" v={s.survivor ?? (s.done ? 'none' : '…')} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-last-men-standing';
export const title = 'Last men standing';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Last men standing"?',
    choices: [
      {
        label: 'Josephus simulation — fits this problem',
        correct: true,
      },
      {
        label: 'Merge two lists — different approach',
      },
      {
        label: 'DLL walk delete — different approach',
      },
      {
        label: 'DFS flatten — different approach',
      },
    ],
    explain: 'Stand in a circle; skip k-1, drop the kth, repeat to the survivor',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Last men standing), what strategy is established?',
    choices: [
      {
        label: 'Stand in a circle; skip k-1 — described in INIT caption',
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
      'Josephus circle:  people stand in a ring numbered 1... Starting the count, every -th person is eliminated; repeat until one survivor remains. We simulate a circular linked list where cur walks k−1 steps then drops cur.Next.',
  },
  {
    id: 'key-step',
    prompt: 'On the "MARK" step (drop ), what happens?',
    choices: [
      {
        label: 'cur is on person ; — this move caption',
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
      'cur is on person ; the very next person, , is the k-th in this count and gets eliminated. In the list this is cur.Next = cur.Next.Next.',
  },
  {
    id: 'state',
    prompt: 'What does the `curIdx` field track in the visualization state?',
    choices: [
      {
        label: 'position of `cur` within ring — updated each frame',
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
    explain: 'The recorder keeps `curIdx` in sync: position of `cur` within ring',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Last men standing"?',
    choices: [
      {
        label: 'O(n*k) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) time, O(h) space — wrong order of growth',
      },
      {
        label: 'O(n log n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(n*k). O(1). advance k-1 steps; cur.Next=cur.Next.Next',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'One person is left: person — final DONE caption',
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
    explain: 'One person is left: person  is the last one standing. With n=, k= the answer is .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'lms1', label: 'n=5, k=2', value: { n: 5, k: 2 } },
    { id: 'lms2', label: 'n=7, k=3', value: { n: 7, k: 3 } },
  ] satisfies SampleInput<LastMenInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as LastMenState | undefined;
    return s?.survivor != null
      ? { ok: true, label: `survivor ${s.survivor}` }
      : { ok: false, label: 'no survivor' };
  },
};

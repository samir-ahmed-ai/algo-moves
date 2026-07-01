import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty } from '../../../_shared/vizKit';

interface LastMenInput {
  n: number; // people standing in the circle, numbered 1..n
  k: number; // every k-th person is eliminated
}

interface LastMenState {
  n: number;
  k: number;
  // ring of person labels still alive, in walking order. ringOrder[curIdx] is `cur`.
  ring: number[];
  curIdx: number | null; // position of `cur` within ring
  doomedIdx: number | null; // position of cur.Next (the person about to be removed)
  eliminated: number[]; // person labels dropped so far, in order
  survivor: number | null; // final answer once known
  done: boolean;
}

function record({ n, k }: LastMenInput): Frame<LastMenState>[] {
  const frames: Frame<LastMenState>[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    ring: number[],
    curIdx: number | null,
    doomedIdx: number | null,
    eliminated: number[],
    survivor: number | null,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        n,
        k,
        ring: ring.slice(),
        curIdx,
        doomedIdx,
        eliminated: eliminated.slice(),
        survivor,
        done: type === 'DONE',
      },
    });

  // Build the initial circle 1..n (mirrors the linked-list construction in Go).
  const ring: number[] = [];
  for (let i = 1; i <= n; i++) ring.push(i);
  const eliminated: number[] = [];

  emit(
    'INIT',
    `n=${n}, k=${k}`,
    `Josephus circle: ${n} people stand in a ring numbered 1..${n}. Starting the count, every ${k}-th person is eliminated; repeat until one survivor remains. We simulate a circular linked list where cur walks k−1 steps then drops cur.Next.`,
    ring,
    null,
    null,
    eliminated,
    null,
  );

  // Edge case from the Go: a single person is the survivor immediately.
  if (n === 1) {
    emit(
      'DONE',
      'survivor 1',
      `Only one person stands, so person 1 is the last one standing without any elimination.`,
      ring,
      0,
      null,
      eliminated,
      1,
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
    ring,
    cur,
    null,
    eliminated,
    null,
  );

  // Loop while more than one person remains (Go: for cur.Next != cur).
  while (ring.length > 1) {
    // Advance cur by k-1 steps around the ring (Go inner loop i=1; i<k).
    for (let i = 1; i < k; i++) {
      cur = (cur + 1) % ring.length;
      emit(
        'WALK',
        `step ${i}/${k - 1} → ${ring[cur]}`,
        `Counting: advance cur one position to person ${ring[cur]} (step ${i} of ${k - 1}). After all k−1 steps, cur.Next will be the person we eliminate.`,
        ring,
        cur,
        null,
        eliminated,
        null,
      );
    }

    // cur.Next is the victim — the next person clockwise.
    const doomedIdx = (cur + 1) % ring.length;
    const victim = ring[doomedIdx];
    emit(
      'MARK',
      `drop ${victim}`,
      `cur is on person ${ring[cur]}; the very next person, ${victim}, is the k-th in this count and gets eliminated. In the list this is cur.Next = cur.Next.Next.`,
      ring,
      cur,
      doomedIdx,
      eliminated,
      null,
      'bad',
    );

    // Splice the victim out (Go: cur.Next = cur.Next.Next).
    eliminated.push(victim);
    ring.splice(doomedIdx, 1);
    // Removing an element before/at cur shifts cur's index; victim was after cur
    // unless it wrapped to index 0. Recompute cur's position by its label.
    cur = ring.indexOf(curLabelAfterSplice(ring, cur, doomedIdx));

    emit(
      'REMOVE',
      `${ring.length} left`,
      `Person ${victim} leaves the circle. ${ring.length} ${ring.length === 1 ? 'person remains' : 'people remain'}. Counting resumes from cur, which stays on its current person.`,
      ring,
      cur,
      null,
      eliminated,
      ring.length === 1 ? ring[0] : null,
    );
  }

  const survivor = ring[0];
  emit(
    'DONE',
    `survivor ${survivor}`,
    `One person is left: person ${survivor} is the last one standing. With n=${n}, k=${k} the answer is ${survivor}.`,
    ring,
    0,
    null,
    eliminated,
    survivor,
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
  return postRing[clamped];
}

function View({ frame }: PluginViewProps<LastMenState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.curIdx !== null) pointers.push({ i: s.curIdx, label: 'cur', tone: 'accent', place: 'above' });
  if (s.doomedIdx !== null) pointers.push({ i: s.doomedIdx, label: 'drop', tone: 'bad', place: 'below' });

  const tone = (i: number) => {
    if (s.survivor !== null && s.ring[i] === s.survivor) return 'found';
    if (s.doomedIdx === i) return 'dead';
    if (s.curIdx === i) return 'match';
    return '';
  };

  const cur = s.curIdx !== null ? s.ring[s.curIdx] : null;
  const doomed = s.doomedIdx !== null ? s.ring[s.doomedIdx] : null;

  const rail = (
    <>
      <RailGroup label="ring">
        <RailStat k="alive" v={s.ring.length} />
        <RailStat k="cur" v={cur ?? '—'} tone="accent" />
        <RailStat k="drop" v={doomed ?? '—'} tone={doomed !== null ? 'bad' : undefined} />
      </RailGroup>
      <RailStack label="eliminated" items={s.eliminated.map(String)} highlightEnd="bottom" topLabel="first" />
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
  const cur = s.curIdx !== null ? s.ring[s.curIdx] : null;
  const doomed = s.doomedIdx !== null ? s.ring[s.doomedIdx] : null;
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

export const simulator: ProblemSimulator = {
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

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { createRecorder } from '../../../_shared/createRecorder';
import { VizStage, RailGroup, RailStat, RailResult, RailStack, InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface MergeKInput {
  // Each inner array is one sorted linked list (its node values, head → tail).
  lists: number[][];
}

interface MergeKState {
  // Snapshot of every list at this round (round-by-round shrinking pool).
  pool: number[][];
  round: number; // pass number through the while(len>1) loop
  // The active pairwise merge of mergeTwo(a, b):
  pairIdx: [number, number] | null; // which two pool lists are being merged
  a: number[] | null; // remaining tail of list a
  b: number[] | null; // remaining tail of list b
  ai: number | null; // index into a's original values being compared
  bi: number | null; // index into b's original values being compared
  out: number[]; // chain built so far by this mergeTwo
  result: number[] | null; // final fully-merged list (last frame only)
  done: boolean;
}

function record({ lists }: MergeKInput): Frame<MergeKState>[] {
  // Working pool of lists; each list is a plain value array (head first).
  let pool: number[][] = lists.map((l) => l.slice());

  const { emit, frames } = createRecorder<MergeKState>(() => ({
    pool: pool.map((l) => l.slice()),
    round: 0,
    pairIdx: null,
    a: null,
    b: null,
    ai: null,
    bi: null,
    out: [],
    result: null,
    done: false,
  }));

  const show = (l: number[] | null): string =>
    l && l.length ? l.join('→') : '∅';

  if (pool.length === 0) {
    emit('DONE', 'empty', 'There are no lists at all, so the merged result is the empty list.', { result: [], done: true }, 'bad');
    return frames;
  }

  emit(
    'INIT',
    `k=${pool.length}`,
    `Merge K Sorted Lists: we have ${pool.length} already-sorted lists. Repeatedly pair them up and merge two at a time — pool size roughly halves each round — until a single sorted list remains. Time O(n log k), Space O(k).`,
    { round: 0 },
  );

  let round = 0;
  while (pool.length > 1) {
    round += 1;
    const merged: number[][] = [];
    emit(
      'ROUND',
      `round ${round}: ${pool.length} → ${Math.ceil(pool.length / 2)}`,
      `Round ${round}: ${pool.length} lists in the pool. We sweep left to right, merging list i with list i+1, collecting each result into a new, smaller pool.`,
      { round },
    );

    for (let i = 0; i < pool.length; i += 2) {
      const aSrc = pool[i];
      const bSrc = i + 1 < pool.length ? pool[i + 1] : null;

      if (bSrc === null) {
        // Odd one out — carries over untouched (mergeTwo(a, nil) === a).
        merged.push(aSrc.slice());
        emit(
          'CARRY',
          `carry [${i}]`,
          `List ${i} (${show(aSrc)}) has no partner this round, so it carries over to the next pool unchanged.`,
          {
            round,
            pairIdx: [i, -1],
            a: aSrc.slice(),
            b: null,
            out: aSrc.slice(),
          },
        );
        continue;
      }

      // mergeTwo(a, b): two-pointer walk building one sorted chain.
      const out: number[] = [];
      const a = aSrc.slice();
      const b = bSrc.slice();
      let ai = 0;
      let bi = 0;

      emit(
        'PAIR',
        `merge [${i}] & [${i + 1}]`,
        `Merge list ${i} (${show(a)}) with list ${i + 1} (${show(b)}). Walk both with two pointers, always appending the smaller head to the output chain.`,
        {
          round,
          pairIdx: [i, i + 1],
          a: a.slice(),
          b: b.slice(),
          ai,
          bi,
          out: [],
        },
      );

      while (ai < a.length && bi < b.length) {
        if (a[ai] < b[bi]) {
          out.push(a[ai]);
          emit(
            'TAKE_A',
            `take ${a[ai]}`,
            `Compare heads: a=${a[ai]} < b=${b[bi]}, so splice node ${a[ai]} from list A onto the chain and advance A.`,
            {
              round,
              pairIdx: [i, i + 1],
              a: a.slice(),
              b: b.slice(),
              ai,
              bi,
              out: out.slice(),
            },
          );
          ai += 1;
        } else {
          out.push(b[bi]);
          emit(
            'TAKE_B',
            `take ${b[bi]}`,
            `Compare heads: a=${a[ai]} ≥ b=${b[bi]}, so splice node ${b[bi]} from list B onto the chain and advance B. (Ties take B, matching the Go else-branch.)`,
            {
              round,
              pairIdx: [i, i + 1],
              a: a.slice(),
              b: b.slice(),
              ai,
              bi,
              out: out.slice(),
            },
          );
          bi += 1;
        }
      }

      // One list is exhausted — append the rest of the other in one shot.
      if (ai < a.length) {
        const rest = a.slice(ai);
        for (const v of rest) out.push(v);
        emit(
          'TAIL_A',
          `tail ${show(rest)}`,
          `List B is exhausted. The remaining suffix of A (${show(rest)}) is already sorted, so attach it to the chain in one link.`,
          {
            round,
            pairIdx: [i, i + 1],
            a: a.slice(),
            b: b.slice(),
            ai: a.length,
            bi,
            out: out.slice(),
          },
        );
      } else if (bi < b.length) {
        const rest = b.slice(bi);
        for (const v of rest) out.push(v);
        emit(
          'TAIL_B',
          `tail ${show(rest)}`,
          `List A is exhausted. The remaining suffix of B (${show(rest)}) is already sorted, so attach it to the chain in one link.`,
          {
            round,
            pairIdx: [i, i + 1],
            a: a.slice(),
            b: b.slice(),
            ai,
            bi: b.length,
            out: out.slice(),
          },
        );
      }

      merged.push(out.slice());
      emit(
        'MERGED',
        `→ ${show(out)}`,
        `Pair done: lists ${i} and ${i + 1} merged into ${show(out)}. Add it to the next pool.`,
        {
          round,
          pairIdx: [i, i + 1],
          a: a.slice(),
          b: b.slice(),
          out: out.slice(),
        },
        'good',
      );
    }

    pool = merged;
  }

  const answer = pool[0] ?? [];
  emit(
    'DONE',
    show(answer),
    `Only one list left — every input has been folded in. The fully merged sorted list is ${show(answer)}.`,
    { round, result: answer.slice(), out: answer.slice(), done: true },
    'good',
  );
  return frames;
}

function isSorted(xs: number[]): boolean {
  for (let i = 1; i < xs.length; i++) if (xs[i - 1] > xs[i]) return false;
  return true;
}

function View({ frame }: PluginViewProps<MergeKState>) {
  const s = frame.state;
  const merging = s.pairIdx !== null && !s.done;

  const headA = s.a && s.ai !== null && s.ai < s.a.length ? s.a[s.ai] : null;
  const headB = s.b && s.bi !== null && s.bi < s.b.length ? s.b[s.bi] : null;
  const pair =
    s.pairIdx
      ? s.pairIdx[1] >= 0
        ? `${s.pairIdx[0]} & ${s.pairIdx[1]}`
        : `${s.pairIdx[0]} (carry)`
      : '—';

  const rail = (
    <>
      <RailGroup label="progress">
        <RailStat k="round" v={s.round} />
        <RailStat k="pool" v={s.pool.length} />
        <RailStat k="pair" v={pair} />
      </RailGroup>
      {merging && (
        <RailGroup label="heads">
          <RailStat k="a" v={headA ?? '—'} tone={headA !== null ? 'accent' : undefined} />
          <RailStat k="b" v={headB ?? '—'} tone={headB !== null ? 'warn' : undefined} />
        </RailGroup>
      )}
      {merging && (
        <RailStack label="out" items={s.out.map(String)} />
      )}
      {s.done && (
        <RailResult
          label="result"
          value={s.result ? (s.result.length ? s.result.join('→') : '∅') : '∅'}
          tone="good"
        />
      )}
    </>
  );

  if (merging && s.pairIdx) {
    const [, ib] = s.pairIdx;
    const a = s.a ?? [];
    const b = s.b ?? [];
    const aPtr: ArrayPointer[] =
      s.ai !== null && s.ai < a.length
        ? [{ i: s.ai, label: 'a', tone: 'accent', place: 'above' }]
        : [];
    const bPtr: ArrayPointer[] =
      s.bi !== null && s.bi < b.length
        ? [{ i: s.bi, label: 'b', tone: 'warn', place: 'above' }]
        : [];
    const aTone = (i: number) => (s.ai !== null && i < s.ai ? 'dead' : s.ai === i ? 'match' : '');
    const bTone = (i: number) => (s.bi !== null && i < s.bi ? 'dead' : s.bi === i ? 'match' : '');
    return (
      <VizStage rail={rail}>
        <div className={cn('mt-1', vizText.xs, 'text-ink3')}>list A</div>
        <ArrayRow values={a} cellTone={aTone} pointers={aPtr} windowRange={null} />
        {ib >= 0 && (
          <>
            <div className={cn('mt-1', vizText.xs, 'text-ink3')}>list B</div>
            <ArrayRow values={b} cellTone={bTone} pointers={bPtr} windowRange={null} />
          </>
        )}
      </VizStage>
    );
  }

  // Pool view (INIT / ROUND / DONE): show every list as a chain row.
  const lists = s.done && s.result ? [s.result] : s.pool;
  return (
    <VizStage rail={rail}>
      <div className="mt-1 flex flex-col gap-1">
        {lists.length === 0 ? (
          <div className={cn('font-mono', vizText.sm, 'text-ink3')}>∅</div>
        ) : (
          lists.map((l, idx) => (
            <div key={idx} className={cn('flex items-baseline gap-2', vizText.sm)}>
              <span className={cn('text-ink3', vizText.xs)}>L{idx}</span>
              <span className={cn('font-mono', s.done ? 'text-good' : 'text-ink')}>
                {l.length ? l.join('→') : '∅'}
              </span>
            </div>
          ))
        )}
      </div>
    </VizStage>
  );
}

function Inspector({ frame }: InspectorProps<MergeKState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const pair = s.pairIdx ? (s.pairIdx[1] >= 0 ? `${s.pairIdx[0]} & ${s.pairIdx[1]}` : `${s.pairIdx[0]} (carry)`) : '—';
  const headA = s.a && s.ai !== null && s.ai < s.a.length ? s.a[s.ai] : '—';
  const headB = s.b && s.bi !== null && s.bi < s.b.length ? s.b[s.bi] : '—';
  return (
    <VarGrid>
      <InspectorRow k="round" v={s.round} />
      <InspectorRow k="pool size" v={s.pool.length} />
      <InspectorRow k="merging" v={pair} />
      <InspectorRow k="head a" v={headA} />
      <InspectorRow k="head b" v={headB} />
      <InspectorRow k="out len" v={s.out.length} />
      <InspectorRow k="result" v={s.result ? (s.result.length ? s.result.join('→') : '∅') : s.done ? '∅' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-linked-lists-merge-k-sorted-lists';
export const title = 'Merge K sorted lists';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Merge K sorted lists\"?",
    choices: [
      {
        label: "Min-heap merge — fits this problem",
        correct: true
      },
      {
        label: "DFS flatten — different approach"
      },
      {
        label: "Digit carry — different approach"
      },
      {
        label: "Iterative reverse — different approach"
      }
    ],
    explain: "Pairwise-merge the lists until a single list remains"
  },
  {
    id: "init",
    prompt: "At the start of a run (Merge K sorted lists), what strategy is established?",
    choices: [
      {
        label: "Pairwise-merge the lists until a single — described in INIT caption",
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
    explain: "Merge K Sorted Lists: we have  already-sorted lists. Repeatedly pair them up and merge two at a time — pool size roughly halves each round — until a single sorted list remains. Time O(n log k), Space O(k)."
  },
  {
    id: "key-step",
    prompt: "On the \"TAKE_B\" step (take ), what happens?",
    choices: [
      {
        label: "Compare heads: a= ≥ b= — this move caption",
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
    explain: "Compare heads: a= ≥ b=, so splice node  from list B onto the chain and advance B. (Ties take B, matching the Go else-branch.)"
  },
  {
    id: "state",
    prompt: "What does the `round` field track in the visualization state?",
    choices: [
      {
        label: "pass number through the while(len>1) — updated each frame",
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
    explain: "The recorder keeps `round` in sync: pass number through the while(len>1) loop"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Merge K sorted lists\"?",
    choices: [
      {
        label: "O(n log k) time, O(k) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n) time, O(1) space — wrong order of growth"
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n log k). O(k). while len>1: merge i with i+1 into a new slice"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Pair done: lists and merged — final DONE caption",
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
    explain: "Pair done: lists  and  merged into . Add it to the next pool."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'mk1',
      label: '[1,4,5],[1,3,4],[2,6]',
      value: { lists: [[1, 4, 5], [1, 3, 4], [2, 6]] },
    },
    {
      id: 'mk2',
      label: '[2,5],[1,7],[3],[4,6]',
      value: { lists: [[2, 5], [1, 7], [3], [4, 6]] },
    },
  ] satisfies SampleInput<MergeKInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as MergeKState | undefined;
    const r = s?.result ?? null;
    if (!r) return { ok: false, label: 'no result' };
    return { ok: isSorted(r), label: r.length ? r.join('→') : '∅' };
  },
};

import {
  type Frame,
  type InspectorProps,
  type PluginViewProps,
  type SampleInput,
  type QuizQuestion,
} from '../../../../core/types';
import { createPrepRecorder } from '../strictHelpers';
import { ArrayBars, type BarTone } from '../../../../components/board/ArrayBars';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

type Pair = [number, number]; // [attack, defense]

interface WeakInput {
  properties: Pair[];
}

interface WeakState {
  props: Pair[]; // current ordering (bars show attack, label shows defense)
  phase: 'sort' | 'sweep';
  // sort phase
  cmpA: number | null; // index being compared / inserted
  cmpB: number | null; // neighbour it is compared against
  sortedFrom: number; // indices >= this are locked in final order
  // sweep phase
  cur: number | null; // index under the sweep cursor
  maxDef: number; // running max defense seen so far
  weakIdx: boolean[]; // marks which characters were classified weak
  cnt: number;
  done: boolean;
}

function attackOf(p: Pair): number {
  return p[0]!;
}
function defenseOf(p: Pair): number {
  return p[1]!;
}

function record({ properties }: WeakInput): Frame<WeakState>[] {
  const props: Pair[] = properties.map((p) => [p[0]!, p[1]!] as Pair);
  const n = props.length;
  const weakIdx = new Array<boolean>(n).fill(false);
  const { emit, frames } = createPrepRecorder<WeakState>(() => ({
    props: props.map((p) => [p[0]!, p[1]!] as Pair),
    phase: 'sort',
    cmpA: null,
    cmpB: null,
    sortedFrom: n,
    cur: null,
    maxDef: 0,
    weakIdx: weakIdx.slice(),
    cnt: 0,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Weak Characters: a character is weak if some OTHER character has strictly greater attack AND strictly greater defense. We sort by attack descending (ties by defense ascending), then sweep once tracking the largest defense seen so far.`,
    { phase: 'sort', sortedFrom: n },
  );

  // Sort by attack desc, ties by defense asc — implemented as an explicit
  // selection sort so every comparison/placement can be a teaching frame.
  const less = (a: Pair, b: Pair): boolean => {
    if (attackOf(a) === attackOf(b)) return defenseOf(a) < defenseOf(b);
    return attackOf(a) > attackOf(b);
  };

  for (let i = 0; i < n; i++) {
    let best = i;
    emit(
      'SELECT',
      `slot ${i}`,
      `Filling sorted slot ${i}: scan the unsorted tail to find the character that should come first (highest attack; on an attack tie, lowest defense).`,
      { phase: 'sort', cmpA: best, sortedFrom: i },
    );
    for (let j = i + 1; j < n; j++) {
      emit(
        'COMPARE',
        `${j} vs best`,
        `Compare candidate ${j} (atk ${attackOf(props[j]!)}, def ${defenseOf(props[j]!)}) against the current best ${best} (atk ${attackOf(props[best]!)}, def ${defenseOf(props[best]!)}). "Comes first" = higher attack, or equal attack with lower defense.`,
        { phase: 'sort', cmpA: best, cmpB: j, sortedFrom: i },
      );
      if (less(props[j]!, props[best]!)) {
        best = j;
        emit(
          'NEWBEST',
          `best=${j}`,
          `Character ${j} ranks ahead, so it becomes the new best candidate for slot ${i}.`,
          { phase: 'sort', cmpA: best, cmpB: j, sortedFrom: i },
        );
      }
    }
    if (best !== i) {
      const tmp = props[i]!;
      props[i]! = props[best]!;
      props[best]! = tmp;
      emit(
        'SWAP',
        `${i}<->${best}`,
        `Swap the winner into slot ${i}. Now positions 0…${i} are locked in attack-descending order.`,
        { phase: 'sort', cmpA: i, cmpB: best, sortedFrom: i },
      );
    } else {
      emit(
        'PLACE',
        `slot ${i} set`,
        `Character ${i} is already the best remaining, so slot ${i} is locked. Positions 0…${i} are now sorted.`,
        { phase: 'sort', cmpA: i, sortedFrom: i },
      );
    }
  }

  emit(
    'SORTED',
    'sorted',
    `Sorted by attack descending (ties: defense ascending). Now sweep left to right. Because attack only decreases (or stays equal as a tie), any character whose defense is below the max defense already seen has a strictly stronger character to its left — so it is weak.`,
    { phase: 'sweep', sortedFrom: 0, cur: null, maxDef: 0 },
  );

  let maxDef = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    const def = defenseOf(props[i]!);
    if (def < maxDef) {
      weakIdx[i]! = true;
      cnt++;
      emit(
        'WEAK',
        `weak (def ${def} < ${maxDef})`,
        `Character ${i} has defense ${def}, which is below the running maxDef ${maxDef}. The character that set that maxDef sits to the left, so it has both higher (or equal-then-earlier) attack and strictly higher defense — character ${i} is WEAK. Count = ${cnt}.`,
        { phase: 'sweep', sortedFrom: 0, cur: i, maxDef, weakIdx: weakIdx.slice(), cnt },
        'bad',
      );
    } else {
      maxDef = def;
      emit(
        'MAXDEF',
        `maxDef=${maxDef}`,
        `Character ${i} has defense ${def} ≥ maxDef, so it is NOT weak (nothing to its left strictly dominates it). Raise maxDef to ${maxDef}.`,
        { phase: 'sweep', sortedFrom: 0, cur: i, maxDef, weakIdx: weakIdx.slice(), cnt },
        'good',
      );
    }
  }

  emit(
    'DONE',
    `${cnt} weak`,
    `Sweep complete. ${cnt} character${cnt === 1 ? ' is' : 's are'} weak. Time O(n log n) for the sort, Space O(1) extra.`,
    { phase: 'sweep', sortedFrom: 0, cur: null, maxDef, weakIdx: weakIdx.slice(), cnt, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<WeakState>) {
  const s = frame.state;
  const tone = (i: number): BarTone => {
    if (s.phase === 'sweep') {
      if (s.weakIdx[i]!) return 'swap'; // weak — flagged
      if (s.cur === i) return 'pivot'; // cursor
      if (s.cur !== null && i < s.cur) return 'min'; // already kept (set maxDef)
      return 'idle';
    }
    // sort phase
    if (i < s.sortedFrom) return 'sorted';
    if (s.cmpA === i) return 'pivot';
    if (s.cmpB === i) return 'compare';
    return 'idle';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        bar height = <span className="font-mono text-ink">attack</span>, number under bar ={' '}
        <span className="font-mono text-ink">defense</span>
        {s.phase === 'sweep' && (
          <>
            {' · '}maxDef = <span className="font-mono text-ink">{s.maxDef}</span>
            {' · '}weak = <span className="font-mono text-bad">{s.cnt}</span>
          </>
        )}
      </div>
      <ArrayBars values={s.props.map(attackOf)} tone={tone} label={(i) => defenseOf(s.props[i]!)} />
      <div className={cn(vizText.sm, 'text-ink3')}>
        {s.phase === 'sort'
          ? 'sorting by attack ↓ (ties: defense ↑)'
          : 'sweeping left→right · orange = weak, green-ish = sets maxDef'}
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<WeakState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const at = (i: number | null) =>
    i !== null && i >= 0 && i < s.props.length
      ? `(${attackOf(s.props[i]!)}, ${defenseOf(s.props[i]!)})`
      : '—';
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="cursor i" v={s.phase === 'sweep' ? (s.cur ?? '—') : (s.cmpA ?? '—')} />
      <InspectorRow k="char[i]! (atk,def)" v={s.phase === 'sweep' ? at(s.cur) : at(s.cmpA)} />
      <InspectorRow k="maxDef" v={s.phase === 'sweep' ? s.maxDef : '—'} />
      <InspectorRow k="weak count" v={s.cnt} />
    </VarGrid>
  );
}

export const manifestId = 'prep-sorting-the-number-of-weak-characters-in-the-game';
export const title = 'The Number of Weak Characters in the Game';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "The Number of Weak Characters in the Game"?',
    choices: [
      {
        label: 'Sort (attack desc, defense asc) + Max — fits this problem',
        correct: true,
      },
      {
        label: 'Memoized Collatz + Sort — different approach',
      },
      {
        label: 'Greedy Contribution Counting — different approach',
      },
      {
        label: 'Sort Frequencies + Greedy — different approach',
      },
    ],
    explain: 'Sort by attack **descending**, ties by defense **ascending**',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (The Number of Weak Characters in the Game), what strategy is established?',
    choices: [
      {
        label: 'Sort by attack **descending**, ties — described in INIT caption',
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
      'Weak Characters: a character is weak if some OTHER character has strictly greater attack AND strictly greater defense. We sort by attack descending (ties by defense ascending), then sweep once tracking the largest defense seen so far.',
  },
  {
    id: 'key-step',
    prompt: 'On the "SWAP" step (<->), what happens?',
    choices: [
      {
        label: 'Swap the winner into slot . — this move caption',
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
    explain: 'Swap the winner into slot . Now positions 0… are locked in attack-descending order.',
  },
  {
    id: 'state',
    prompt: 'What does the `props` field track in the visualization state?',
    choices: [
      {
        label: 'current ordering (bars show attack — updated each frame',
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
    explain:
      'The recorder keeps `props` in sync: current ordering (bars show attack, label shows defense)',
  },
  {
    id: 'complexity',
    prompt:
      'What are the time and space complexities for "The Number of Weak Characters in the Game"?',
    choices: [
      {
        label: 'O(n log n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n²) time, O(1) space — wrong order of growth',
      },
      {
        label: 'O(1) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
    ],
    explain:
      "O(n log n). O(1). Sort by attack **descending**, ties by defense **ascending**; Sweep left-to-right tracking `maxDef`; if `defense < maxDef`, it's weak",
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'Sweep complete. character weak. Time O(n — final DONE caption',
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
    explain: 'Sweep complete.  character weak. Time O(n log n) for the sort, Space O(1) extra.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'wc1',
      label: '[[1,5],[10,4],[4,3]] → 1',
      value: {
        properties: [
          [1, 5],
          [10, 4],
          [4, 3],
        ] as Pair[],
      },
    },
    {
      id: 'wc2',
      label: '[[2,2],[3,3]] → 1',
      value: {
        properties: [
          [2, 2],
          [3, 3],
        ] as Pair[],
      },
    },
  ] satisfies SampleInput<WeakInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as WeakState | undefined;
    const cnt = s?.cnt ?? 0;
    return { ok: true, label: `${cnt} weak` };
  },
};

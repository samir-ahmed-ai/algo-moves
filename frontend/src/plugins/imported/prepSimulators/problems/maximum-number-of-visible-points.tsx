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

interface VisibleInput {
  points: [number, number][];
  angle: number;
  location: [number, number];
}

interface VisibleState {
  angle: number;
  location: [number, number];
  same: number; // points sitting exactly on the location — always visible
  angles: number[]; // sorted polar angles (degrees), then duplicated +360
  i: number | null; // window left (inclusive)
  j: number | null; // window right (exclusive)
  best: number; // best window width seen (max points inside angle)
  bestRange: [number, number] | null; // [i, j-1] cells that produced best
  answer: number | null; // best + same once finished
  done: boolean;
}

// Faithful port of the Go solution: bucket points equal to the location as
// `same`, convert the rest to atan2 degrees, sort, duplicate the list shifted
// by 360 to handle wrap-around, then slide a window whose span stays <= angle.
function record({ points, angle, location }: VisibleInput): Frame<VisibleState>[] {
  let same = 0;
  const angles: number[] = [];
  for (const p of points) {
    if (p[0]! === location[0]! && p[1]! === location[1]!) {
      same++;
    } else {
      const a = (Math.atan2(p[1]! - location[1]!, p[0]! - location[0]!) * 180) / Math.PI;
      angles.push(a);
    }
  }
  angles.sort((x, y) => x - y);
  const base = angles.length;
  for (let k = 0; k < base; k++) angles.push(angles[k]! + 360);

  const round1 = (x: number) => Math.round(x * 10) / 10;

  const { emit, frames } = createPrepRecorder<VisibleState>(() => ({
    angle,
    location,
    same,
    angles,
    i: null,
    j: null,
    best: 0,
    bestRange: null,
    answer: null,
    done: false,
  }));

  emit(
    'INIT',
    `angle=${angle}, same=${same}`,
    `Maximum Number of Visible Points: standing at [${location[0]!}, ${location[1]!}] we can rotate a wedge of ${angle}°. ${same} point(s) sit exactly on us and are always counted. The other ${base} point(s) become polar angles: ${angles.slice(0, base).map(round1).join('°, ')}°.`,
    { best: 0 },
  );

  if (base === 0) {
    emit(
      'DONE',
      `${same} visible`,
      `There are no points away from our location, so only the ${same} coincident point(s) are visible. Answer = ${same}.`,
      { answer: same, done: true },
      'good',
    );
    return frames;
  }

  emit(
    'DUP',
    'wrap +360',
    `To handle wrap-around, we sort the angles and append a copy of each shifted by +360°. Now any wedge of width ${angle}° maps to a contiguous slice of this doubled, sorted list.`,
    { i: 0, j: 0 },
  );

  const limit = angle;
  let best = 0;
  let bestRange: [number, number] | null = null;
  let j = 0;
  const n = angles.length;

  for (let i = 0; i < n; i++) {
    // Grow j while the window span stays within the viewing angle.
    while (j < n && angles[j]! - angles[i]! <= limit) {
      emit(
        'GROW',
        `j→${j + 1}`,
        `Left edge at cell ${i} (${round1(angles[i]!)}°). Cell ${j} is ${round1(angles[j]!)}°; span ${round1(angles[j]! - angles[i]!)}° ≤ ${angle}°, so it fits — extend the window and advance j to ${j + 1}.`,
        { i, j: j + 1, best, bestRange },
      );
      j++;
    }
    const width = j - i;
    if (width > best) {
      best = width;
      bestRange = [i, j - 1];
      emit(
        'BEST',
        `best=${best}`,
        `Window [${i}, ${j - 1}] holds ${width} point(s) within ${angle}° — a new maximum. best = ${best}.`,
        { i, j, best, bestRange },
        'good',
      );
    } else {
      emit(
        'SHRINK',
        `slide i→${i + 1}`,
        `Window [${i}, ${j - 1}] holds ${width} point(s), not better than best=${best}. Slide the left edge forward to drop cell ${i}.`,
        { i, j, best, bestRange },
      );
    }
  }

  const answer = best + same;
  emit(
    'DONE',
    `${answer} visible`,
    `Best wedge captured ${best} angled point(s); add the ${same} coincident one(s) for ${best} + ${same} = ${answer} visible points.`,
    {
      i: bestRange ? bestRange[0]! : null,
      j: bestRange ? bestRange[1]! + 1 : null,
      best,
      bestRange,
      answer,
      done: true,
    },
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<VisibleState>) {
  const s = frame.state;
  const round1 = (x: number) => Math.round(x * 10) / 10;
  const cells = s.angles.map((a) => `${round1(a)}°`);
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.j !== null) pointers.push({ i: s.j, label: 'j', tone: 'warn', place: 'above' });
  const win: [number, number] | null =
    s.done && s.bestRange
      ? s.bestRange
      : s.i !== null && s.j !== null && s.j > s.i
        ? [s.i, s.j - 1]
        : null;
  const tone = (idx: number) =>
    s.done && s.bestRange && idx >= s.bestRange[0]! && idx <= s.bestRange[1]! ? 'found' : '';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        angle = <span className="font-mono text-ink">{s.angle}°</span>
        {' · '}same = <span className="font-mono text-ink">{s.same}</span>
        {' · '}best = <span className="font-mono text-ink">{s.best}</span>
      </div>
      {s.angles.length > 0 ? (
        <ArrayRow values={cells} cellTone={tone} pointers={pointers} windowRange={win} />
      ) : (
        <div className={cn('mt-1 font-mono text-ink3', vizText.sm)}>no angled points</div>
      )}
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        window width ={' '}
        <span className="text-ink">
          {s.i !== null && s.j !== null ? Math.max(0, s.j - s.i) : 0}
        </span>
      </div>
      {s.answer !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.answer} visible</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<VisibleState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const width = s.i !== null && s.j !== null ? Math.max(0, s.j - s.i) : 0;
  return (
    <VarGrid>
      <InspectorRow k="angle" v={`${s.angle}°`} />
      <InspectorRow k="same (on point)" v={s.same} />
      <InspectorRow k="angles (n)" v={s.angles.length} />
      <InspectorRow k="i (left)" v={s.i ?? '—'} />
      <InspectorRow k="j (right)" v={s.j ?? '—'} />
      <InspectorRow k="window width" v={width} />
      <InspectorRow k="best" v={s.best} />
      <InspectorRow k="answer" v={s.answer !== null ? `${s.answer} visible` : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-math-maximum-number-of-visible-points';
export const title = 'Maximum Number of Visible Points';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Maximum Number of Visible Points"?',
    choices: [
      {
        label: 'Sort + Sliding Window (atan2) — fits this problem',
        correct: true,
      },
      {
        label: 'Binary Exponentiation — different approach',
      },
      {
        label: 'Brian Kernighan bit count — different approach',
      },
      {
        label: 'Sort — different approach',
      },
    ],
    explain: 'See Maximum Number Of Visible Points pattern',
  },
  {
    id: 'init',
    prompt:
      'At the start of a run (Maximum Number of Visible Points), what strategy is established?',
    choices: [
      {
        label: 'See Maximum Number Of Visible Points — described in INIT caption',
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
      'Maximum Number of Visible Points: standing at [, ] we can rotate a wedge of °.  point(s) sit exactly on us and are always counted. The other  point(s) become polar angles: °.',
  },
  {
    id: 'key-step',
    prompt: 'On the "BEST" step (best=), what happens?',
    choices: [
      {
        label: 'Window [, ] holds point(s) within — this move caption',
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
    explain: 'Window [, ] holds  point(s) within ° — a new maximum. best = .',
  },
  {
    id: 'state',
    prompt: 'What does the `same` field track in the visualization state?',
    choices: [
      {
        label: 'points sitting exactly — updated each frame',
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
      'The recorder keeps `same` in sync: points sitting exactly on the location — always visible',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Maximum Number of Visible Points"?',
    choices: [
      {
        label: 'O(n log n) time, O(n) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(2ⁿ) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(max(len)) time, O(max(len)) space — wrong order of growth',
      },
      {
        label: 'O(log exp) time, O(1) space — wrong order of growth',
      },
    ],
    explain: 'O(n log n). O(n). Maximum Number Of Visible Points',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'There are no points away — final DONE caption',
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
      'There are no points away from our location, so only the  coincident point(s) are visible. Answer = .',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    {
      id: 'vp1',
      label: '[[2,1],[2,2],[3,3]] a=90 @ [1,1]',
      value: {
        points: [
          [2, 1],
          [2, 2],
          [3, 3],
        ],
        angle: 90,
        location: [1, 1],
      },
    },
    {
      id: 'vp2',
      label: '[[1,0],[2,1]] a=13 @ [1,1]',
      value: {
        points: [
          [1, 0],
          [2, 1],
        ],
        angle: 13,
        location: [1, 1],
      },
    },
  ] satisfies SampleInput<VisibleInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as VisibleState | undefined;
    return s && s.answer !== null
      ? { ok: true, label: `${s.answer} visible` }
      : { ok: false, label: 'no result' };
  },
};

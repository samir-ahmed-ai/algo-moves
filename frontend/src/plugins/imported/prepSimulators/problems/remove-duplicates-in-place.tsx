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

interface RemoveDupInput {
  nums: number[];
}

interface RemoveDupState {
  nums: number[]; // current array contents (mutated in place by the write pointer)
  n: number; // original length
  w: number; // write pointer: next slot to overwrite with a unique value
  i: number | null; // read pointer scanning the array
  prev: number | null; // index i-1 we compare against (the value just before i)
  kept: boolean | null; // did the last compared value get written (true) or skipped as a duplicate (false)
  length: number | null; // final length of the de-duplicated prefix
  done: boolean;
}

function record({ nums }: RemoveDupInput): Frame<RemoveDupState>[] {
  const n = nums.length;
  const arr = nums.slice();
  const { emit, frames } = createRecorder<RemoveDupState>(() => ({
    nums: arr.slice(),
    n,
    w: 1,
    i: null,
    prev: null,
    kept: null,
    length: null,
    done: false,
  }));

  emit(
    'INIT',
    `n=${n}`,
    `Remove Duplicates: the array is already sorted, so identical values sit next to each other. The write pointer w marks where the next unique value goes; the read pointer i scans forward. Time O(n), Space O(1).`,
    { w: 1, i: null, prev: null },
  );

  if (n === 0) {
    emit(
      'DONE',
      'length 0',
      `The array is empty, so the de-duplicated length is 0.`,
      { length: 0, done: true },
      'good',
    );
    return frames;
  }

  let w = 1;
  emit(
    'BASE',
    'w=1',
    `The first element is always kept, so start w at index 1 — index 0 is already in its final place. We compare every later value to the one immediately before it.`,
    { w, i: null, prev: null },
  );

  for (let i = 1; i < n; i++) {
    emit(
      'COMPARE',
      `nums[${i}] vs nums[${i - 1}]`,
      `Read index ${i}: compare nums[${i}] = ${arr[i]} with the previous value nums[${i - 1}] = ${arr[i - 1]}. If they differ it is a new unique value; if equal it is a duplicate to skip.`,
      { w, i, prev: i - 1, kept: null },
    );

    if (arr[i] !== arr[i - 1]) {
      arr[w] = arr[i];
      emit(
        'WRITE',
        `nums[${w}]=${arr[i]}`,
        `${arr[i]} differs from ${arr[i - 1]}, so it is unique. Write it to nums[${w}] and advance the write pointer to ${w + 1}. The prefix nums[0..${w}] now holds the distinct values so far.`,
        { w, i, prev: i - 1, kept: true },
        'good',
      );
      w++;
    } else {
      emit(
        'SKIP',
        `dup ${arr[i]}`,
        `nums[${i}] = ${arr[i]} equals nums[${i - 1}] = ${arr[i - 1]}, so it is a duplicate. Leave the write pointer at ${w} and move the read pointer on — nothing is written.`,
        { w, i, prev: i - 1, kept: false },
        'bad',
      );
    }
  }

  emit(
    'DONE',
    `length ${w}`,
    `The scan is finished. The write pointer ended at ${w}, so there are ${w} unique values occupying nums[0..${w - 1}]. Return ${w} as the new length.`,
    { w, i: null, prev: null, length: w, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<RemoveDupState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  if (s.prev !== null) pointers.push({ i: s.prev, label: 'i−1', tone: 'warn', place: 'above' });
  if (!s.done) pointers.push({ i: s.w, label: 'w', tone: 'good', place: 'below' });

  const tone = (idx: number) => {
    if (s.done && s.length !== null) return idx < s.length ? 'found' : 'dead';
    if (idx < s.w) return 'in-window'; // unique prefix already settled
    if (s.kept === true && idx === s.w) return 'found'; // freshly written slot
    if (idx === s.i) return 'match';
    if (idx === s.prev) return 'mid';
    return '';
  };

  const len = s.length ?? s.w;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        write pointer w = <span className="font-mono text-ink">{s.w}</span>
        {' · '}unique length so far = <span className="font-mono text-ink">{len}</span>
      </div>
      <ArrayRow
        values={s.nums}
        cellTone={tone}
        pointers={pointers}
        windowRange={s.done && s.length !== null ? [0, Math.max(0, s.length - 1)] : null}
      />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        unique prefix [{s.nums.slice(0, len).join(', ')}]
      </div>
      {s.done && s.length !== null && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ length {s.length}</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<RemoveDupState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="n (orig length)" v={s.n} />
      <InspectorRow k="i (read)" v={s.i ?? '—'} />
      <InspectorRow k="nums[i]" v={s.i !== null ? s.nums[s.i] : '—'} />
      <InspectorRow k="nums[i−1]" v={s.prev !== null ? s.nums[s.prev] : '—'} />
      <InspectorRow k="w (write)" v={s.w} />
      <InspectorRow
        k="last step"
        v={s.kept === true ? 'wrote unique' : s.kept === false ? 'skipped dup' : '—'}
      />
      <InspectorRow k="length" v={s.length ?? '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-remove-duplicates-in-place';
export const title = 'Remove duplicates in place';

const practiceQuiz: QuizQuestion[] = [
  {
    id: 'pattern',
    prompt: 'Which approach fits "Remove duplicates in place"?',
    choices: [
      {
        label: 'Two pointers — fits this problem',
        correct: true,
      },
      {
        label: 'Merge from end — different approach',
      },
      {
        label: 'XOR + math — different approach',
      },
      {
        label: 'Heap + math — different approach',
      },
    ],
    explain: 'Sorted line; w writes only when value differs from the one before',
  },
  {
    id: 'init',
    prompt: 'At the start of a run (Remove duplicates in place), what strategy is established?',
    choices: [
      {
        label: 'Sorted line; w writes — described in INIT caption',
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
      'Remove Duplicates: the array is already sorted, so identical values sit next to each other. The write pointer w marks where the next unique value goes; the read pointer i scans forward. Time O(n), Space O(1).',
  },
  {
    id: 'key-step',
    prompt: 'On the "WRITE" step (nums[]=), what happens?',
    choices: [
      {
        label: 'differs from step — this move caption',
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
      ' differs from , so it is unique. Write it to nums[] and advance the write pointer to . The prefix nums[0..] now holds the distinct values so far.',
  },
  {
    id: 'state',
    prompt: 'What does the `nums` field track in the visualization state?',
    choices: [
      {
        label: 'current array contents (mutated — updated each frame',
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
      'The recorder keeps `nums` in sync: current array contents (mutated in place by the write pointer)',
  },
  {
    id: 'complexity',
    prompt: 'What are the time and space complexities for "Remove duplicates in place"?',
    choices: [
      {
        label: 'O(n) time, O(1) space — standard bounds here',
        correct: true,
      },
      {
        label: 'O(n) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(n³) time, O(n) space — wrong order of growth',
      },
      {
        label: 'O(log n) time, O(n) space — wrong order of growth',
      },
    ],
    explain: 'O(n). O(1). if nums[i]!=nums[i-1]: nums[w]=nums[i], w++',
  },
  {
    id: 'outcome',
    prompt: 'When the run completes, what does the final step convey?',
    choices: [
      {
        label: 'The scan is finished. The write — final DONE caption',
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
      'The scan is finished. The write pointer ended at , so there are  unique values occupying nums[0..]. Return  as the new length.',
  },
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'rd1', label: '[1,1,2,2,3]', value: { nums: [1, 1, 2, 2, 3] } },
    { id: 'rd2', label: '[0,0,1,1,1,2,3]', value: { nums: [0, 0, 1, 1, 1, 2, 3] } },
  ] satisfies SampleInput<RemoveDupInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as RemoveDupState | undefined;
    const len = s?.length ?? 0;
    return { ok: true, label: `length ${len}` };
  },
};

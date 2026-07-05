import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import { ArrayBars, type BarTone } from '../../../../components/board/ArrayBars';
import type { ProblemSimulator } from '../types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface ChunksInput {
  arr: number[];
}

interface ChunksState {
  arr: number[];
  i: number | null; // current index being processed
  val: number | null; // arr[i]
  mx: number | null; // running max for the chunk being built
  stack: number[]; // monotonic stack of chunk maxima
  poppedTop: number | null; // value just popped from the stack (merge step)
  pushedThisStep: boolean; // did we just push mx onto the stack
  done: boolean;
}

function record({ arr }: ChunksInput): Frame<ChunksState>[] {  const stack: number[] = [];

  const { emit, frames } = createRecorder<ChunksState>(() => ({
        arr,
        i: null,
        val: null,
        mx: null,
        stack: stack.slice(),
        poppedTop: null,
        pushedThisStep: false,
        done: false
      }));

  emit(
    'INIT',
    `n=${arr.length}`,
    `Max Chunks To Make Sorted II: split the array into the most chunks so that sorting each chunk independently yields the fully sorted array. We keep a monotonic stack where each entry is the max of one chunk; the final stack size is the answer.`,
    {},
  );

  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    let mx = val;
    emit(
      'SCAN',
      `arr[${i}]=${val}`,
      `Look at arr[${i}] = ${val}. A new chunk can start here only if every existing chunk-max to the left is <= ${val}; otherwise this value belongs inside an earlier chunk, so we must merge. Start the running max at ${val}.`,
      { i, val, mx },
    );

    while (stack.length > 0 && stack[stack.length - 1] > val) {
      const top = stack[stack.length - 1];
      stack.pop();
      if (top > mx) mx = top;
      emit(
        'MERGE',
        `pop ${top}`,
        `The top chunk-max ${top} is greater than ${val}, so ${val} can't begin a new chunk — that chunk must absorb it. Pop ${top} and fold it into the running max: max becomes ${mx}.`,
        { i, val, mx, poppedTop: top },
      );
    }

    stack.push(mx);
    emit(
      'PUSH',
      `push ${mx}`,
      `No remaining chunk-max exceeds ${val}, so the merged chunk closes with max ${mx}. Push ${mx} as this chunk's representative. Stack size (chunk count so far) is ${stack.length}.`,
      { i, val, mx, pushedThisStep: true },
    );
  }

  emit(
    'DONE',
    `${stack.length} chunks`,
    `Every element is placed. The stack holds ${stack.length} chunk-maxima, so the array can be cut into at most ${stack.length} chunk${stack.length === 1 ? '' : 's'} that each sort independently into the final sorted order.`,
    { done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<ChunksState>) {
  const s = frame.state;
  const tone = (i: number): BarTone => {
    if (s.done) return 'sorted';
    if (s.i === i) return 'pivot';
    if (s.i !== null && i > s.i) return 'idle';
    return 'compare';
  };
  const stackStr = s.stack.length ? s.stack.join('  ') : '∅';
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        chunks so far ={' '}
        <span className="font-mono text-ink">{s.stack.length}</span>
        {s.val !== null && !s.done && (
          <>
            {' · '}val ={' '}
            <span className="font-mono text-ink">{s.val}</span>
            {s.mx !== null && (
              <>
                {' · '}running max ={' '}
                <span className="font-mono text-ink">{s.mx}</span>
              </>
            )}
          </>
        )}
      </div>
      <ArrayBars values={s.arr} tone={tone} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        stack [ <span className="text-ink">{stackStr}</span> ]
        {s.poppedTop !== null && <span className="text-bad"> (popped {s.poppedTop})</span>}
      </div>
      {s.done && (
        <div className={cn('mt-1 font-mono text-good', vizText.base)}>→ {s.stack.length} chunks</div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<ChunksState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="arr[i]" v={s.val ?? '—'} />
      <InspectorRow k="running max" v={s.mx ?? '—'} />
      <InspectorRow k="stack top" v={s.stack.length ? s.stack[s.stack.length - 1] : '—'} />
      <InspectorRow k="stack (chunks)" v={`[${s.stack.join(', ')}]`} />
      <InspectorRow k="chunk count" v={s.stack.length} />
    </VarGrid>
  );
}

export const manifestId = 'prep-sorting-max-chunks-to-make-sorted-ii';
export const title = 'Max Chunks To Make Sorted II';

export const simulator: ProblemSimulator = {
  inputs: [
    { id: 'mc1', label: '[5,4,3,2,1]', value: { arr: [5, 4, 3, 2, 1] } },
    { id: 'mc2', label: '[2,1,3,4,4]', value: { arr: [2, 1, 3, 4, 4] } },
  ] satisfies SampleInput<ChunksInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as ChunksState | undefined;
    const n = s ? s.stack.length : 0;
    return { ok: true, label: `${n} chunk${n === 1 ? '' : 's'}` };
  },
};

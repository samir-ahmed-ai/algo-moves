import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { DpSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface CartesianInput {
  lists: string[][];
}

interface CartesianState {
  lists: string[][];
  path: string[]; // chosen element from each list so far
  depth: number | null; // which list index we are choosing from (the active row)
  pick: number | null; // index within lists[depth] currently chosen
  results: string[][];
  done: boolean;
}

function record({ lists }: CartesianInput): Frame<CartesianState>[] {
  const frames: Frame<CartesianState>[] = [];
  const path: string[] = [];
  const results: string[][] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    depth: number | null,
    pick: number | null,
    tone?: 'good',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        lists,
        path: path.slice(),
        depth,
        pick,
        results: results.map((r) => r.slice()),
        done: type === 'DONE',
      },
    });

  const total = lists.reduce((acc, l) => acc * l.length, 1);
  const fmt = (xs: string[]) => `(${xs.join(', ')})`;

  emit(
    'INIT',
    `${lists.length} lists`,
    `Build the Cartesian product of ${lists.length} lists by depth-first search: pick one element from list 0, recurse into list 1, and so on. Choosing one element from each list yields ${lists.map((l) => l.length).join('×')} = ${total} tuples.`,
    0,
    null,
  );

  const backtrack = (i: number) => {
    if (i === lists.length) {
      results.push(path.slice());
      emit(
        'RECORD',
        `+${fmt(path)}`,
        `Picked from every list — record the tuple ${fmt(path)} (${results.length} of ${total} so far).`,
        null,
        null,
        'good',
      );
      return;
    }
    for (let j = 0; j < lists[i].length; j++) {
      const v = lists[i][j];
      path.push(v);
      emit(
        'CHOOSE',
        `list ${i} → ${v}`,
        `From list ${i} = [${lists[i].join(', ')}] choose "${v}" and recurse into list ${i + 1}. Tuple so far is ${fmt(path)}.`,
        i,
        j,
      );
      backtrack(i + 1);
      path.pop();
      emit(
        'BACKTRACK',
        `undo ${v}`,
        `Backtrack out of list ${i}: drop "${v}" so the next branch tries another element. Tuple so far is ${fmt(path)}.`,
        i,
        j,
      );
    }
  };

  backtrack(0);
  emit(
    'DONE',
    `${results.length} tuples`,
    `All branches explored — produced all ${results.length} tuples of the Cartesian product.`,
    null,
    null,
    'good',
  );
  return frames;
}

function View({ frame }: PluginViewProps<CartesianState>) {
  const s = frame.state;
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        choosing one element from each list · tuple ={' '}
        <span className="font-mono text-ink">({s.path.join(', ')})</span>
      </div>
      <div className="flex flex-col gap-2">
        {s.lists.map((list, i) => {
          const isActive = s.depth === i;
          const chosenIdx = i < s.path.length ? list.indexOf(s.path[i]) : -1;
          const pointers: ArrayPointer[] = [];
          if (isActive && s.pick !== null) {
            pointers.push({ i: s.pick, label: 'pick', tone: 'warn', place: 'above' });
          }
          const tone = (j: number) => {
            if (isActive && s.pick === j) return 'mid';
            if (!isActive && i < s.path.length && j === chosenIdx) return 'match';
            return '';
          };
          return (
            <div key={i} className="flex items-center gap-2">
              <span className={cn('w-12 shrink-0 text-ink3', vizText.xs)}>list {i}</span>
              <div className="min-w-0 max-w-full">
                <ArrayRow values={list} cellTone={tone} pointers={pointers} />
              </div>
            </div>
          );
        })}
      </div>
      <div className={cn(vizText.sm, 'text-ink3')}>
        tuples found ({s.results.length})
        <div className="mt-1 flex flex-col gap-0.5">
          {s.results.map((r, i) => (
            <span key={i} className={cn('font-mono text-ink', vizText.sm)}>
              ({r.join(', ')})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Inspector({ frame }: InspectorProps<CartesianState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const total = s.lists.reduce((acc, l) => acc * l.length, 1);
  return (
    <VarGrid>
      <InspectorRow k="lists" v={s.lists.length} />
      <InspectorRow k="active list" v={s.depth ?? '—'} />
      <InspectorRow k="tuple" v={`(${s.path.join(', ')})`} />
      <InspectorRow k="found" v={s.results.length} />
      <InspectorRow k="target (∏ sizes)" v={total} />
    </VarGrid>
  );
}

export const manifestId = 'imp-42-cartesian-product-of-multiple-arrays';
export const title = 'Cartesian Product of Multiple Arrays';

export const simulator: DpSimulator = {
  inputs: [
    { id: 'small', label: '[[1,2],[3,4],[5]]', value: { lists: [['1', '2'], ['3', '4'], ['5']] } },
    { id: 'colors', label: '[[a,b],[x,y]]', value: { lists: [['a', 'b'], ['x', 'y']] } },
  ] satisfies SampleInput<CartesianInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as CartesianState | undefined;
    return { ok: true, label: `${s ? s.results.length : 0} tuples` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput } from '../../../../core/types';
import { ArrayRow, type ArrayPointer } from '../../../../components/ArrayRow';
import type { ProblemSimulator } from '../types';
import { cn } from '../../../../lib/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface Book {
  id: string;
  cost: number;
}

interface BooksInput {
  books: Book[];
}

interface BooksState {
  costs: number[]; // bookList[i].cost — the row of values shown
  ids: string[]; // bookList[i].id — labels under each cell
  i: number | null; // index being processed in the active pass
  phase: 'count' | 'best' | 'collect' | 'done';
  count: [number, number][]; // costCount map entries: [cost, count]
  bestCost: number | null;
  bestCnt: number;
  consideredCost: number | null; // cost being weighed against best (best pass)
  result: string[]; // ids collected so far / final answer
  done: boolean;
}

function record({ books }: BooksInput): Frame<BooksState>[] {
  const costs = books.map((b) => b.cost);
  const ids = books.map((b) => b.id);
  const frames: Frame<BooksState>[] = [];

  const costCount = new Map<number, number>();
  let bestCost = 0;
  let bestCnt = 0;
  const result: string[] = [];

  const emit = (
    type: string,
    note: string,
    caption: string,
    s: Partial<BooksState>,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, tone },
      state: {
        costs,
        ids,
        i: null,
        phase: 'count',
        count: [...costCount.entries()],
        bestCost: null,
        bestCnt,
        consideredCost: null,
        result: [...result],
        done: false,
        ...s,
      },
    });

  emit(
    'INIT',
    `${books.length} books`,
    `Find Most Popular Cost Books: among ${books.length} books, find the cost shared by the most books, then list every book at that cost. Pass 1 tallies a frequency map of costs, pass 2 picks the mode, pass 3 collects matching ids.`,
    { phase: 'count' },
  );

  // Pass 1 — tally cost frequencies.
  for (let i = 0; i < books.length; i++) {
    const c = costs[i];
    costCount.set(c, (costCount.get(c) ?? 0) + 1);
    emit(
      'COUNT',
      `cost ${c} → ${costCount.get(c)}`,
      `Pass 1, index ${i}: book ${ids[i]} costs ${c}. Bump costCount[${c}] to ${costCount.get(c)}.`,
      { phase: 'count', i },
    );
  }

  // Pass 2 — find the cost with the highest count (ties: first reaching the max wins).
  for (const [cost, cnt] of costCount.entries()) {
    const beats = cnt > bestCnt;
    if (beats) {
      bestCnt = cnt;
      bestCost = cost;
    }
    emit(
      'BEST',
      beats ? `new best cost ${cost}` : `keep cost ${bestCost}`,
      beats
        ? `Pass 2: cost ${cost} appears ${cnt}× — that beats the previous best of ${bestCnt === cnt ? 0 : bestCnt}, so the most-popular cost is now ${cost} (count ${cnt}).`
        : `Pass 2: cost ${cost} appears ${cnt}×, which does not beat the current best count ${bestCnt}. Keep best cost ${bestCost}.`,
      { phase: 'best', consideredCost: cost, bestCost, bestCnt },
    );
  }

  emit(
    'PICK',
    `best = ${bestCost} (${bestCnt}×)`,
    `The most popular cost is ${bestCost}, shared by ${bestCnt} book${bestCnt === 1 ? '' : 's'}. Now collect every book at cost ${bestCost}.`,
    { phase: 'collect', bestCost, bestCnt },
  );

  // Pass 3 — collect ids whose cost equals bestCost, in original order.
  for (let i = 0; i < books.length; i++) {
    const hit = costs[i] === bestCost;
    if (hit) result.push(ids[i]);
    emit(
      'COLLECT',
      hit ? `take ${ids[i]}` : `skip ${ids[i]}`,
      hit
        ? `Pass 3, index ${i}: book ${ids[i]} costs ${costs[i]} = best cost ${bestCost}. Add ${ids[i]} to the result.`
        : `Pass 3, index ${i}: book ${ids[i]} costs ${costs[i]} ≠ best cost ${bestCost}. Skip it.`,
      { phase: 'collect', i, bestCost, bestCnt },
      hit ? 'good' : undefined,
    );
  }

  emit(
    'DONE',
    `[${result.join(', ')}]`,
    `Done. The books at the most popular cost ${bestCost} are [${result.join(', ')}].`,
    { phase: 'done', bestCost, bestCnt, done: true },
    'good',
  );

  return frames;
}

function View({ frame }: PluginViewProps<BooksState>) {
  const s = frame.state;
  const pointers: ArrayPointer[] = [];
  if (s.i !== null && (s.phase === 'count' || s.phase === 'collect')) {
    pointers.push({ i: s.i, label: 'i', tone: 'accent', place: 'above' });
  }
  const tone = (i: number) => {
    if (s.phase === 'collect' || s.phase === 'done') {
      if (s.bestCost !== null && s.costs[i] === s.bestCost) {
        return s.phase === 'done' || (s.i !== null && i <= s.i) ? 'found' : 'in-window';
      }
    }
    if (s.phase === 'count' && s.i === i) return 'match';
    return '';
  };
  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        phase = <span className="font-mono text-ink">{s.phase}</span>
        {s.bestCost !== null && (
          <>
            {' · '}best cost ={' '}
            <span className="font-mono text-ink">
              {s.bestCost} ({s.bestCnt}×)
            </span>
          </>
        )}
      </div>
      <ArrayRow values={s.costs} cellTone={tone} pointers={pointers} windowRange={null} label={(i) => s.ids[i]} />
      <div className={cn('mt-1 font-mono', vizText.sm, 'text-ink3')}>
        costCount {'{'}
        {s.count
          .map(([c, n]) => `${c}:${n}${s.consideredCost === c ? '◂' : ''}`)
          .join(', ')}
        {'}'}
      </div>
      {(s.phase === 'collect' || s.phase === 'done') && (
        <div className={cn('mt-1 font-mono', s.done ? 'text-good' : 'text-ink3', vizText.base)}>
          → [{s.result.join(', ')}]
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<BooksState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="phase" v={s.phase} />
      <InspectorRow k="i" v={s.i ?? '—'} />
      <InspectorRow k="cost[i]" v={s.i !== null ? s.costs[s.i] : '—'} />
      <InspectorRow k="distinct costs" v={s.count.length} />
      <InspectorRow k="best cost" v={s.bestCost ?? '—'} />
      <InspectorRow k="best count" v={s.bestCnt} />
      <InspectorRow k="result" v={s.result.length ? `[${s.result.join(', ')}]` : s.done ? 'none' : '…'} />
    </VarGrid>
  );
}

export const manifestId = 'prep-hash-maps-find-most-popular-cost-books';
export const title = 'Find most popular cost books';

export const simulator: ProblemSimulator = {
  inputs: [
    {
      id: 'mpc1',
      label: 'A:10 B:20 C:10 D:30 E:20 F:10',
      value: {
        books: [
          { id: 'A', cost: 10 },
          { id: 'B', cost: 20 },
          { id: 'C', cost: 10 },
          { id: 'D', cost: 30 },
          { id: 'E', cost: 20 },
          { id: 'F', cost: 10 },
        ],
      },
    },
    {
      id: 'mpc2',
      label: 'P:5 Q:5 R:5 S:8',
      value: {
        books: [
          { id: 'P', cost: 5 },
          { id: 'Q', cost: 5 },
          { id: 'R', cost: 5 },
          { id: 'S', cost: 8 },
        ],
      },
    },
  ] satisfies SampleInput<BooksInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as BooksState | undefined;
    const ids = s ? s.result : [];
    return { ok: ids.length > 0, label: `[${ids.join(', ')}]` };
  },
};

import { type Frame, type InspectorProps, type PluginViewProps, type SampleInput, type QuizQuestion } from '../../../../core/types';
import { createRecorder } from '../../../_shared/createRecorder';
import type { ProblemSimulator } from '../types';
import { ArrayRow, type ArrayPointer } from '../../../../components/board/ArrayRow';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../../../_shared/vizKit';

interface StocksInput {
  prices: number[];
}

interface StocksState {
  prices: number[];
  i: number | null; // current day being inspected (the candidate sell day)
  minIdx: number | null; // day that currently holds the cheapest buy price
  minP: number | null; // cheapest price seen so far (Infinity rendered as null)
  profit: number | null; // p - minP for the current day, when computed
  best: number; // best profit found so far
  bestBuyIdx: number | null; // buy day behind the best profit
  bestSellIdx: number | null; // sell day behind the best profit
  done: boolean;
}

function record({ prices }: StocksInput): Frame<StocksState>[] {
  let minP = Number.POSITIVE_INFINITY;
  let minIdx: number | null = null;
  let best = 0;
  let bestBuyIdx: number | null = null;
  let bestSellIdx: number | null = null;

  const { emit, frames } = createRecorder<StocksState>(() => ({
        prices,
        i: null,
        minIdx,
        minP: Number.isFinite(minP) ? minP : null,
        profit: null,
        best,
        bestBuyIdx,
        bestSellIdx,
        done: false
      }));

  emit(
    'INIT',
    'minP=∞ best=0',
    `Max profit: buy once and sell later for the largest gain. Walk the days left to right, always remembering the cheapest buy price behind us (minP) and the best profit so far (best). Time O(n), Space O(1).`,
    {},
  );

  for (let i = 0; i < prices.length; i++) {
    const p = prices[i];

    if (p < minP) {
      minP = p;
      minIdx = i;
      emit(
        'NEW_MIN',
        `minP=${p}`,
        `Day ${i} price ${p} is cheaper than any seen before, so it becomes the new cheapest buy: minP = ${p}. We never sell before this day.`,
        { i, minIdx: i, minP: p, profit: 0 },
      );
    } else {
      emit(
        'KEEP_MIN',
        `minP stays ${minP}`,
        `Day ${i} price ${p} is not cheaper than minP = ${minP}, so the best buy is still day ${minIdx}. Consider selling here.`,
        { i },
      );
    }

    const profit = p - minP;
    if (profit > best) {
      best = profit;
      bestBuyIdx = minIdx;
      bestSellIdx = i;
      emit(
        'NEW_BEST',
        `best=${best}`,
        `Selling on day ${i} for ${p} after buying at minP = ${minP} yields ${p} − ${minP} = ${profit}, beating the old best. best = ${best}.`,
        { i, profit, best, bestBuyIdx: minIdx, bestSellIdx: i },
        'good',
      );
    } else {
      emit(
        'NO_GAIN',
        `profit=${profit}`,
        `Selling on day ${i} gives ${p} − ${minP} = ${profit}, which does not beat best = ${best}. Keep the best as-is.`,
        { i, profit },
      );
    }
  }

  emit(
    'DONE',
    `best=${best}`,
    best > 0
      ? `Every day is checked. The largest gain is buying day ${bestBuyIdx} and selling day ${bestSellIdx} for a profit of ${best}.`
      : `Every day is checked. Prices never rose after a low, so no profitable trade exists — best stays 0.`,
    { done: true },
    best > 0 ? 'good' : 'bad',
  );

  return frames;
}

function View({ frame }: PluginViewProps<StocksState>) {
  const s = frame.state;
  if (s.prices.length === 0) return <VizEmpty />;

  const pointers: ArrayPointer[] = [];
  if (s.i !== null) pointers.push({ i: s.i, label: 'sell?', tone: 'accent', place: 'above' });
  if (s.minIdx !== null) pointers.push({ i: s.minIdx, label: 'minP', tone: 'warn', place: 'below' });
  if (s.done && s.bestBuyIdx !== null && s.bestBuyIdx !== s.minIdx)
    pointers.push({ i: s.bestBuyIdx, label: 'buy', tone: 'good', place: 'below' });
  if (s.bestSellIdx !== null)
    pointers.push({ i: s.bestSellIdx, label: 'sell', tone: 'good', place: 'above' });

  const tone = (i: number) => {
    if (s.bestBuyIdx === i || s.bestSellIdx === i) return 'found';
    if (s.i === i) return 'match';
    if (s.minIdx === i) return 'lo';
    return '';
  };

  return (
    <div className="board-area">
      <div className={cn(vizText.sm, 'text-ink3')}>
        minP = <span className="font-mono text-ink">{s.minP === null ? '∞' : s.minP}</span>
        {' · '}best = <span className="font-mono text-ink">{s.best}</span>
        {s.profit !== null && !s.done && (
          <>
            {' · '}profit here ={' '}
            <span className="font-mono text-ink">{s.profit}</span>
          </>
        )}
      </div>
      <ArrayRow values={s.prices} cellTone={tone} pointers={pointers} windowRange={null} />
      <div className={cn('mt-1', vizText.sm, 'text-ink3')}>index = day, value = price</div>
      {s.done && (
        <div className={cn('mt-1 font-mono', vizText.base, s.best > 0 ? 'text-good' : 'text-ink3')}>
          → max profit = {s.best}
        </div>
      )}
    </div>
  );
}

function Inspector({ frame }: InspectorProps<StocksState>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  return (
    <VarGrid>
      <InspectorRow k="day i" v={s.i ?? '—'} />
      <InspectorRow k="price[i]" v={s.i !== null ? s.prices[s.i] : '—'} />
      <InspectorRow k="minP" v={s.minP === null ? '∞' : s.minP} />
      <InspectorRow k="buy day" v={s.minIdx ?? '—'} />
      <InspectorRow k="profit here" v={s.profit ?? '—'} />
      <InspectorRow k="best" v={s.best} />
      <InspectorRow
        k="best trade"
        v={s.bestBuyIdx !== null && s.bestSellIdx !== null ? `buy ${s.bestBuyIdx} → sell ${s.bestSellIdx}` : '—'}
      />
    </VarGrid>
  );
}

export const manifestId = 'prep-arrays-max-profit-selling-stocks';
export const title = 'Max profit selling stocks';






const practiceQuiz: QuizQuestion[] = [
  {
    id: "pattern",
    prompt: "Which approach fits \"Max profit selling stocks\"?",
    choices: [
      {
        label: "One pass min price — fits this problem",
        correct: true
      },
      {
        label: "Monotonic stack — different approach"
      },
      {
        label: "Reverse segments — different approach"
      },
      {
        label: "Boyer-Moore voting — different approach"
      }
    ],
    explain: "Walk prices remembering the cheapest buy behind you"
  },
  {
    id: "key-step",
    prompt: "On the \"NEW_BEST\" step (best=), what happens?",
    choices: [
      {
        label: "Selling on day for after buying — this move caption",
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
    explain: "Selling on day  for  after buying at minP =  yields  −  = , beating the old best. best = ."
  },
  {
    id: "state",
    prompt: "What does the `i` field track in the visualization state?",
    choices: [
      {
        label: "current day being inspected — updated each frame",
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
    explain: "The recorder keeps `i` in sync: current day being inspected (the candidate sell day)"
  },
  {
    id: "complexity",
    prompt: "What are the time and space complexities for \"Max profit selling stocks\"?",
    choices: [
      {
        label: "O(n) time, O(1) space — standard bounds here",
        correct: true
      },
      {
        label: "O(n log n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(m+n) time, O(n) space — wrong order of growth"
      },
      {
        label: "O(n) time, O(n) space — wrong order of growth"
      }
    ],
    explain: "O(n). O(1). minP=min(minP,p); best=max(best,p-minP)"
  },
  {
    id: "outcome",
    prompt: "When the run completes, what does the final step convey?",
    choices: [
      {
        label: "Selling on day gives − = — final DONE caption",
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
    explain: "Selling on day  gives  −  = , which does not beat best = . Keep the best as-is."
  }
];
export const simulator: ProblemSimulator = {
  practice: { quiz: practiceQuiz },
  inputs: [
    { id: 'mp1', label: '[7,1,5,3,6,4]', value: { prices: [7, 1, 5, 3, 6, 4] } },
    { id: 'mp2', label: '[7,6,4,3,1]', value: { prices: [7, 6, 4, 3, 1] } },
  ] satisfies SampleInput<StocksInput>[],
  record,
  View,
  Inspector,
  verdict: (frames) => {
    const s = frames[frames.length - 1]?.state as StocksState | undefined;
    const best = s?.best ?? 0;
    return { ok: best > 0, label: `max profit ${best}` };
  },
};

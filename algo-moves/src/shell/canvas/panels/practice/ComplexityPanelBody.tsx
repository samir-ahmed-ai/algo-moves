import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { patternsForTags } from '../../../../content';
import { useCanvasStatic } from '../../CanvasContext';
import { Btn, EmptyState, Hint, Option, Section } from '../../nodeui';
import { shuffleSeeded } from '../shared/shuffleSeeded';

/** #57 Complexity quiz: pick the right Big-O (answer derived from the pattern card). */
export function ComplexityPanelBody() {
  const { item } = useCanvasStatic();
  const cards = patternsForTags(item.tags);
  const answer = cards.map((c) => c.complexity.match(/O\([^)]*\)/)?.[0]).find(Boolean) ?? null;
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const POOL = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)', 'O(V+E)'];
  const choices = useMemo(() => {
    if (!answer) return [];
    const distract = shuffleSeeded(POOL.filter((p) => p !== answer), round).slice(0, 3);
    return shuffleSeeded([answer, ...distract], round + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, round]);
  if (!answer) {
    return (
      <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="No complexity data" hint="This problem's tags have no pattern card yet." />
    );
  }
  const answered = picked !== null;
  return (
    <div className="nodrag flex flex-col gap-2">
      <Section title={`Complexity of ${item.title}`} bordered={false}>
        <div className="flex flex-col gap-1.5">
          {choices.map((c) => {
            const state = !answered ? 'idle' : c === answer ? 'correct' : c === picked ? 'wrong' : 'dim';
            return (
              <Option key={c} state={state} disabled={answered} onClick={() => setPicked(c)}>
                {c}
              </Option>
            );
          })}
        </div>
      </Section>
      {answered && (
        <div className="flex flex-col gap-2">
          <Hint>{cards.find((c) => c.complexity.includes(answer))?.complexity}</Hint>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => {
              setPicked(null);
              setRound((r) => r + 1);
            }}
            className="self-start"
          >
            Shuffle ›
          </Btn>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { QuizChoiceLabel } from '../../../components/shared/QuizChoiceLabel';
import { COMPLEXITY_POOL, formatComplexityChoice, buildShuffledChoices } from '@/lib/quiz';
import { patternsForTags } from '../../../content';

import { useCanvasStatic, Btn, EmptyState, Hint, Option, Section } from '@/shell/canvas';
/** #57 Complexity quiz: pick the right Big-O (answer derived from the pattern card). */
export function ComplexityPanelBody() {
  const { item } = useCanvasStatic();
  const cards = patternsForTags(item.tags);
  const answer = cards.map((c) => c.complexity.match(/O\([^)]*\)/)?.[0]).find(Boolean) ?? null;
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const choices = useMemo(() => {
    if (!answer) return [];
    return buildShuffledChoices(answer, COMPLEXITY_POOL, round).map(formatComplexityChoice);
  }, [answer, round]);
  const formattedAnswer = answer ? formatComplexityChoice(answer) : null;
  if (!answer) {
    return (
      <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="No complexity data" hint="This problem's tags have no pattern card yet." />
    );
  }
  const answered = picked !== null;
  const wrong = answered && picked !== formattedAnswer;
  return (
    <div className="nodrag flex flex-col gap-2">
      <Section title={`Complexity of ${item.title}`} bordered={false}>
        <div className="flex flex-col gap-1.5">
          {choices.map((c) => {
            const state = !answered ? 'idle' : c === formattedAnswer ? 'correct' : c === picked ? 'wrong' : 'dim';
            return (
              <Option key={c} state={state} disabled={answered} mono={false} onClick={() => setPicked(c)}>
                <QuizChoiceLabel label={c} size="studio" state={state} />
              </Option>
            );
          })}
        </div>
      </Section>
      {answered && (
        <div className="flex flex-col gap-2">
          <Hint>{cards.find((c) => c.complexity.includes(answer))?.complexity}</Hint>
          {wrong && <p className="text-[length:var(--fs-xs)] text-bad">Start over — pick the right complexity.</p>}
          <Btn
            variant="primary"
            size="sm"
            onClick={() => {
              setPicked(null);
              setRound((r) => r + 1);
            }}
            className="self-start"
          >
            {wrong ? 'Try again ›' : 'Shuffle ›'}
          </Btn>
        </div>
      )}
    </div>
  );
}

import { cn } from '@/lib/utils/cn';
import { isCodeHeadline, isComplexityHeadline, parseQuizChoiceLabel } from '@/lib/quiz';

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim';
type ChoiceSize = 'mobile' | 'studio';

interface QuizChoiceLabelProps {
  readonly label: string;
  readonly size?: ChoiceSize;
  readonly state?: ChoiceState;
}

export function QuizChoiceLabel({ label, size = 'studio', state = 'idle' }: QuizChoiceLabelProps) {
  const { headline, detail } = parseQuizChoiceLabel(label);
  const complexity = isComplexityHeadline(headline);
  const code = !complexity && isCodeHeadline(headline);

  const headlineCls = cn(
    'font-semibold tracking-tight',
    size === 'mobile' ? 'text-[14.5px]' : 'text-[13px]',
    complexity && 'font-mono text-accent',
    code && 'rounded-md bg-panel2/80 px-1.5 py-0.5 font-mono text-[12.5px]',
    !complexity &&
      !code &&
      (state === 'correct' ? 'text-good' : state === 'wrong' ? 'text-bad' : 'text-ink'),
    state === 'dim' && 'opacity-70',
  );

  const detailCls = cn(
    'min-w-0 truncate leading-snug text-ink3',
    size === 'mobile' ? 'text-[13px]' : 'text-[12px]',
    state === 'dim' && 'opacity-70',
  );

  if (!detail) {
    return (
      <span
        title={headline}
        className={cn(
          'quiz-choice-label quiz-choice-label--solo quiz-choice-headline',
          headlineCls,
        )}
      >
        {headline}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'quiz-choice-label inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5',
        size === 'mobile' && 'leading-tight',
      )}
      title={label}
    >
      <span className={cn('quiz-choice-headline', headlineCls)}>{headline}</span>
      <span className="shrink-0 text-ink3/40" aria-hidden>
        —
      </span>
      <span className={cn('quiz-choice-detail', detailCls, size === 'mobile' && 'basis-full')}>
        {detail}
      </span>
    </span>
  );
}

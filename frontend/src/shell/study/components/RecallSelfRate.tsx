import { Rating } from 'ts-fsrs';
import { cn } from '@/lib/utils/cn';

const RATINGS: Array<{ rating: Rating; label: string }> = [
  { rating: Rating.Again, label: 'Again' },
  { rating: Rating.Hard, label: 'Hard' },
  { rating: Rating.Good, label: 'Good' },
  { rating: Rating.Easy, label: 'Easy' },
];

/** Objective suggestion from the line-match score; the learner can override. */
export function suggestedRating(score: number): Rating {
  if (score >= 90) return Rating.Good;
  if (score >= 70) return Rating.Hard;
  return Rating.Again;
}

/**
 * After a from-memory recall, the learner grades their retention. The rating is
 * authoritative (it schedules the next FSRS review); the score-derived suggestion is
 * only a hint. Rendered in the Code Studio footer during the recall phase.
 */
export function RecallSelfRate({
  score,
  rated,
  onRate,
}: {
  score: number;
  rated: boolean;
  onRate: (rating: Rating) => void;
}) {
  if (rated) {
    return (
      <span className="rounded-md bg-goodbg px-2 py-0.5 text-xs font-semibold text-good">
        Review scheduled ✓
      </span>
    );
  }
  const suggested = suggestedRating(score);
  return (
    <span className="flex items-center gap-1">
      <span className="text-xs text-ink3">Rate recall</span>
      {RATINGS.map(({ rating, label }) => (
        <button
          key={label}
          type="button"
          onClick={() => onRate(rating)}
          className={cn(
            'rounded-md border border-edge bg-panel2 px-1.5 py-0.5 text-xs text-ink2 transition-colors hover:text-ink',
            rating === suggested && 'border-accent text-accent',
          )}
          title={rating === suggested ? `Suggested from ${score}% match` : undefined}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

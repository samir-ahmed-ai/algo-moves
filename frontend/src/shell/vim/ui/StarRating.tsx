import { Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function StarRating({
  stars,
  size = 'sm',
  animate = false,
  className,
}: {
  stars: 0 | 1 | 2 | 3;
  size?: 'sm' | 'lg';
  animate?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn('vim-stars', size === 'lg' && 'vim-stars--lg', className)}
      role="img"
      aria-label={`${stars} of 3 stars`}
    >
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={cn(
            'vim-star',
            i < stars && 'vim-star--filled',
            animate && i < stars && 'vim-star--pop',
          )}
          style={animate && i < stars ? { animationDelay: `${0.15 + i * 0.14}s` } : undefined}
          aria-hidden
        />
      ))}
    </span>
  );
}

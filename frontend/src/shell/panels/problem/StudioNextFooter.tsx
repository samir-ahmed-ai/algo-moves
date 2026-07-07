import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Btn } from '@/shell/canvas';

/** Shared problem-column footer: arc rail + Next / Next all controls. */
export function StudioNextFooter({
  arcRail,
  nextLabel,
  onNext,
  nextAllLabel,
  onNextAll,
  className,
}: {
  arcRail?: ReactNode;
  nextLabel?: string | undefined;
  onNext?: (() => void) | undefined;
  nextAllLabel?: string | undefined;
  onNextAll?: (() => void) | undefined;
  className?: string | undefined;
}) {
  const hasNext = !!(nextLabel && onNext);
  const hasNextAll = !!(nextAllLabel && onNextAll);
  if (!arcRail && !hasNext && !hasNextAll) return null;

  return (
    <div
      className={cn(
        'studio-next-footer flex flex-wrap items-center justify-between gap-2',
        className,
      )}
    >
      {arcRail ? (
        <div className="studio-next-footer__rail min-w-0 flex-1">{arcRail}</div>
      ) : (
        <span />
      )}
      {(hasNext || hasNextAll) && (
        <div className="studio-next-footer__actions flex shrink-0 flex-wrap items-center gap-1">
          {hasNextAll && (
            <Btn
              variant="ghost"
              size="xs"
              onClick={onNextAll}
              title="Skip to last view (Shift+Enter)"
            >
              Next all · {nextAllLabel}
              <ArrowRight className="h-3 w-3" />
            </Btn>
          )}
          {hasNext && (
            <Btn variant="primary" size="xs" onClick={onNext} title="Next (Enter)">
              Next · {nextLabel}
              <ArrowRight className="h-3 w-3" />
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

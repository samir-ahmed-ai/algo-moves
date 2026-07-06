import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Btn } from '@/shell/canvas';

/** Shared problem-column footer: optional arc rail + a "Next · {label}" button. */
export function StudioNextFooter({
  arcRail,
  nextLabel,
  onNext,
  className,
}: {
  arcRail?: ReactNode;
  nextLabel?: string;
  onNext?: () => void;
  className?: string;
}) {
  if (!arcRail && !(nextLabel && onNext)) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      {arcRail ? <div className="min-w-0 flex-1">{arcRail}</div> : <span />}
      {nextLabel && onNext && (
        <Btn variant="ghost" size="sm" onClick={onNext} title="Next (Enter)">
          Next · {nextLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Btn>
      )}
    </div>
  );
}

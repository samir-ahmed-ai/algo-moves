import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { RADIUS_CTRL } from '@/shell/canvas/ui/nodeui';

/** Shown when interview features degrade to relay-only (no Postgres backend). */
export function SoloFallbackBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        'pointer-events-auto fixed bottom-3 left-1/2 z-40 flex max-w-md -translate-x-1/2 items-start gap-2 border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-600 shadow-[var(--shadow-md)] backdrop-blur',
        RADIUS_CTRL,
      )}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className={cn('min-w-0 flex-1 leading-snug', chromeText.sm)}>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid h-5 w-5 shrink-0 place-items-center rounded text-amber-700/80 hover:bg-amber-500/15"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

import { cn } from '@/lib/utils/cn';
import { chromeText } from '../chromeUi';

export function PresentationModeHint() {
  return (
    <div
      className={cn(
        'presentation-mode-hint pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-edge bg-[var(--surface-glass)] px-3 py-1.5 text-ink3 shadow-theme-lg ring-1 ring-accent/10 backdrop-blur-xl',
        chromeText.sm,
      )}
      role="status"
    >
      Presentation mode · press{' '}
      <kbd className="rounded-md border border-edge bg-panel2 px-1.5 py-0.5 font-mono text-ink">
        Esc
      </kbd>{' '}
      or{' '}
      <kbd className="rounded-md border border-edge bg-panel2 px-1.5 py-0.5 font-mono text-ink">
        F
      </kbd>{' '}
      to exit
    </div>
  );
}

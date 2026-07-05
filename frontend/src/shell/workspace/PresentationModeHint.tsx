import { cn } from '@/lib/utils/cn';
import { chromeText } from '../chromeUi';

export function PresentationModeHint() {
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-edge bg-panel/90 px-2 py-0.5 text-ink3 shadow backdrop-blur',
        chromeText.sm,
      )}
      role="status"
    >
      Presentation mode - press <span className="font-mono text-ink2">Esc</span> or{' '}
      <span className="font-mono text-ink2">F</span> to exit
    </div>
  );
}

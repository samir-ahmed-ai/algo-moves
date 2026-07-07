import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { VimKbd } from '../vimUi';

import { useVimGame } from '../../canvas/VimGameProvider';
export function MotionsPanelContent() {
  const { level, showHint, toggleHint } = useVimGame();

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-[var(--gap)]">
        {level.allowed.map((motion) => (
          <VimKbd key={motion}>{motion}</VimKbd>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-[var(--gap)] text-[length:var(--fs-tight)] text-ink3">
        <span>
          <VimKbd>Esc</VimKbd> reset · <VimKbd>r</VimKbd> retry
        </span>
        <button
          type="button"
          onClick={toggleHint}
          className={cn(
            'nodrag grid h-6 w-6 place-items-center rounded-md border transition-colors',
            showHint ? 'border-accent bg-accentbg text-accent' : 'border-edge text-ink3 hover:bg-panel2',
          )}
          title="Toggle hint"
          aria-label="Toggle hint"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

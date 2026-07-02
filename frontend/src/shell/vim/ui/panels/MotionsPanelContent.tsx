import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useVimGame } from '../../canvas/VimGameProvider';
import { VimKbd } from '../vimUi';

export function MotionsPanelContent() {
  const { level, showHint, toggleHint } = useVimGame();

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-1">
        {level.allowed.map((motion) => (
          <VimKbd key={motion}>{motion}</VimKbd>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-ink3">
        <span>
          <VimKbd>Esc</VimKbd> reset · <VimKbd>r</VimKbd> retry
        </span>
        <button
          type="button"
          onClick={toggleHint}
          className={cn(
            'nodrag grid h-5 w-5 place-items-center rounded-md border transition-colors',
            showHint ? 'border-accent bg-accentbg text-accent' : 'border-edge text-ink3 hover:bg-panel2',
          )}
          title="Toggle hint"
          aria-label="Toggle hint"
        >
          <HelpCircle className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

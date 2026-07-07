import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { VimKbd } from '../vimUi';
import { MOTION_HELP } from '../../engine';

import { useVimGame } from '../../canvas/VimGameProvider';
export function MotionsPanelContent() {
  const { level, newKeys, showHint, toggleHint } = useVimGame();

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-[var(--gap)]">
        {level.allowed.map((motion) => (
          <VimKbd
            key={motion}
            className={cn(newKeys.includes(motion) && 'vim-kbd--new')}
            title={MOTION_HELP[motion]}
          >
            {motion}
          </VimKbd>
        ))}
      </div>
      {newKeys.length ? (
        <p className="mt-2 text-[length:var(--fs-2xs)] text-accent">
          New: {newKeys.map((k) => `${k} (${MOTION_HELP[k]})`).join(' · ')}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-[var(--gap)] text-base text-ink3">
        <span>
          <VimKbd>Esc</VimKbd> reset · <VimKbd>r</VimKbd> retry
        </span>
        <button
          type="button"
          onClick={toggleHint}
          className={cn(
            'nodrag grid h-8 w-8 place-items-center rounded-md border transition-colors',
            showHint
              ? 'border-accent bg-accentbg text-accent'
              : 'border-edge text-ink3 hover:bg-panel2',
          )}
          title="Toggle hint"
          aria-label="Toggle hint"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

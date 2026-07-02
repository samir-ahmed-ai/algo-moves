import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useVimGame } from '../canvas/VimGameProvider';
import { LevelPanelContent } from './panels/LevelPanelContent';
import { ProgressPanelContent } from './panels/ProgressPanelContent';

export function VimMobileTopBar() {
  const { level } = useVimGame();
  const [open, setOpen] = useState(false);

  return (
    <div className="vim-mobile-topbar shrink-0 border-b border-edge/60 min-[960px]:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink3">Level</p>
          <p className="truncate text-sm font-semibold text-ink">{level.title}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink3 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="max-h-48 overflow-y-auto border-t border-edge/40 px-3 py-2">
          <LevelPanelContent compact />
        </div>
      ) : null}
    </div>
  );
}

export function VimMobileProgressStrip() {
  return (
    <div className="vim-mobile-progress shrink-0 border-t border-edge/60 px-3 py-2 min-[960px]:hidden">
      <ProgressPanelContent compact />
    </div>
  );
}

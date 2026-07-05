import { Contrast, Home, Keyboard, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { VIM_LEVEL_IDS } from './engine';
import { VimLevelSidebar } from './ui/VimLevelSidebar';
import { VimProgressSidebar } from './ui/VimProgressSidebar';
import { VimMobileProgressStrip, VimMobileTopBar } from './ui/VimMobileChrome';

import { VimGameProvider, useVimGame } from './canvas/VimGameProvider';
import { VimDojoCanvas } from './canvas/VimDojoCanvas';
function FloatingChrome() {
  const { theme, setTheme, palette, setPalette, goHome } = useWorkspace();
  const { completedCount } = useVimGame();

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5 min-[960px]:left-[calc(210px+0.75rem)]">
      <button
        type="button"
        title="Home"
        onClick={goHome}
        className="pointer-events-auto grid h-8 w-8 place-items-center rounded-md border border-edge bg-panel/90 text-ink3 shadow-sm backdrop-blur hover:bg-panel2 hover:text-ink"
      >
        <Home className="h-4 w-4" />
      </button>
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-edge bg-panel/90 px-2 py-1 shadow-sm backdrop-blur">
        <span className="grid h-6 w-6 place-items-center rounded bg-accent text-white">
          <Keyboard className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="text-sm font-semibold tracking-tight text-ink">Vim Dojo</span>
          <p className="text-[10px] tabular-nums text-ink3">
            {completedCount}/{VIM_LEVEL_IDS.length}
          </p>
        </div>
      </div>
      <button
        type="button"
        title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="pointer-events-auto grid h-8 w-8 place-items-center rounded-md border border-edge bg-panel/90 text-ink3 shadow-sm backdrop-blur hover:bg-panel2"
      >
        {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        title="Colour-blind palette"
        onClick={() => setPalette(palette === 'cb' ? 'default' : 'cb')}
        className={cn(
          'pointer-events-auto grid h-8 w-8 place-items-center rounded-md border border-edge bg-panel/90 shadow-sm backdrop-blur',
          palette === 'cb' ? 'border-accent text-accent' : 'text-ink3 hover:bg-panel2',
        )}
      >
        <Contrast className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function VimDojoPage() {
  const { density } = useWorkspace();

  return (
    <VimGameProvider>
      <div data-density={density} className="relative flex h-full w-full flex-col overflow-hidden bg-bg min-[960px]:grid min-[960px]:grid-cols-[210px_1fr_210px]">
        <VimLevelSidebar />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col min-[960px]:col-start-2 min-[960px]:row-start-1">
          <VimMobileTopBar />
          <div className="relative min-h-0 flex-1">
            <VimDojoCanvas className="absolute inset-0" />
            <FloatingChrome />
          </div>
          <VimMobileProgressStrip />
        </div>
        <VimProgressSidebar />
      </div>
    </VimGameProvider>
  );
}

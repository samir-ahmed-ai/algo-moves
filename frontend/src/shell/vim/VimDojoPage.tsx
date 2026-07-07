import { Contrast, Home, Keyboard, Moon, Sun } from 'lucide-react';
import { FeatureSelectorPopover, ToolbarSegment } from '@/components/shared';
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
    <div className="pointer-events-none absolute left-[var(--hpad)] top-[var(--pad)] z-10 flex items-center gap-[var(--gap)] min-[960px]:left-[calc(210px+var(--hpad))]">
      <button
        type="button"
        title="Home"
        onClick={goHome}
        className="pointer-events-auto grid h-[var(--row)] w-[var(--row)] place-items-center rounded-md border border-edge bg-panel/90 text-ink3 shadow-sm backdrop-blur hover:bg-panel2 hover:text-ink"
      >
        <Home className="h-3.5 w-3.5" />
      </button>
      <div className="pointer-events-auto flex items-center gap-[var(--gap)] rounded-md border border-edge bg-panel/90 px-[var(--pad)] py-[var(--gap)] shadow-sm backdrop-blur">
        <span className="grid h-6 w-6 place-items-center rounded bg-accent text-white">
          <Keyboard className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="text-sm font-semibold tracking-tight text-ink">Vim Dojo</span>
          <p className="text-[length:var(--fs-2xs)] tabular-nums text-ink3">
            {completedCount}/{VIM_LEVEL_IDS.length}
          </p>
        </div>
      </div>
      <ToolbarSegment className="pointer-events-auto">
        <FeatureSelectorPopover
          groups={[
            {
              options: [
                {
                  id: 'light',
                  icon: <Sun />,
                  title: 'Light',
                  subtitle: 'Light background',
                  detailTitle: 'Light Theme',
                  detailDescription: 'Light background with dark text.',
                },
                {
                  id: 'dark',
                  icon: <Moon />,
                  title: 'Dark',
                  subtitle: 'Dark background',
                  detailTitle: 'Dark Theme',
                  detailDescription: 'Dark background with light text.',
                },
              ],
            },
          ]}
          value={theme}
          onChange={(id) => setTheme(id as 'light' | 'dark')}
          panelTitle="Theme"
          triggerIcon={theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          compact
          align="left"
        />
        <FeatureSelectorPopover
          groups={[
            {
              options: [
                {
                  id: 'default',
                  icon: <Keyboard />,
                  title: 'Default',
                  subtitle: 'Standard colours',
                  detailTitle: 'Default palette',
                  detailDescription: 'Standard accent and state colours.',
                },
                {
                  id: 'cb',
                  icon: <Contrast />,
                  title: 'Colour-blind',
                  subtitle: 'High-contrast palette',
                  detailTitle: 'Colour-blind palette',
                  detailDescription: 'Adjusts accent and state colours for colour-blind accessibility.',
                },
              ],
            },
          ]}
          value={palette}
          onChange={(id) => setPalette(id === 'cb' ? 'cb' : 'default')}
          panelTitle="Palette"
          triggerIcon={<Contrast className="h-3.5 w-3.5" />}
          compact
          align="left"
        />
      </ToolbarSegment>
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

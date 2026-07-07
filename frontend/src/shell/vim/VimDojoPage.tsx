import { Contrast, Home, Keyboard, Moon, Sun, Swords } from 'lucide-react';
import { FeatureSelectorPopover, ToolbarSegment } from '@/components/shared';
import { useWorkspace } from '@/store/workspace';
import { VIM_LEVEL_IDS } from './engine';
import { VimLevelSidebar } from './ui/VimLevelSidebar';
import { VimProgressSidebar } from './ui/VimProgressSidebar';
import { VimMobileProgressStrip, VimMobileTopBar } from './ui/VimMobileChrome';
import { LevelIntroCard } from './ui/LevelIntroCard';
import { LevelCompleteCard } from './ui/LevelCompleteCard';
import { VimTouchPad } from './ui/VimTouchPad';

import { VimGameProvider, useVimGame } from './canvas/VimGameProvider';
import { VimDojoCanvas } from './canvas/VimDojoCanvas';
function FloatingChrome() {
  const { theme, setTheme, palette, setPalette, goHome, enterDojo } = useWorkspace();
  const { completedCount } = useVimGame();

  return (
    <div className="vim-floating-chrome pointer-events-none absolute left-[var(--hpad)] top-[var(--pad)] z-10 flex items-center gap-[var(--gap)] min-[960px]:left-[calc(210px+var(--hpad))]">
      <button
        type="button"
        title="Home"
        aria-label="Return to landing page"
        onClick={goHome}
        className="vim-floating-home pointer-events-auto grid h-[var(--row)] w-[var(--row)] place-items-center rounded-full border border-edge bg-[var(--surface-glass)] text-ink3 shadow-theme-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-panel2 hover:text-ink hover:shadow-theme-md"
      >
        <Home className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Dojo Hub"
        aria-label="Open dojo hub"
        onClick={() => enterDojo()}
        className="vim-floating-home pointer-events-auto grid h-[var(--row)] w-[var(--row)] place-items-center rounded-full border border-edge bg-[var(--surface-glass)] text-ink3 shadow-theme-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-panel2 hover:text-ink hover:shadow-theme-md"
      >
        <Swords className="h-3.5 w-3.5" />
      </button>
      <div className="vim-floating-brand pointer-events-auto flex items-center gap-[var(--gap)] rounded-2xl border border-edge bg-[var(--surface-glass)] px-[var(--pad)] py-[var(--gap)] shadow-theme-sm backdrop-blur-xl">
        <span className="grid h-6 w-6 place-items-center rounded-xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
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
          triggerIcon={
            theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />
          }
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
                  detailDescription:
                    'Adjusts accent and state colours for colour-blind accessibility.',
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
      <div
        data-density={density}
        data-surface="vim-dojo"
        className="vim-dojo-page relative isolate flex h-full w-full flex-col overflow-hidden bg-bg min-[960px]:grid min-[960px]:grid-cols-[210px_1fr_210px]"
        aria-label="Vim Dojo keyboard practice"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_28rem),radial-gradient(circle_at_90%_88%,rgba(248,214,121,0.12),transparent_24rem)]"
        />
        <VimLevelSidebar />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col min-[960px]:col-start-2 min-[960px]:row-start-1">
          <VimMobileTopBar />
          <div className="relative min-h-0 flex-1">
            <VimDojoCanvas className="absolute inset-0" />
            <FloatingChrome />
            <LevelIntroCard />
            <LevelCompleteCard />
          </div>
          <VimTouchPad />
          <VimMobileProgressStrip />
        </div>
        <VimProgressSidebar />
      </div>
    </VimGameProvider>
  );
}

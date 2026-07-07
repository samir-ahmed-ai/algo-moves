import { Contrast, Eye, GraduationCap, Moon, MoreHorizontal, Play, Sun } from 'lucide-react';
import { FeatureSelectorPopover, ToolbarSegment } from '@/components/shared';
import { EXPLORE_GROUPS, PALETTE_GROUPS, THEME_GROUPS } from './landingFeatureGroups';
import { catalog } from '../../content';
import { EagleMark } from '@/shell/EagleMark';
import { AuthButton } from '@/shell/auth';
import { SwipeModeQrPromo } from './SwipeModeQrPromo';
import type { Item } from '../../content/types';

const HEADER_BTN_PRIMARY =
  'inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] shadow-theme-sm transition hover:-translate-y-0.5 hover:shadow-theme-md sm:gap-1.5 sm:px-3 sm:text-sm';

const HEADER_MODE_BTN =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-transparent px-2 py-1.5 text-xs font-medium text-ink2 transition hover:border-edge hover:bg-panel2 hover:text-ink sm:gap-1.5 sm:px-2.5 sm:text-sm';

export function LandingToolbar({
  lastItem,
  firstProblem,
  onOpenItem,
  onStartIn,
  exploreId,
  onExplore,
  theme,
  setTheme,
  palette,
  setPalette,
  onOpenDevice,
}: {
  lastItem: Item | undefined;
  firstProblem: Item | undefined;
  onOpenItem: (id: string) => void;
  onStartIn: (mode: 'play' | 'visualize' | 'learn') => void;
  exploreId: string;
  onExplore: (id: string) => void;
  theme: 'light' | 'dark';
  setTheme: (v: 'light' | 'dark') => void;
  palette: 'default' | 'cb';
  setPalette: (v: 'default' | 'cb') => void;
  onOpenDevice: () => void;
}) {
  const headerModes = [
    { icon: Play, label: 'Play', title: 'Play mode', onClick: () => onStartIn('play') },
    {
      icon: Eye,
      label: 'Visualize',
      title: 'Visualize mode',
      onClick: () => onStartIn('visualize'),
    },
    { icon: GraduationCap, label: 'Learn', title: 'Learn mode', onClick: () => onStartIn('learn') },
  ] as const;

  return (
    <header
      className="sticky top-0 z-30 border-b border-edge bg-[var(--surface-glass)] pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_color-mix(in_srgb,var(--border)_55%,transparent)] backdrop-blur-xl"
      aria-label="Landing navigation"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 sm:px-6">
        <EagleMark className="h-8 w-8 shrink-0 rounded-lg shadow-[var(--shadow-md)] lg:h-9 lg:w-9" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight sm:text-base">
            Algo Moves
          </span>
          <span className="hidden truncate text-[length:var(--fs-2xs)] font-medium uppercase tracking-[0.14em] text-ink3 sm:block">
            visual algorithm studio
          </span>
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => onOpenItem((lastItem ?? firstProblem)?.id ?? catalog.firstItemId)}
            className={HEADER_BTN_PRIMARY}
            title={lastItem ? 'Resume learning' : 'Start learning'}
          >
            <Play className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{lastItem ? 'Resume' : 'Start'}</span>
          </button>
          <ToolbarSegment className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {headerModes.map(({ icon: Icon, label, title, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={HEADER_MODE_BTN}
                title={title}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </ToolbarSegment>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ToolbarSegment>
            <FeatureSelectorPopover
              groups={EXPLORE_GROUPS}
              value={exploreId}
              onChange={onExplore}
              panelTitle="Explore modes"
              panelHint="Swipe, games, Vim, interview canvas, plans"
              triggerIcon={<MoreHorizontal className="h-3.5 w-3.5" />}
              triggerAriaLabel="Explore modes"
              compact
              align="right"
            />
            <FeatureSelectorPopover
              groups={THEME_GROUPS}
              value={theme}
              onChange={(v) => setTheme(v as 'light' | 'dark')}
              panelTitle="Theme"
              triggerIcon={
                theme === 'dark' ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )
              }
              triggerAriaLabel="Theme"
              compact
              align="right"
            />
            <FeatureSelectorPopover
              groups={PALETTE_GROUPS}
              value={palette}
              onChange={(v) => setPalette(v as 'default' | 'cb')}
              panelTitle="Colour palette"
              triggerIcon={<Contrast className="h-3.5 w-3.5" />}
              triggerAriaLabel="Colour palette"
              compact
              align="right"
            />
          </ToolbarSegment>
          <div className="hidden lg:block">
            <SwipeModeQrPromo onOpenDevice={onOpenDevice} />
          </div>
          <AuthButton variant="header" />
        </div>
      </div>
    </header>
  );
}

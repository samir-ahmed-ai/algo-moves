import { useMemo, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Moon, Sun } from 'lucide-react';
import { catalog, browseBreadcrumbForItem, getSiblingItems } from '../../content';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { chromeText } from '../chromeUi';
import { useCanvasStatic, Chip, difficultyTone } from '@/shell/canvas';
import { WorkspaceMenuDropdown } from '@/shell/workspace/WorkspaceMenu';
import { AuthButton } from '@/shell/auth';
import { FeatureSelectorPopover, ToolbarSegment } from '@/components/shared';
import { SURFACE_THEME_GROUPS, SURFACE_VIEW_GROUPS } from './surfaceBarFeatureGroups';
import { usePlan } from '@/shell/plans/PlanContext';

export function IconBtn({
  title,
  active,
  onClick,
  children,
  className,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px]',
        active ? 'bg-accentbg text-accent' : 'text-ink3 hover:bg-panel2 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

function BarDivider() {
  return <div className="mx-0.5 hidden h-4 w-px shrink-0 bg-edge sm:block" aria-hidden />;
}

export interface ProblemSurfaceBarProps {
  onOpenPalette?: () => void;
  onOpenHelp?: () => void;
  badgeIcon?: ReactNode;
  afterTitle?: ReactNode;
  meta?: ReactNode;
}

/** Shared compact header for learn and play problem surfaces. */
export function ProblemSurfaceBar({
  onOpenPalette,
  onOpenHelp,
  badgeIcon,
  afterTitle,
  meta,
}: ProblemSurfaceBarProps) {
  const { item } = useCanvasStatic();
  const isMobile = useIsMobile();
  const { theme, setTheme, present, setPresent, activeItemId, openProblem } = useWorkspace();
  const { isRunning, itemIds, runnerIndex, prevItem, nextItem } = usePlan();
  const browseCrumb = browseBreadcrumbForItem(item.id, catalog);

  const siblings = useMemo(() => getSiblingItems(activeItemId, catalog), [activeItemId]);
  const siblingIdx = siblings.findIndex((i) => i.id === activeItemId);

  const navList = isRunning ? itemIds : siblings.map((i) => i.id);
  const navIdx = isRunning ? runnerIndex : siblingIdx;
  const showNav = navList.length >= 2 && navIdx >= 0 && navIdx < navList.length;

  const goNav = (delta: number) => {
    if (isRunning) {
      if (delta < 0) prevItem();
      else nextItem();
      return;
    }
    const n = (siblingIdx + delta + siblings.length) % siblings.length;
    openProblem(siblings[n].id);
  };

  return (
    <header className="problem-surface-bar nodrag sticky top-0 z-20 flex h-11 shrink-0 items-center gap-1.5 border-b border-edge bg-panel/90 px-2 py-1 shadow-[var(--shadow-sm)] backdrop-blur sm:gap-2 sm:px-2.5">
      {onOpenPalette && onOpenHelp ? (
        <WorkspaceMenuDropdown compact onOpenPalette={onOpenPalette} onOpenHelp={onOpenHelp} />
      ) : null}
      <BarDivider />
      {badgeIcon ? (
        <span className="surface-badge hidden h-7 w-7 shrink-0 place-items-center rounded-md border border-edge bg-panel2 text-accent sm:grid">
          {badgeIcon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 leading-tight">
        <span className={cn('block truncate font-semibold text-ink', chromeText.sm)}>
          {item.title}
        </span>
        {!isMobile && browseCrumb.track && browseCrumb.category && (
          <span className={cn('block truncate text-ink3', chromeText.xs)}>
            {browseCrumb.track.title} › {browseCrumb.category.title}
          </span>
        )}
      </div>
      {afterTitle}
      <BarDivider />
      {item.difficulty && (
        <Chip tone={difficultyTone(item.difficulty)} className="hidden sm:inline-flex">
          {item.difficulty}
        </Chip>
      )}
      {meta}

      {showNav && (
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-edge bg-panel2/70 px-0.5 py-0.5">
          <button
            type="button"
            onClick={() => goNav(-1)}
            title={isRunning ? 'Previous in plan (p)' : 'Previous problem ([)'}
            aria-label={isRunning ? 'Previous in plan' : 'Previous problem'}
            disabled={isRunning && navIdx <= 0}
            className="grid h-6 w-6 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel hover:text-ink disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span
            className={cn('hidden px-1 font-mono tabular-nums text-ink3 sm:inline', chromeText.xs)}
          >
            {navIdx + 1}/{navList.length}
            {isRunning ? ' plan' : ''}
          </span>
          <button
            type="button"
            onClick={() => goNav(1)}
            title={isRunning ? 'Next in plan (n)' : 'Next problem (])'}
            aria-label={isRunning ? 'Next in plan' : 'Next problem'}
            disabled={isRunning && navIdx >= navList.length - 1}
            className="grid h-6 w-6 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel hover:text-ink disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <ToolbarSegment className="hidden md:flex">
        <FeatureSelectorPopover
          groups={SURFACE_THEME_GROUPS}
          value={theme}
          onChange={(v) => setTheme(v as 'light' | 'dark')}
          panelTitle="Theme"
          triggerIcon={
            theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />
          }
          triggerAriaLabel="Theme"
          compact
          align="right"
        />
        <FeatureSelectorPopover
          groups={SURFACE_VIEW_GROUPS}
          value={present ? 'on' : 'off'}
          onChange={(v) => setPresent(v === 'on')}
          panelTitle="View"
          triggerIcon={<Maximize2 className="h-3.5 w-3.5" />}
          triggerAriaLabel="View options"
          compact
          align="right"
        />
      </ToolbarSegment>
      <AuthButton compact />
    </header>
  );
}

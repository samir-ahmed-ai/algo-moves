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
  const browseCrumb = browseBreadcrumbForItem(item.id, catalog);

  const list = useMemo(() => getSiblingItems(activeItemId, catalog), [activeItemId]);
  const idx = list.findIndex((i) => i.id === activeItemId);
  const showNav = list.length >= 2 && idx >= 0;

  const goSibling = (delta: number) => {
    const n = (idx + delta + list.length) % list.length;
    openProblem(list[n].id);
  };

  return (
    <header className="nodrag sticky top-0 z-20 flex h-10 shrink-0 items-center gap-1.5 border-b border-edge bg-panel px-2 py-0.5 shadow-sm sm:gap-2">
      <AuthButton compact />
      {onOpenPalette && onOpenHelp ? (
        <WorkspaceMenuDropdown compact onOpenPalette={onOpenPalette} onOpenHelp={onOpenHelp} />
      ) : null}
      <BarDivider />
      {badgeIcon ? (
        <span className="hidden shrink-0 sm:grid sm:place-items-center">{badgeIcon}</span>
      ) : null}
      <div className="min-w-0 flex-1">
        <span className={cn('block truncate font-semibold text-ink', chromeText.sm)}>{item.title}</span>
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
        <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-panel2/60 px-0.5 py-0.5">
          <button
            type="button"
            onClick={() => goSibling(-1)}
            title="Previous problem ([)"
            aria-label="Previous problem"
            className="grid h-6 w-6 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className={cn('hidden px-1 font-mono tabular-nums text-ink3 sm:inline', chromeText.xs)}>
            {idx + 1}/{list.length}
          </span>
          <button
            type="button"
            onClick={() => goSibling(1)}
            title="Next problem (])"
            aria-label="Next problem"
            className="grid h-6 w-6 place-items-center rounded-full text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <ToolbarSegment className="hidden md:flex">
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
                  detailDescription: 'Dark background with light text — easier on the eyes at night.',
                },
              ],
            },
          ]}
          value={theme}
          onChange={(v) => setTheme(v as 'light' | 'dark')}
          panelTitle="Theme"
          triggerIcon={theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          compact
          align="right"
        />
        <FeatureSelectorPopover
          groups={[
            {
              options: [
                {
                  id: 'off',
                  icon: <Maximize2 />,
                  title: 'Normal',
                  subtitle: 'Full chrome',
                  detailTitle: 'Normal view',
                  detailDescription: 'All UI chrome visible — toolbar, sidebar, and navigation.',
                },
                {
                  id: 'on',
                  icon: <Maximize2 />,
                  title: 'Present',
                  subtitle: 'Focus mode',
                  detailTitle: 'Presentation mode',
                  detailDescription: 'Hides chrome and maximises the problem surface for presenting or focusing.',
                },
              ],
            },
          ]}
          value={present ? 'on' : 'off'}
          onChange={(v) => setPresent(v === 'on')}
          panelTitle="View"
          triggerIcon={<Maximize2 className="h-3.5 w-3.5" />}
          compact
          align="right"
        />
      </ToolbarSegment>
    </header>
  );
}

import { Boxes, Film, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type OverviewView = 'animate' | 'recall';

export function OverviewViewSwitch({
  view,
  onView,
  canToggle,
  boardLabel = 'Animate',
  className,
}: {
  view: OverviewView;
  onView: (view: OverviewView) => void;
  /** Only meaningful when the problem has BOTH an animation and a source to recall. */
  canToggle: boolean;
  /** Label for the board pane tab (e.g. "Design" for static design problems). */
  boardLabel?: string;
  className?: string;
}) {
  if (!canToggle) return null;

  const boardIcon =
    boardLabel === 'Design' ? <Boxes className="h-3 w-3" /> : <Film className="h-3 w-3" />;

  return (
    <div
      className={cn(
        'overview-view-switch flex items-center gap-0.5 rounded-md border border-edge bg-panel2/50 p-0.5',
        className,
      )}
    >
      <TabBtn
        active={view === 'animate'}
        onClick={() => onView('animate')}
        icon={boardIcon}
        title={`${boardLabel} (Alt+1)`}
      >
        {boardLabel}
      </TabBtn>
      <TabBtn
        active={view === 'recall'}
        onClick={() => onView('recall')}
        icon={<Keyboard className="h-3 w-3" />}
        title="Recall (Alt+2)"
      >
        Recall
      </TabBtn>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius)-2px)] border px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'overview-view-tab overview-view-tab--active border-accent/25 bg-accent text-[var(--accent-contrast)] shadow-sm'
          : 'overview-view-tab overview-view-tab--idle border-transparent bg-transparent text-ink2 hover:bg-panel hover:text-ink',
      )}
      aria-pressed={active}
    >
      {icon}
      {children}
    </button>
  );
}

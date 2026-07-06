import { Film, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type OverviewView = 'animate' | 'recall';

export function OverviewViewSwitch({
  view,
  onView,
  hasRecall,
  className,
}: {
  view: OverviewView;
  onView: (view: OverviewView) => void;
  hasRecall: boolean;
  className?: string;
}) {
  if (!hasRecall) return null;

  return (
    <div className={cn('flex items-center gap-0.5 border-t border-edge pt-3', className)}>
      <TabBtn
        active={view === 'animate'}
        onClick={() => onView('animate')}
        icon={<Film className="h-3 w-3" />}
        title="Animate (Alt+1)"
      >
        Animate
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
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-accent text-white shadow-sm' : 'text-ink2 hover:bg-panel2 hover:text-ink',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

import type { ReactNode } from 'react';
import { PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { VizPanelBody } from '../visualize/VizPanelBody';
import { RecallPane } from '@/shell/study/components/RecallPane';
import { TransportBar } from '@/shell/canvas';
import { OverviewViewSwitch, type OverviewView } from './OverviewViewSwitch';
import { useProblemColumnCollapse } from './problemColumnCollapse';
import { StudioContentPanel } from './studioSplitLayout';

export function ProblemStatementColumn({
  className,
  toolbar,
  footer,
  children,
}: {
  className?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const collapse = useProblemColumnCollapse();

  return (
    <aside className={cn('ws-scroll h-full overflow-y-auto bg-panel/40', className)}>
      <div className="flex h-full min-h-0 flex-col p-3 sm:p-4">
        <div className="relative flex min-h-0 flex-1 flex-col rounded-[var(--radius)] border border-edge bg-panel p-3 sm:p-4">
          {collapse && (
            <button
              type="button"
              onClick={collapse.onCollapse}
              title="Collapse problem statement (\)"
              aria-label="Collapse problem statement"
              className="absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
            >
              <PanelLeftClose className="h-3 w-3" />
            </button>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {toolbar}
          {footer}
        </div>
      </div>
    </aside>
  );
}

export function OverviewProblemColumn({
  className,
  view,
  onView,
  hasRecall,
  children,
}: {
  className?: string;
  view: OverviewView;
  onView: (view: OverviewView) => void;
  hasRecall: boolean;
  children: ReactNode;
}) {
  return (
    <ProblemStatementColumn
      className={className}
      toolbar={
        <OverviewViewSwitch view={view} onView={onView} hasRecall={hasRecall} className="mt-3 shrink-0" />
      }
    >
      {children}
    </ProblemStatementColumn>
  );
}

export function OverviewAnimateColumn() {
  return (
    <StudioContentPanel>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <VizPanelBody showTransport={false} />
      </div>
      <aside className="flex shrink-0 justify-center border-t border-edge bg-panel/80 px-3 py-2 backdrop-blur">
        <TransportBar />
      </aside>
    </StudioContentPanel>
  );
}

export function OverviewRecallColumn() {
  return (
    <StudioContentPanel>
      <RecallPane className="min-h-0 flex-1" />
    </StudioContentPanel>
  );
}

export function OverviewContentColumn({ showViz }: { showViz: boolean }) {
  return showViz ? <OverviewAnimateColumn /> : <OverviewRecallColumn />;
}

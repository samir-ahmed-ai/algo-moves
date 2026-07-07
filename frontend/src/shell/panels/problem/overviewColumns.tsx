import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
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
    <aside className={cn('ws-scroll h-full overflow-y-auto bg-panel/25', className)}>
      <div className="flex h-full min-h-0 flex-col p-2">
        <div className="problem-study-card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-edge bg-panel/85 p-[var(--pad)] shadow-[var(--shadow-sm)]">
          {collapse && (
            <button
              type="button"
              onClick={collapse.onCollapse}
              title="Collapse problem statement (\)"
              aria-label="Collapse problem statement"
              className="absolute right-[var(--gap)] top-[var(--gap)] z-10 grid h-[var(--row)] w-[var(--row)] place-items-center rounded-md border border-edge bg-panel2 text-ink3 transition-colors hover:border-accent/40 hover:bg-panel2 hover:text-ink"
            >
              <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
            </button>
          )}
          <div className="ws-scroll min-h-0 flex-1 overflow-y-auto pt-1">{children}</div>
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
        <OverviewViewSwitch
          view={view}
          onView={onView}
          hasRecall={hasRecall}
          className="mt-2 shrink-0"
        />
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
      <aside className="flex shrink-0 justify-center border-t border-edge bg-panel/85 px-2 py-1.5 backdrop-blur">
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

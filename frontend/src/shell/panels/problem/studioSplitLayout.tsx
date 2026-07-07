import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { useIsMobile } from '@/lib/utils/useMediaQuery';
import { ResizablePanels } from '@/components/shared/ResizablePanels';
import {
  OVERVIEW_PROBLEM_CONCEPT_DEFAULT,
  OVERVIEW_PROBLEM_CONCEPT_MAX,
  OVERVIEW_PROBLEM_DEFAULT,
  OVERVIEW_PROBLEM_MAX,
  OVERVIEW_PROBLEM_MIN,
} from '@/lib/editor/resizeSplit';
import { useOverviewLayoutPrefs } from '@/store/user-prefs/overviewLayoutPrefs';
import { conceptOverviewProblemPct, isConceptCourse } from '@/lib/canvas/conceptCourse';
import { useCanvasStatic } from '@/shell/canvas';
import {
  ProblemCollapsedRail,
  ProblemColumnCollapseProvider,
  PROBLEM_COLUMN_RAIL_W,
} from './problemColumnCollapse';

/** Resizable problem | content columns shared by Overview, Quiz, and Play. */
export function StudioSplitLayout({
  problem,
  second,
  footer,
}: {
  problem: ReactNode;
  second: ReactNode;
  /** Arc rail + Next — pinned below the split so it stays visible when the problem column is collapsed. */
  footer?: ReactNode;
}) {
  const isMobile = useIsMobile();
  const { item } = useCanvasStatic();
  const conceptCourse = isConceptCourse(item);
  const [layout, setLayout] = useOverviewLayoutPrefs();
  const problemSplit = conceptCourse
    ? conceptOverviewProblemPct(layout.problemPct)
    : layout.problemPct;
  const collapsed = layout.problemCollapsed;

  useEffect(() => {
    if (isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key !== '\\' || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      setLayout({ problemCollapsed: !collapsed });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed, isMobile, setLayout]);

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {problem}
        {second}
        {footer ? <StudioSplitFooter>{footer}</StudioSplitFooter> : null}
      </div>
    );
  }

  return (
    <ProblemColumnCollapseProvider onCollapse={() => setLayout({ problemCollapsed: true })}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ResizablePanels
          direction="horizontal"
          splitPct={problemSplit}
          onSplitPctChange={(problemPct) => setLayout({ problemPct })}
          minPct={OVERVIEW_PROBLEM_MIN}
          maxPct={conceptCourse ? OVERVIEW_PROBLEM_CONCEPT_MAX : OVERVIEW_PROBLEM_MAX}
          defaultPct={conceptCourse ? OVERVIEW_PROBLEM_CONCEPT_DEFAULT : OVERVIEW_PROBLEM_DEFAULT}
          disabled={collapsed}
          firstWidthPx={collapsed ? PROBLEM_COLUMN_RAIL_W : undefined}
          firstClassName="studio-problem-pane"
          className="min-h-0 flex-1"
          first={
            collapsed ? (
              <ProblemCollapsedRail onExpand={() => setLayout({ problemCollapsed: false })} />
            ) : (
              problem
            )
          }
          second={second}
        />
        {footer ? <StudioSplitFooter>{footer}</StudioSplitFooter> : null}
      </div>
    </ProblemColumnCollapseProvider>
  );
}

function StudioSplitFooter({ children }: { children: ReactNode }) {
  return (
    <div className="studio-split-footer shrink-0 border-t border-edge bg-panel/85 px-2.5 py-1.5 sm:px-3">
      {children}
    </div>
  );
}

export function StudioContentPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <div
          className={cn(
            'studio-content-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-edge bg-panel/85 shadow-[var(--shadow-sm)]',
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

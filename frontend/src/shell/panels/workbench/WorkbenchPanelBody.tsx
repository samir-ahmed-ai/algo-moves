import type { ReactNode } from 'react';
import { Network, Columns2 } from 'lucide-react';
import { ProblemPanelBody } from '../problem/ProblemPanelBody';
import { VizPanelBody } from '../visualize/VizPanelBody';
import { CodeStudioBody, CodeStudioFooter, CodeStudioToolbar } from '@/shell/study/CodeStudio';

import { TransportBar, nodeIconGlyph, useCanvasStatic } from '@/shell/canvas';
import { cn } from '@/lib/utils/cn';
import { isConceptCourse } from '@/lib/canvas/conceptCourse';
function WorkbenchSectionHeader({
  label,
  icon,
  toolbar,
}: {
  label: string;
  icon: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <div className="workbench-section-header nodrag flex shrink-0 items-center gap-2 border-b border-edge/40 px-[var(--node-px,0.75rem)] py-1.5">
      <span className="workbench-section-title flex shrink-0 items-center gap-1.5 text-[length:var(--node-fs-xs,0.75rem)] font-medium text-ink2">
        <span className="workbench-section-icon text-ink3">{icon}</span>
        {label}
      </span>
      {toolbar && (
        <div className="workbench-section-toolbar nodrag flex min-w-0 flex-1 items-center justify-end gap-0.5">
          {toolbar}
        </div>
      )}
    </div>
  );
}

/** Visualize workbench — problem data, visualizer, and code studio in one panel. */
export function WorkbenchPanelBody({
  showBigO,
  onBigOOpenChange,
}: {
  showBigO?: boolean;
  onBigOOpenChange?: (open: boolean) => void;
}) {
  const { item } = useCanvasStatic();
  const conceptCourse = isConceptCourse(item);

  return (
    <div
      className={cn(
        'workbench grid min-h-0 flex-1 overflow-hidden',
        conceptCourse ? 'workbench--concept-course' : 'workbench--standard',
        conceptCourse ? 'grid-cols-[min(440px,42%)_1fr]' : 'grid-cols-[min(380px,34%)_1fr]',
      )}
    >
      <aside className="workbench-problem-rail ws-scroll min-h-0 overflow-y-auto border-r border-edge/50 py-[var(--node-py,0.5625rem)]">
        <ProblemPanelBody />
      </aside>
      <div className="workbench-main flex min-h-0 min-w-0 flex-col overflow-hidden">
        <section className="workbench-section workbench-section--visualizer flex min-h-0 flex-[1.1] flex-col overflow-hidden border-b border-edge/50">
          <WorkbenchSectionHeader label="Visualizer" icon={<Network className={nodeIconGlyph} />} />
          <div className="workbench-section-body workbench-section-body--visualizer nowheel flex min-h-0 flex-1 flex-col overflow-hidden">
            <VizPanelBody
              {...(showBigO !== undefined ? { showBigO } : {})}
              {...(onBigOOpenChange !== undefined ? { onBigOOpenChange } : {})}
              showTransport={false}
            />
          </div>
          <div className="workbench-transport-strip nodrag flex shrink-0 justify-center border-t border-edge/40 bg-panel/80 px-3 py-1.5 backdrop-blur">
            <TransportBar />
          </div>
        </section>
        <section className="workbench-section workbench-section--studio flex min-h-0 flex-[1.4] flex-col overflow-hidden">
          <WorkbenchSectionHeader
            label="Code Studio"
            icon={<Columns2 className={nodeIconGlyph} />}
            toolbar={<CodeStudioToolbar />}
          />
          <div className="workbench-section-body workbench-section-body--studio nowheel flex min-h-0 flex-1 flex-col overflow-hidden px-[var(--node-px,0.75rem)]">
            <CodeStudioBody />
          </div>
          <CodeStudioFooter />
        </section>
      </div>
    </div>
  );
}

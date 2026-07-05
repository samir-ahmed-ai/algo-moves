import type { ReactNode } from 'react';
import { Network, Columns2 } from 'lucide-react';
import { ProblemPanelBody } from '../problem/ProblemPanelBody';
import { VizPanelBody } from '../visualize/VizPanelBody';
import { CodeStudioBody, CodeStudioFooter, CodeStudioToolbar } from '@/shell/study/CodeStudio';
import { TransportBar } from '../../canvas/ui/TransportBarCore';
import { nodeIconGlyph } from '../../canvas/ui/nodeui';

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
    <div className="nodrag flex shrink-0 items-center gap-2 border-b border-edge/40 px-[var(--node-px,0.75rem)] py-1.5">
      <span className="flex shrink-0 items-center gap-1.5 text-[length:var(--node-fs-xs,0.75rem)] font-medium text-ink2">
        <span className="text-ink3">{icon}</span>
        {label}
      </span>
      {toolbar && <div className="nodrag flex min-w-0 flex-1 items-center justify-end gap-0.5">{toolbar}</div>}
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
  return (
    <div className="workbench grid min-h-0 flex-1 grid-cols-[min(380px,34%)_1fr] overflow-hidden">
      <aside className="ws-scroll min-h-0 overflow-y-auto border-r border-edge/50 py-[var(--node-py,0.5625rem)]">
        <ProblemPanelBody />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <section className="flex min-h-0 flex-[1.1] flex-col overflow-hidden border-b border-edge/50">
          <WorkbenchSectionHeader label="Visualizer" icon={<Network className={nodeIconGlyph} />} />
          <div className="nowheel min-h-0 flex-1 overflow-auto">
            <VizPanelBody showBigO={showBigO} onBigOOpenChange={onBigOOpenChange} showTransport={false} />
          </div>
          <div className="nodrag flex shrink-0 justify-center border-t border-edge/40 bg-panel/80 px-3 py-1.5 backdrop-blur">
            <TransportBar />
          </div>
        </section>
        <section className="flex min-h-0 flex-[1.4] flex-col overflow-hidden">
          <WorkbenchSectionHeader
            label="Code Studio"
            icon={<Columns2 className={nodeIconGlyph} />}
            toolbar={<CodeStudioToolbar />}
          />
          <div className="nowheel flex min-h-0 flex-1 flex-col overflow-hidden px-[var(--node-px,0.75rem)]">
            <CodeStudioBody />
          </div>
          <CodeStudioFooter />
        </section>
      </div>
    </div>
  );
}

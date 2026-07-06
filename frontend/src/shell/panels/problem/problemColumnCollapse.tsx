import { createContext, useContext, type ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { SIDEBAR_RAIL_W } from '@/design/sidebarMetrics';

export const PROBLEM_COLUMN_RAIL_W = SIDEBAR_RAIL_W;

const ProblemColumnCollapseContext = createContext<{ onCollapse: () => void } | null>(null);

export function ProblemColumnCollapseProvider({
  onCollapse,
  children,
}: {
  onCollapse: () => void;
  children: ReactNode;
}) {
  return (
    <ProblemColumnCollapseContext.Provider value={{ onCollapse }}>
      {children}
    </ProblemColumnCollapseContext.Provider>
  );
}

export function useProblemColumnCollapse() {
  return useContext(ProblemColumnCollapseContext);
}

/** Narrow rail shown when the problem statement column is collapsed. */
export function ProblemCollapsedRail({ onExpand }: { onExpand: () => void }) {
  return (
    <aside
      className="flex h-full flex-col items-center gap-2 border-r border-edge bg-panel/40 py-2"
      style={{ width: PROBLEM_COLUMN_RAIL_W }}
    >
      <button
        type="button"
        onClick={onExpand}
        title="Show problem statement (\)"
        aria-label="Show problem statement"
        className="grid h-7 w-7 place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink"
      >
        <PanelLeft className="h-3.5 w-3.5" />
      </button>
      <span
        className="select-none text-[10px] font-semibold uppercase tracking-wider text-ink3 [writing-mode:vertical-rl]"
        aria-hidden
      >
        Problem
      </span>
    </aside>
  );
}

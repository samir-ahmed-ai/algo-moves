import { createContext, useContext, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
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
      className="problem-collapsed-rail flex h-full flex-col items-center gap-[var(--gap)] border-r border-edge bg-panel/40 py-[var(--pad)]"
      style={{ width: PROBLEM_COLUMN_RAIL_W }}
    >
      <button
        type="button"
        onClick={onExpand}
        title="Show problem statement (\)"
        aria-label="Show problem statement"
        className="problem-collapsed-rail__button grid h-[var(--row)] w-[var(--row)] place-items-center rounded-md border border-transparent text-ink3 transition-colors hover:border-edge hover:bg-panel2 hover:text-accent"
      >
        <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
      </button>
      <span
        className="problem-collapsed-rail__label select-none text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wider text-ink3 [writing-mode:vertical-rl]"
        aria-hidden
      >
        Problem
      </span>
    </aside>
  );
}

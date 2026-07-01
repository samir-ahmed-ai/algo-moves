import { BarChart3 } from 'lucide-react';
import { ProgressPanelContent } from './panels/ProgressPanelContent';

export function VimProgressSidebar() {
  return (
    <aside className="vim-studio-sidebar vim-studio-sidebar--right hidden min-h-0 min-[960px]:flex">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-edge/40 px-3 py-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel2/80 text-good">
            <BarChart3 className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">Progress</span>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5 text-sm">
          <ProgressPanelContent />
        </div>
      </div>
      <div className="w-[3px] shrink-0 bg-good" aria-hidden />
    </aside>
  );
}
